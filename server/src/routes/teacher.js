const express = require('express');
const db = require('../db');
const { authenticate, requireRole, publicUser } = require('../auth');
const { categorize } = require('../questionCategories');
const { validateUserFields, validatePartialUserFields } = require('../validate');
const { asyncHandler } = require('../asyncHandler');

const router = express.Router();
router.use(authenticate, requireRole('teacher'));

router.post('/students', asyncHandler(async (req, res) => {
    const { firstName, lastName, username, password } = req.body || {};
    const validationError = validateUserFields({ firstName, lastName, username, password });
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }
    try {
        const user = await db.createUser({ firstName, lastName, username, password, role: 'student', teacherId: req.user.id });
        await db.createExamAttemptForStudent(user.id);
        res.status(201).json({ user: publicUser(user) });
    } catch (err) {
        if (err.code === 'USERNAME_TAKEN') return res.status(409).json({ error: err.message });
        throw err;
    }
}));

/**
 * Öğretmenin kendi öğrencilerinin sayfalı listesi.
 * teacherId her zaman oturumdaki öğretmene sabitlenir (istemci değiştiremez).
 * Query: page, pageSize, search, status, active, scoreMin, scoreMax,
 *        correctRateMin, correctRateMax, sortBy, sortDirection
 */
router.get('/students', asyncHandler(async (req, res) => {
    const { search, status, active, scoreMin, scoreMax, correctRateMin, correctRateMax, sortBy, sortDirection, page, pageSize } = req.query;
    const result = await db.getStudentsPage({
        teacherId: req.user.id,
        search, status, active, scoreMin, scoreMax, correctRateMin, correctRateMax, sortBy, sortDirection, page, pageSize,
    });
    res.json({
        students: result.items.map(r => ({ ...publicUser(r.user), exam: r.stats })),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
    });
}));

router.patch('/students/:id', asyncHandler(async (req, res) => {
    const student = await db.findUserById(req.params.id);
    if (!student || student.role !== 'student' || student.teacherId !== req.user.id) {
        return res.status(404).json({ error: 'Öğrenci bulunamadı.' });
    }
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

// Öğretmenin kendi öğrencisinin sınavını "kağıt inceler gibi" görmesi
router.get('/students/:id/exam', asyncHandler(async (req, res) => {
    const student = await db.findUserById(req.params.id);
    if (!student || student.role !== 'student' || student.teacherId !== req.user.id) {
        return res.status(403).json({ error: 'Bu öğrencinin sonuçlarına erişim yetkiniz yok.' });
    }
    const attempt = await db.findExamAttemptByStudentId(student.id);
    if (!attempt) return res.status(404).json({ error: 'Sınav bulunamadı.' });
    const answers = await db.answersForAttempt(attempt.id);
    res.json({
        student: publicUser(student),
        attempt,
        questions: db.questionsForAttempt(attempt),
        answers: answers.map(a => ({ ...a, category: categorize(a.questionId) })),
    });
}));

// ── Genel bakış ───────────────────────────────────────────

router.get('/overview', asyncHandler(async (req, res) => {
    res.json(await db.getOverviewStats(req.user.id));
}));

/**
 * Soru analizi: öğretmenin kendi öğrencilerinin TAMAMLANMIŞ sınavları üzerinden
 * 150 sorunun istatistiği (çözen sayısı, doğru/yanlış, oranlar) + kategori özeti.
 * Query: sortBy (wrongCount|correctCount|correctRate), sortDirection (asc|desc), page, pageSize
 */
router.get('/question-stats', asyncHandler(async (req, res) => {
    const { sortBy, sortDirection, page, pageSize } = req.query;
    const result = await db.getQuestionStats({ teacherId: req.user.id, sortBy, sortDirection, page, pageSize });
    res.json(result);
}));

/** Tek bir sorunun detayı (yanlış yapan öğrenciler dahil), öğretmenin kendi öğrencileriyle sınırlı. */
router.get('/question-stats/:questionId', asyncHandler(async (req, res) => {
    const detail = await db.getQuestionDetail({ questionId: req.params.questionId, teacherId: req.user.id });
    res.json(detail);
}));

module.exports = router;
