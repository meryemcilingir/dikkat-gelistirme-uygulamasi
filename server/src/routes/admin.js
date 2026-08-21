const express = require('express');
const db = require('../db');
const { authenticate, requireRole, publicUser } = require('../auth');
const { validateUserFields, validatePartialUserFields } = require('../validate');
const { EXAM_QUESTIONS } = require('../examQuestions');
const { categorize } = require('../questionCategories');
const { asyncHandler } = require('../asyncHandler');

const router = express.Router();
router.use(authenticate, requireRole('admin'));

// ── Öğretmenler ───────────────────────────────────────────

router.post('/teachers', asyncHandler(async (req, res) => {
    const { firstName, lastName, username, password } = req.body || {};
    const validationError = validateUserFields({ firstName, lastName, username, password });
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }
    try {
        const user = await db.createUser({ firstName, lastName, username, password, role: 'teacher' });
        res.status(201).json({ user: publicUser(user) });
    } catch (err) {
        if (err.code === 'USERNAME_TAKEN') return res.status(409).json({ error: err.message });
        throw err;
    }
}));

/**
 * Sayfalı öğretmen listesi.
 * Query: page, pageSize, search, status(active|passive), sortBy, sortDirection
 */
router.get('/teachers', asyncHandler(async (req, res) => {
    const { search, status, sortBy, sortDirection, page, pageSize } = req.query;
    const result = await db.getTeachersPage({ search, status, sortBy, sortDirection, page, pageSize });
    res.json({
        teachers: result.items.map(r => ({ ...publicUser(r.user), ...r.stats })),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
    });
}));

/** Öğretmen detayı: kimlik bilgileri + toplu istatistikler. */
router.get('/teachers/:id', asyncHandler(async (req, res) => {
    const teacher = await db.findUserById(req.params.id);
    if (!teacher || teacher.role !== 'teacher') {
        return res.status(404).json({ error: 'Öğretmen bulunamadı.' });
    }
    res.json({
        teacher: publicUser(teacher),
        stats: await db.teacherAggregateStats(teacher.id),
    });
}));

router.patch('/teachers/:id', asyncHandler(async (req, res) => {
    const teacher = await db.findUserById(req.params.id);
    if (!teacher || teacher.role !== 'teacher') return res.status(404).json({ error: 'Öğretmen bulunamadı.' });
    const validationError = validatePartialUserFields(req.body || {});
    if (validationError) return res.status(400).json({ error: validationError });
    try {
        const updated = await db.updateUser(teacher.id, req.body || {});
        res.json({ user: publicUser(updated) });
    } catch (err) {
        if (err.code === 'USERNAME_TAKEN') return res.status(409).json({ error: err.message });
        throw err;
    }
}));

// ── Öğrenciler ────────────────────────────────────────────

/**
 * Sayfalı öğrenci listesi.
 * Query: page, pageSize, search, teacherId, status(Assigned|InProgress|Completed),
 *        active(active|passive), scoreMin, scoreMax, correctRateMin, correctRateMax,
 *        sortBy, sortDirection
 */
router.get('/students', asyncHandler(async (req, res) => {
    const { search, teacherId, status, active, scoreMin, scoreMax, correctRateMin, correctRateMax, completedFrom, completedTo, sortBy, sortDirection, page, pageSize } = req.query;
    const result = await db.getStudentsPage({ search, teacherId, status, active, scoreMin, scoreMax, correctRateMin, correctRateMax, completedFrom, completedTo, sortBy, sortDirection, page, pageSize });
    res.json({
        students: result.items.map(r => ({
            ...publicUser(r.user),
            teacherName: r.teacherName,
            exam: r.stats,
        })),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
    });
}));

router.patch('/students/:id', asyncHandler(async (req, res) => {
    const student = await db.findUserById(req.params.id);
    if (!student || student.role !== 'student') return res.status(404).json({ error: 'Öğrenci bulunamadı.' });
    const validationError = validatePartialUserFields(req.body || {});
    if (validationError) return res.status(400).json({ error: validationError });
    try {
        const updated = await db.updateUser(student.id, req.body || {});
        res.json({ user: publicUser(updated) });
    } catch (err) {
        if (err.code === 'USERNAME_TAKEN') return res.status(409).json({ error: err.message });
        throw err;
    }
}));

/** Yöneticinin herhangi bir öğrencinin sınavını inceleyebilmesi. */
router.get('/students/:id/exam', asyncHandler(async (req, res) => {
    const student = await db.findUserById(req.params.id);
    if (!student || student.role !== 'student') {
        return res.status(404).json({ error: 'Öğrenci bulunamadı.' });
    }
    const attempt = await db.findExamAttemptByStudentId(student.id);
    if (!attempt) return res.status(404).json({ error: 'Sınav bulunamadı.' });
    const answers = await db.answersForAttempt(attempt.id);
    res.json({
        student: publicUser(student),
        attempt,
        questions: EXAM_QUESTIONS,
        answers: answers.map(a => ({ ...a, category: categorize(a.questionId) })),
    });
}));

// ── Genel bakış ───────────────────────────────────────────

router.get('/overview', asyncHandler(async (req, res) => {
    res.json(await db.getOverviewStats());
}));

// ── Soru analizi ──────────────────────────────────────────

/**
 * Sistem geneli (veya ?teacherId= ile tek bir öğretmene sınırlı) soru istatistiği.
 * Query: teacherId (opsiyonel), sortBy, sortDirection, page, pageSize
 */
router.get('/question-stats', asyncHandler(async (req, res) => {
    const { teacherId, sortBy, sortDirection, page, pageSize } = req.query;
    const result = await db.getQuestionStats({ teacherId: teacherId || null, sortBy, sortDirection, page, pageSize });
    res.json(result);
}));

router.get('/question-stats/:questionId', asyncHandler(async (req, res) => {
    const { teacherId } = req.query;
    const detail = await db.getQuestionDetail({ questionId: req.params.questionId, teacherId: teacherId || null });
    res.json(detail);
}));

module.exports = router;
