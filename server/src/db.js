const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const { pool } = require('./pool');
const { categorize } = require('./questionCategories');

// ══════════════════════════════════════════════════════════
// PostgreSQL tabanlı veri katmanı.
// Dışa açılan fonksiyon isimleri/imzaları eski dosya-tabanlı sürümle AYNI
// (artık Promise döndürüyorlar) — route dosyaları sadece await eklendi,
// iş mantığı değişmedi.
// ══════════════════════════════════════════════════════════

async function migrate() {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schema);
}

// ── Eşleme yardımcıları (snake_case DB satırı → camelCase JS nesnesi) ────

function mapUser(row) {
    if (!row) return null;
    return {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        username: row.username,
        passwordHash: row.password_hash,
        role: row.role,
        teacherId: row.teacher_id,
        active: row.active,
        createdAt: row.created_at,
    };
}

function mapExamAttempt(row) {
    if (!row) return null;
    return {
        id: row.id,
        studentId: row.student_id,
        status: row.status,
        totalQuestions: row.total_questions,
        currentIndex: row.current_index,
        startedAt: row.started_at,
        lastActivityAt: row.last_activity_at,
        completedAt: row.completed_at,
        finalScore: row.final_score,
        correctCount: row.correct_count,
        wrongCount: row.wrong_count,
    };
}

function mapAnswer(row) {
    if (!row) return null;
    return {
        id: row.id,
        examAttemptId: row.exam_attempt_id,
        questionIndex: row.question_index,
        questionId: row.question_id,
        studentAnswer: row.student_answer,
        isCorrect: row.is_correct,
        attemptCount: row.attempt_count,
        score: row.score,
        answeredAt: row.answered_at,
        timeSpentSeconds: row.time_spent_seconds,
    };
}

function usernameTakenError() {
    const err = new Error('Bu kullanıcı adı zaten kullanılıyor.');
    err.code = 'USERNAME_TAKEN';
    return err;
}

// ── Kullanıcılar ──────────────────────────────────────────

async function findUserByUsername(username) {
    const { rows } = await pool.query(
        'SELECT * FROM users WHERE username_lower = $1',
        [String(username || '').toLowerCase()]
    );
    return mapUser(rows[0]);
}

async function findUserById(id) {
    if (!id) return null;
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return mapUser(rows[0]);
}

async function createUser({ firstName, lastName, username, password, role, teacherId }) {
    if (await findUserByUsername(username)) throw usernameTakenError();

    const id = uuid();
    const passwordHash = bcrypt.hashSync(password, 10);
    try {
        const { rows } = await pool.query(
            `INSERT INTO users (id, first_name, last_name, username, username_lower, password_hash, role, teacher_id, active, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, now())
             RETURNING *`,
            [id, firstName, lastName, username, username.toLowerCase(), passwordHash, role, teacherId || null]
        );
        return mapUser(rows[0]);
    } catch (err) {
        // 23505 = unique_violation — eşzamanlı iki istek aynı anda aynı username'i
        // oluşturmaya çalışırsa (yukarıdaki ön-kontrolün yakalayamadığı yarış durumu).
        if (err.code === '23505') throw usernameTakenError();
        throw err;
    }
}

async function updateUser(id, patch) {
    const user = await findUserById(id);
    if (!user) return null;

    const sets = [];
    const params = [];
    let i = 1;

    if (patch.username !== undefined) {
        const existing = await findUserByUsername(patch.username);
        if (existing && existing.id !== user.id) throw usernameTakenError();
        sets.push(`username = $${i++}`); params.push(patch.username);
        sets.push(`username_lower = $${i++}`); params.push(patch.username.toLowerCase());
    }
    if (patch.firstName !== undefined) { sets.push(`first_name = $${i++}`); params.push(patch.firstName); }
    if (patch.lastName !== undefined) { sets.push(`last_name = $${i++}`); params.push(patch.lastName); }
    if (patch.active !== undefined) { sets.push(`active = $${i++}`); params.push(patch.active); }
    if (patch.password) { sets.push(`password_hash = $${i++}`); params.push(bcrypt.hashSync(patch.password, 10)); }

    if (!sets.length) return user;

    params.push(id);
    try {
        const { rows } = await pool.query(
            `UPDATE users SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
            params
        );
        return mapUser(rows[0]);
    } catch (err) {
        if (err.code === '23505') throw usernameTakenError();
        throw err;
    }
}

async function seedAdmin() {
    const { rows } = await pool.query("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1");
    if (rows.length) return;
    await createUser({
        firstName: 'Sistem',
        lastName: 'Yöneticisi',
        username: 'admin',
        password: 'admin123',
        role: 'admin',
    });
    // eslint-disable-next-line no-console
    console.log('[seed] Varsayılan yönetici oluşturuldu -> kullanıcı adı: admin, şifre: admin123 (ilk girişten sonra değiştirin)');
}

// ── Sınav denemeleri / cevaplar ───────────────────────────

async function createExamAttemptForStudent(studentId) {
    const { rows } = await pool.query(
        `INSERT INTO exam_attempts (id, student_id, status, total_questions, current_index)
         VALUES ($1, $2, 'Assigned', 150, 0)
         RETURNING *`,
        [uuid(), studentId]
    );
    return mapExamAttempt(rows[0]);
}

async function findExamAttemptByStudentId(studentId) {
    const { rows } = await pool.query('SELECT * FROM exam_attempts WHERE student_id = $1', [studentId]);
    return mapExamAttempt(rows[0]);
}

async function findExamAttemptById(id) {
    const { rows } = await pool.query('SELECT * FROM exam_attempts WHERE id = $1', [id]);
    return mapExamAttempt(rows[0]);
}

/** Sınav denemesinin durumunu kısmen günceller (öğrenci cevap gönderdiğinde kullanılır). */
async function updateExamAttempt(id, patch) {
    const colMap = {
        status: 'status',
        currentIndex: 'current_index',
        startedAt: 'started_at',
        lastActivityAt: 'last_activity_at',
        completedAt: 'completed_at',
        finalScore: 'final_score',
        correctCount: 'correct_count',
        wrongCount: 'wrong_count',
    };
    const sets = [];
    const params = [];
    let i = 1;
    for (const [key, col] of Object.entries(colMap)) {
        if (patch[key] !== undefined) { sets.push(`${col} = $${i++}`); params.push(patch[key]); }
    }
    if (!sets.length) return findExamAttemptById(id);
    params.push(id);
    const { rows } = await pool.query(
        `UPDATE exam_attempts SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
        params
    );
    return mapExamAttempt(rows[0]);
}

async function answersForAttempt(attemptId) {
    const { rows } = await pool.query(
        'SELECT * FROM answers WHERE exam_attempt_id = $1 ORDER BY question_index',
        [attemptId]
    );
    return rows.map(mapAnswer);
}

async function upsertAnswer({ examAttemptId, questionIndex, questionId, studentAnswer, isCorrect, attemptCount, score, timeSpentSeconds }) {
    const { rows } = await pool.query(
        `INSERT INTO answers (id, exam_attempt_id, question_index, question_id, student_answer, is_correct, attempt_count, score, answered_at, time_spent_seconds)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), $9)
         ON CONFLICT (exam_attempt_id, question_index)
         DO UPDATE SET question_id = $4, student_answer = $5, is_correct = $6, attempt_count = $7, score = $8, answered_at = now(), time_spent_seconds = $9
         RETURNING *`,
        [uuid(), examAttemptId, questionIndex, questionId, JSON.stringify(studentAnswer ?? null), isCorrect, attemptCount, score, timeSpentSeconds ?? null]
    );
    return mapAnswer(rows[0]);
}

// ══════════════════════════════════════════════════════════
// SORGU KATMANI – arama / filtre / sıralama / sayfalama
// Tümü tek SQL sorgusuyla (LATERAL join) çalışır; öğrenci/öğretmen başına
// ayrı sorgu atılmaz (N+1 yok), sıralama ve filtreleme veritabanı tarafında yapılır.
// ══════════════════════════════════════════════════════════

function toIntParam(v, def, min, max) {
    const n = parseInt(v, 10);
    if (Number.isNaN(n)) return def;
    return Math.min(Math.max(n, min), max);
}

function toNumberOrNull(v) {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
}

/** Bir öğrencinin sınav özeti (tek sorgu, N+1 yok). */
async function studentExamStats(studentId) {
    const { rows } = await pool.query(
        `SELECT ea.status, ea.total_questions AS total, ea.final_score,
                COUNT(a.id)::int AS answered,
                COUNT(a.id) FILTER (WHERE a.is_correct)::int AS correct
         FROM exam_attempts ea
         LEFT JOIN answers a ON a.exam_attempt_id = ea.id
         WHERE ea.student_id = $1
         GROUP BY ea.id`,
        [studentId]
    );
    const row = rows[0];
    if (!row) {
        return { status: 'Assigned', answered: 0, total: 150, finalScore: null, correctCount: 0, wrongCount: 0, correctRate: null };
    }
    const correct = row.correct;
    const wrong = row.answered - correct;
    return {
        status: row.status,
        answered: row.answered,
        total: row.total,
        finalScore: row.status === 'Completed' ? row.final_score : null,
        correctCount: correct,
        wrongCount: wrong,
        correctRate: row.answered ? Math.round((correct / row.answered) * 100) : null,
    };
}

/** Bir öğretmenin öğrencileri üzerinden toplu istatistik (tek sorgu). */
async function teacherAggregateStats(teacherId) {
    const { rows } = await pool.query(
        `WITH per_student AS (
            SELECT s.id, s.active,
                   COALESCE(ea.status, 'Assigned') AS status,
                   ea.final_score,
                   COUNT(a.id)::int AS answered,
                   COUNT(a.id) FILTER (WHERE a.is_correct)::int AS correct
            FROM users s
            LEFT JOIN exam_attempts ea ON ea.student_id = s.id
            LEFT JOIN answers a ON a.exam_attempt_id = ea.id
            WHERE s.teacher_id = $1 AND s.role = 'student'
            GROUP BY s.id, s.active, ea.status, ea.final_score
         )
         SELECT
            COUNT(*)::int AS student_count,
            COUNT(*) FILTER (WHERE active)::int AS active_student_count,
            COUNT(*) FILTER (WHERE status = 'Completed')::int AS completed_exams,
            COUNT(*) FILTER (WHERE status = 'InProgress')::int AS in_progress_exams,
            COUNT(*) FILTER (WHERE status = 'Assigned')::int AS not_started_exams,
            ROUND(AVG(final_score) FILTER (WHERE status = 'Completed')) AS avg_score,
            COALESCE(SUM(correct), 0)::int AS correct_count,
            COALESCE(SUM(answered) - SUM(correct), 0)::int AS wrong_count
         FROM per_student`,
        [teacherId]
    );
    const row = rows[0];
    const correct = row.correct_count, wrong = row.wrong_count;
    const answered = correct + wrong;
    return {
        studentCount: row.student_count,
        activeStudentCount: row.active_student_count,
        completedExams: row.completed_exams,
        inProgressExams: row.in_progress_exams,
        notStartedExams: row.not_started_exams,
        avgScore: row.avg_score !== null ? Math.round(Number(row.avg_score)) : null,
        correctCount: correct,
        wrongCount: wrong,
        correctRate: answered ? Math.round((correct / answered) * 100) : null,
    };
}

const STUDENT_SORT_COLUMNS = {
    name: `lower(u.first_name || ' ' || u.last_name)`,
    username: 'lower(u.username)',
    score: 'stats.final_score',
    progress: 'stats.answered',
    correctRate: 'stats.correct_rate',
    createdAt: 'u.created_at',
};

/**
 * Yönetici (ve kendi öğrencileriyle sınırlı öğretmen) öğrenci listesi:
 * arama + öğretmen/durum/aktiflik/puan-başarı aralığı filtresi + sıralama + sayfalama.
 * Döndürülen her öğe { user, stats, teacherName } — çağıran route ekstra sorgu atmaz.
 */
async function getStudentsPage({ search, teacherId, status, active, scoreMin, scoreMax, correctRateMin, correctRateMax, completedFrom, completedTo, sortBy, sortDirection, page, pageSize }) {
    const params = [];
    const where = [`u.role = 'student'`];
    const addParam = v => { params.push(v); return `$${params.length}`; };

    if (teacherId) where.push(`u.teacher_id = ${addParam(teacherId)}`);
    if (search) {
        const p = addParam(`%${String(search).toLowerCase()}%`);
        where.push(`(lower(u.first_name || ' ' || u.last_name) LIKE ${p} OR lower(u.username) LIKE ${p})`);
    }
    if (active === 'active') where.push('u.active = true');
    else if (active === 'passive') where.push('u.active = false');
    if (status) where.push(`stats.status = ${addParam(status)}`);

    const scoreLo = toNumberOrNull(scoreMin), scoreHi = toNumberOrNull(scoreMax);
    const rateLo = toNumberOrNull(correctRateMin), rateHi = toNumberOrNull(correctRateMax);
    if (scoreLo !== null) where.push(`stats.final_score >= ${addParam(scoreLo)}`);
    if (scoreHi !== null) where.push(`stats.final_score <= ${addParam(scoreHi)}`);
    if (rateLo !== null) where.push(`stats.correct_rate >= ${addParam(rateLo)}`);
    if (rateHi !== null) where.push(`stats.correct_rate <= ${addParam(rateHi)}`);
    if (completedFrom) where.push(`ea.completed_at >= ${addParam(completedFrom)}::timestamptz`);
    if (completedTo) where.push(`ea.completed_at <= ${addParam(completedTo)}::timestamptz`);

    const whereSql = `WHERE ${where.join(' AND ')}`;
    const joins = `
        FROM users u
        LEFT JOIN exam_attempts ea ON ea.student_id = u.id
        LEFT JOIN LATERAL (
            SELECT COUNT(*)::int AS answered, COUNT(*) FILTER (WHERE is_correct)::int AS correct,
                   COALESCE(SUM(time_spent_seconds), 0)::int AS total_time,
                   COUNT(time_spent_seconds)::int AS timed_count
            FROM answers WHERE exam_attempt_id = ea.id
        ) ans ON true
        CROSS JOIN LATERAL (
            SELECT
                COALESCE(ea.status, 'Assigned') AS status,
                COALESCE(ea.total_questions, 150) AS total,
                COALESCE(ans.answered, 0) AS answered,
                COALESCE(ans.correct, 0) AS correct,
                (COALESCE(ans.answered, 0) - COALESCE(ans.correct, 0)) AS wrong,
                CASE WHEN ea.status = 'Completed' THEN ea.final_score ELSE NULL END AS final_score,
                CASE WHEN COALESCE(ans.answered, 0) > 0
                     THEN ROUND(100.0 * COALESCE(ans.correct, 0) / ans.answered)
                     ELSE NULL END AS correct_rate,
                CASE WHEN COALESCE(ans.timed_count, 0) > 0 THEN ans.total_time ELSE NULL END AS total_time_seconds
        ) stats
    `;

    const { rows: countRows } = await pool.query(`SELECT COUNT(*)::int AS total ${joins} ${whereSql}`, params);
    const total = countRows[0].total;

    const size = toIntParam(pageSize, 25, 1, 100);
    const pageNum = toIntParam(page, 1, 1, Number.MAX_SAFE_INTEGER);
    const totalPages = Math.max(Math.ceil(total / size), 1);
    const offset = (pageNum - 1) * size;

    const orderCol = STUDENT_SORT_COLUMNS[sortBy] || STUDENT_SORT_COLUMNS.name;
    const dir = sortDirection === 'desc' ? 'DESC' : 'ASC';

    const dataParams = [...params, size, offset];
    const { rows } = await pool.query(
        `SELECT u.*, stats.status, stats.total, stats.answered, stats.correct, stats.wrong, stats.final_score, stats.correct_rate,
                stats.total_time_seconds,
                t.first_name AS teacher_first_name, t.last_name AS teacher_last_name
         ${joins}
         LEFT JOIN users t ON t.id = u.teacher_id
         ${whereSql}
         ORDER BY ${orderCol} ${dir} NULLS LAST
         LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
        dataParams
    );

    const items = rows.map(row => ({
        user: mapUser(row),
        stats: {
            status: row.status,
            answered: row.answered,
            total: row.total,
            finalScore: row.final_score,
            correctCount: row.correct,
            wrongCount: row.wrong,
            correctRate: row.correct_rate !== null ? Number(row.correct_rate) : null,
            totalTimeSeconds: row.total_time_seconds,
        },
        teacherName: row.teacher_first_name ? `${row.teacher_first_name} ${row.teacher_last_name}` : null,
    }));

    return { items, total, page: pageNum, pageSize: size, totalPages };
}

const TEACHER_SORT_COLUMNS = {
    name: `lower(u.first_name || ' ' || u.last_name)`,
    username: 'lower(u.username)',
    studentCount: 'agg.student_count',
    activeStudentCount: 'agg.active_student_count',
    avgScore: 'agg.avg_score',
    completedExams: 'agg.completed_exams',
    createdAt: 'u.created_at',
};

/** Yönetici öğretmen listesi: arama + aktif/pasif filtre + sıralama + sayfalama. */
async function getTeachersPage({ search, status, sortBy, sortDirection, page, pageSize }) {
    const params = [];
    const where = [`u.role = 'teacher'`];
    const addParam = v => { params.push(v); return `$${params.length}`; };

    if (status === 'active') where.push('u.active = true');
    else if (status === 'passive') where.push('u.active = false');
    if (search) {
        const p = addParam(`%${String(search).toLowerCase()}%`);
        where.push(`(lower(u.first_name || ' ' || u.last_name) LIKE ${p} OR lower(u.username) LIKE ${p})`);
    }
    const whereSql = `WHERE ${where.join(' AND ')}`;

    const joins = `
        FROM users u
        LEFT JOIN LATERAL (
            SELECT
                COUNT(*)::int AS student_count,
                COUNT(*) FILTER (WHERE s.active)::int AS active_student_count,
                COUNT(*) FILTER (WHERE st.status = 'Completed')::int AS completed_exams,
                COUNT(*) FILTER (WHERE st.status = 'InProgress')::int AS in_progress_exams,
                COUNT(*) FILTER (WHERE st.status = 'Assigned')::int AS not_started_exams,
                ROUND(AVG(st.final_score) FILTER (WHERE st.status = 'Completed')) AS avg_score,
                COALESCE(SUM(st.correct), 0)::int AS correct_count,
                COALESCE(SUM(st.answered) - SUM(st.correct), 0)::int AS wrong_count
            FROM users s
            LEFT JOIN exam_attempts ea ON ea.student_id = s.id
            LEFT JOIN LATERAL (
                SELECT COUNT(*)::int AS answered, COUNT(*) FILTER (WHERE is_correct)::int AS correct
                FROM answers WHERE exam_attempt_id = ea.id
            ) ans ON true
            CROSS JOIN LATERAL (
                SELECT COALESCE(ea.status, 'Assigned') AS status, ea.final_score,
                       COALESCE(ans.answered, 0) AS answered, COALESCE(ans.correct, 0) AS correct
            ) st
            WHERE s.teacher_id = u.id AND s.role = 'student'
        ) agg ON true
    `;

    const { rows: countRows } = await pool.query(`SELECT COUNT(*)::int AS total ${joins} ${whereSql}`, params);
    const total = countRows[0].total;

    const size = toIntParam(pageSize, 25, 1, 100);
    const pageNum = toIntParam(page, 1, 1, Number.MAX_SAFE_INTEGER);
    const totalPages = Math.max(Math.ceil(total / size), 1);
    const offset = (pageNum - 1) * size;

    const orderCol = TEACHER_SORT_COLUMNS[sortBy] || TEACHER_SORT_COLUMNS.name;
    const dir = sortDirection === 'desc' ? 'DESC' : 'ASC';

    const dataParams = [...params, size, offset];
    const { rows } = await pool.query(
        `SELECT u.*, agg.student_count, agg.active_student_count, agg.completed_exams, agg.in_progress_exams,
                agg.not_started_exams, agg.avg_score, agg.correct_count, agg.wrong_count
         ${joins}
         ${whereSql}
         ORDER BY ${orderCol} ${dir} NULLS LAST
         LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
        dataParams
    );

    const items = rows.map(row => {
        const correct = row.correct_count, wrong = row.wrong_count;
        const answered = correct + wrong;
        return {
            user: mapUser(row),
            stats: {
                studentCount: row.student_count,
                activeStudentCount: row.active_student_count,
                completedExams: row.completed_exams,
                inProgressExams: row.in_progress_exams,
                notStartedExams: row.not_started_exams,
                avgScore: row.avg_score !== null ? Math.round(Number(row.avg_score)) : null,
                correctCount: correct,
                wrongCount: wrong,
                correctRate: answered ? Math.round((correct / answered) * 100) : null,
            },
        };
    });

    return { items, total, page: pageNum, pageSize: size, totalPages };
}

/**
 * Genel bakış özeti. `teacherId` verilirse yalnızca o öğretmenin öğrencileriyle
 * sınırlanır (öğretmen paneli); null ise sistem geneli (admin paneli).
 */
async function getOverviewStats(teacherId = null) {
    let teacherCount = null;
    let studentCount;
    let activeTeacherCount = null;
    let activeStudentCount;
    if (!teacherId) {
        const { rows: countRows } = await pool.query(
            `SELECT
                (SELECT COUNT(*) FROM users WHERE role = 'teacher')::int AS teacher_count,
                (SELECT COUNT(*) FROM users WHERE role = 'student')::int AS student_count,
                (SELECT COUNT(*) FROM users WHERE role = 'teacher' AND active)::int AS active_teacher_count,
                (SELECT COUNT(*) FROM users WHERE role = 'student' AND active)::int AS active_student_count`
        );
        teacherCount = countRows[0].teacher_count;
        studentCount = countRows[0].student_count;
        activeTeacherCount = countRows[0].active_teacher_count;
        activeStudentCount = countRows[0].active_student_count;
    } else {
        const { rows } = await pool.query(
            `SELECT COUNT(*)::int AS student_count,
                    COUNT(*) FILTER (WHERE active)::int AS active_student_count
             FROM users WHERE role = 'student' AND teacher_id = $1`,
            [teacherId]
        );
        studentCount = rows[0].student_count;
        activeStudentCount = rows[0].active_student_count;
    }

    const examParams = teacherId ? [teacherId] : [];
    const examTeacherFilter = teacherId ? 'AND s.teacher_id = $1' : '';
    const { rows: examRows } = await pool.query(
        `SELECT
            COUNT(*) FILTER (WHERE ea.status = 'Completed')::int AS completed,
            COUNT(*) FILTER (WHERE ea.status = 'InProgress')::int AS in_progress,
            COUNT(*) FILTER (WHERE ea.status = 'Assigned')::int AS not_started,
            ROUND(AVG(ea.final_score) FILTER (WHERE ea.status = 'Completed')) AS avg_score,
            COALESCE(SUM(ea.correct_count) FILTER (WHERE ea.status = 'Completed'), 0)::int AS total_correct,
            COALESCE(SUM(ea.wrong_count) FILTER (WHERE ea.status = 'Completed'), 0)::int AS total_wrong,
            COUNT(*) FILTER (WHERE ea.status = 'Completed' AND ea.final_score BETWEEN 0 AND 25)::int AS range0_25,
            COUNT(*) FILTER (WHERE ea.status = 'Completed' AND ea.final_score BETWEEN 26 AND 50)::int AS range26_50,
            COUNT(*) FILTER (WHERE ea.status = 'Completed' AND ea.final_score BETWEEN 51 AND 75)::int AS range51_75,
            COUNT(*) FILTER (WHERE ea.status = 'Completed' AND ea.final_score BETWEEN 76 AND 100)::int AS range76_100
         FROM exam_attempts ea
         JOIN users s ON s.id = ea.student_id
         WHERE 1=1 ${examTeacherFilter}`,
        examParams
    );
    const e = examRows[0];

    let teachersWithNoCompletions = null;
    if (!teacherId) {
        const { rows: noCompRows } = await pool.query(
            `SELECT COUNT(*)::int AS cnt
             FROM users t
             WHERE t.role = 'teacher'
               AND EXISTS (SELECT 1 FROM users s WHERE s.teacher_id = t.id)
               AND NOT EXISTS (
                   SELECT 1 FROM users s
                   JOIN exam_attempts ea ON ea.student_id = s.id
                   WHERE s.teacher_id = t.id AND ea.status = 'Completed'
               )`
        );
        teachersWithNoCompletions = noCompRows[0].cnt;
    }

    const { rows: activityRows } = await pool.query(
        `SELECT s.id AS student_id, s.first_name, s.last_name, ea.completed_at, ea.final_score
         FROM exam_attempts ea
         JOIN users s ON s.id = ea.student_id
         WHERE ea.status = 'Completed' ${examTeacherFilter}
         ORDER BY ea.completed_at DESC
         LIMIT 8`,
        examParams
    );

    const result = {
        studentCount,
        activeStudentCount,
        examSummary: {
            completed: e.completed,
            inProgress: e.in_progress,
            notStarted: e.not_started,
            avgScore: e.avg_score !== null ? Math.round(Number(e.avg_score)) : null,
        },
        scoreDistribution: {
            range0_25: e.range0_25,
            range26_50: e.range26_50,
            range51_75: e.range51_75,
            range76_100: e.range76_100,
        },
        correctWrongTotals: {
            correct: e.total_correct,
            wrong: e.total_wrong,
        },
        recentActivity: activityRows.map(r => ({
            studentId: r.student_id,
            firstName: r.first_name,
            lastName: r.last_name,
            completedAt: r.completed_at,
            finalScore: r.final_score,
        })),
    };
    if (!teacherId) {
        result.teacherCount = teacherCount;
        result.activeTeacherCount = activeTeacherCount;
        result.teachersWithNoCompletions = teachersWithNoCompletions;
    }
    return result;
}

async function studentsOfTeacher(teacherId) {
    const { rows } = await pool.query(
        `SELECT * FROM users WHERE teacher_id = $1 AND role = 'student'`,
        [teacherId]
    );
    return rows.map(mapUser);
}

// ══════════════════════════════════════════════════════════
// SORU ANALİZİ — 150 sorunun TAMAMLANMIŞ sınavlar üzerinden istatistiği.
// Ayrı bir sonuç tablosu YOK: answers/exam_attempts/users tablolarından
// hesaplanıyor. Veri seti sabit boyutlu (en fazla 150 satır) olduğundan
// sıralama/sayfalama/kategori özeti uygulama katmanında (JS) yapılıyor —
// SQL yalnızca ham toplamları getiriyor.
// ══════════════════════════════════════════════════════════

const QUESTION_STATS_SORT_KEYS = {
    wrongCount: 'wrong',
    correctCount: 'correct',
    correctRate: 'correctRate',
};

async function fetchQuestionAggregates(teacherId) {
    const params = [];
    let teacherFilter = '';
    if (teacherId) {
        params.push(teacherId);
        teacherFilter = `AND s.teacher_id = $${params.length}`;
    }
    const { rows } = await pool.query(
        `SELECT a.question_id, MIN(a.question_index)::int AS question_index,
                COUNT(*)::int AS answered,
                COUNT(*) FILTER (WHERE a.is_correct)::int AS correct,
                COUNT(*) FILTER (WHERE NOT a.is_correct)::int AS wrong
         FROM answers a
         JOIN exam_attempts ea ON ea.id = a.exam_attempt_id
         JOIN users s ON s.id = ea.student_id
         WHERE ea.status = 'Completed' AND s.role = 'student' ${teacherFilter}
         GROUP BY a.question_id`,
        params
    );
    return rows.map(r => {
        const correctRate = r.answered ? Math.round((r.correct / r.answered) * 100) : 0;
        return {
            questionId: r.question_id,
            questionIndex: r.question_index,
            category: categorize(r.question_id),
            answered: r.answered,
            correct: r.correct,
            wrong: r.wrong,
            correctRate,
            wrongRate: 100 - correctRate,
        };
    });
}

/**
 * 150 sorunun tamamlanmış sınavlar üzerinden istatistiği (öğretmen kendi
 * öğrencileriyle sınırlı — teacherId verilirse; yönetici için teacherId=null
 * verilip sistem geneli hesaplanır). Kategori özetleri sayfalamadan bağımsız,
 * TÜM sorular üzerinden hesaplanır.
 */
async function getQuestionStats({ teacherId, sortBy, sortDirection, page, pageSize }) {
    const items = await fetchQuestionAggregates(teacherId || null);

    const categoryMap = new Map();
    for (const it of items) {
        const c = categoryMap.get(it.category) || { category: it.category, questionCount: 0, totalCorrect: 0, totalAnswered: 0 };
        c.questionCount += 1;
        c.totalCorrect += it.correct;
        c.totalAnswered += it.answered;
        categoryMap.set(it.category, c);
    }
    const categories = Array.from(categoryMap.values())
        .map(c => ({
            category: c.category,
            questionCount: c.questionCount,
            totalAnswered: c.totalAnswered,
            avgCorrectRate: c.totalAnswered ? Math.round((c.totalCorrect / c.totalAnswered) * 100) : 0,
        }))
        .sort((a, b) => b.avgCorrectRate - a.avgCorrectRate);

    const sortKey = QUESTION_STATS_SORT_KEYS[sortBy] || 'wrong';
    const ascending = sortDirection === 'asc';
    items.sort((a, b) => ascending ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]);

    const size = toIntParam(pageSize, 25, 1, 150);
    const pageNum = toIntParam(page, 1, 1, Number.MAX_SAFE_INTEGER);
    const total = items.length;
    const totalPages = Math.max(Math.ceil(total / size), 1);
    const offset = (pageNum - 1) * size;

    return {
        items: items.slice(offset, offset + size),
        total,
        page: pageNum,
        pageSize: size,
        totalPages,
        categories,
    };
}

/** Tek bir sorunun detayı: istatistik + yanlış yapan öğrenci listesi. */
async function getQuestionDetail({ questionId, teacherId }) {
    const aggregates = await fetchQuestionAggregates(teacherId || null);
    const summary = aggregates.find(a => a.questionId === questionId) || {
        questionId,
        questionIndex: null,
        category: categorize(questionId),
        answered: 0,
        correct: 0,
        wrong: 0,
        correctRate: 0,
        wrongRate: 0,
    };

    const params = [questionId];
    let teacherFilter = '';
    if (teacherId) {
        params.push(teacherId);
        teacherFilter = `AND s.teacher_id = $${params.length}`;
    }
    const { rows } = await pool.query(
        `SELECT s.id AS student_id, s.first_name, s.last_name, a.is_correct
         FROM answers a
         JOIN exam_attempts ea ON ea.id = a.exam_attempt_id
         JOIN users s ON s.id = ea.student_id
         WHERE ea.status = 'Completed' AND s.role = 'student'
               AND a.question_id = $1 ${teacherFilter}
         ORDER BY s.first_name, s.last_name`,
        params
    );
    const wrongRows = rows.filter(r => !r.is_correct);
    const correctRows = rows.filter(r => r.is_correct);

    return {
        ...summary,
        wrongStudents: wrongRows.map(r => ({
            studentId: r.student_id,
            firstName: r.first_name,
            lastName: r.last_name,
        })),
        correctStudents: correctRows.map(r => ({
            studentId: r.student_id,
            firstName: r.first_name,
            lastName: r.last_name,
        })),
    };
}

module.exports = {
    pool,
    migrate,
    findUserByUsername,
    findUserById,
    createUser,
    updateUser,
    seedAdmin,
    createExamAttemptForStudent,
    findExamAttemptByStudentId,
    findExamAttemptById,
    updateExamAttempt,
    answersForAttempt,
    upsertAnswer,
    studentExamStats,
    teacherAggregateStats,
    getTeachersPage,
    getStudentsPage,
    getOverviewStats,
    studentsOfTeacher,
    getQuestionStats,
    getQuestionDetail,
};
