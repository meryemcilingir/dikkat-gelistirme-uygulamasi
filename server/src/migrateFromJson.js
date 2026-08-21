// Tek seferlik veri taşıma: server/data/db.json → PostgreSQL.
// Yeniden çalıştırılması güvenlidir (ON CONFLICT ... DO NOTHING, id'ler korunur).
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./db');
const { pool } = require('./pool');

async function main() {
    const file = path.join(__dirname, '..', 'data', 'db.json');
    if (!fs.existsSync(file)) {
        console.log('db.json bulunamadı, taşınacak veri yok.');
        return;
    }
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));

    await db.migrate();

    console.log(`Taşınıyor: ${data.users.length} kullanıcı, ${data.examAttempts.length} sınav denemesi, ${data.answers.length} cevap...`);

    for (const u of data.users) {
        await pool.query(
            `INSERT INTO users (id, first_name, last_name, username, username_lower, password_hash, role, teacher_id, active, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (id) DO NOTHING`,
            [u.id, u.firstName, u.lastName, u.username, u.username.toLowerCase(), u.passwordHash, u.role, u.teacherId || null, u.active, u.createdAt]
        );
    }

    for (const a of data.examAttempts) {
        await pool.query(
            `INSERT INTO exam_attempts (id, student_id, status, total_questions, current_index, started_at, last_activity_at, completed_at, final_score, correct_count, wrong_count)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (id) DO NOTHING`,
            [a.id, a.studentId, a.status, a.totalQuestions, a.currentIndex, a.startedAt, a.lastActivityAt, a.completedAt, a.finalScore, a.correctCount, a.wrongCount]
        );
    }

    for (const ans of data.answers) {
        await pool.query(
            `INSERT INTO answers (id, exam_attempt_id, question_index, question_id, student_answer, is_correct, attempt_count, score, answered_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (id) DO NOTHING`,
            [ans.id, ans.examAttemptId, ans.questionIndex, ans.questionId, JSON.stringify(ans.studentAnswer ?? null), ans.isCorrect, ans.attemptCount, ans.score, ans.answeredAt]
        );
    }

    console.log('Taşıma tamamlandı.');
}

main()
    .catch(err => { console.error('Taşıma başarısız:', err); process.exitCode = 1; })
    .finally(() => pool.end());
