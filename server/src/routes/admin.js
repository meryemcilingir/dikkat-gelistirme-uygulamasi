const express = require('express');
const db = require('../db');
const { authenticate, requireRole, publicUser } = require('../auth');
const { validateUserFields, validatePartialUserFields } = require('../validate');
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
        questions: db.questionsForAttempt(attempt),
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

// ── Sınav Yönetimi: Sorular ────────────────────────────────
// Not: "Soru Analizi" (yukarıdaki question-stats) tamamen ayrı, salt-okunur
// bir analitik ekranı — burası yönetici tarafından düzenlenebilir metadata
// (kategori ataması, aktif/pasif, taslak soru) için.

router.get('/questions', asyncHandler(async (req, res) => {
    const { search, categoryId, active, correctRateMin, correctRateMax, noData, sortBy, sortDirection, page, pageSize } = req.query;
    const result = await db.listAdminQuestions({
        search, categoryId, active, correctRateMin, correctRateMax, noData: noData === 'true', sortBy, sortDirection, page, pageSize,
    });
    res.json(result);
}));

router.get('/questions/:id', asyncHandler(async (req, res) => {
    const detail = await db.getAdminQuestionDetail(req.params.id);
    if (!detail) return res.status(404).json({ error: 'Soru bulunamadı.' });
    res.json(detail);
}));

router.post('/questions', asyncHandler(async (req, res) => {
    const { title, categoryId } = req.body || {};
    if (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 100) {
        return res.status(400).json({ error: 'Başlık 3-100 karakter olmalıdır.' });
    }
    const created = await db.createDraftQuestion({ title: title.trim(), categoryId: categoryId || null });
    res.status(201).json(created);
}));

router.patch('/questions/:id', asyncHandler(async (req, res) => {
    const { categoryId, active, title } = req.body || {};
    if (title !== undefined && (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 100)) {
        return res.status(400).json({ error: 'Başlık 3-100 karakter olmalıdır.' });
    }
    try {
        const updated = await db.updateQuestionMeta(req.params.id, {
            categoryId, active, title: title !== undefined ? title.trim() : undefined,
        });
        res.json(updated);
    } catch (err) {
        if (err.code === 'NOT_FOUND') return res.status(404).json({ error: err.message });
        if (err.code === 'DRAFT_CANNOT_ACTIVATE') return res.status(400).json({ error: err.message });
        throw err;
    }
}));

router.delete('/questions/:id', asyncHandler(async (req, res) => {
    try {
        await db.deleteDraftQuestion(req.params.id);
        res.status(204).end();
    } catch (err) {
        if (err.code === 'NOT_DELETABLE') return res.status(400).json({ error: err.message });
        throw err;
    }
}));

// ── Sınav Yönetimi: Kategoriler ─────────────────────────────

router.get('/categories', asyncHandler(async (req, res) => {
    res.json(await db.listCategories());
}));

router.post('/categories', asyncHandler(async (req, res) => {
    const { name } = req.body || {};
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 40) {
        return res.status(400).json({ error: 'Kategori adı 2-40 karakter olmalıdır.' });
    }
    try {
        res.status(201).json(await db.createCategory(name.trim()));
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'Bu isimde bir kategori zaten var.' });
        throw err;
    }
}));

router.patch('/categories/:id', asyncHandler(async (req, res) => {
    const { name } = req.body || {};
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 40) {
        return res.status(400).json({ error: 'Kategori adı 2-40 karakter olmalıdır.' });
    }
    try {
        const updated = await db.renameCategory(req.params.id, name.trim());
        if (!updated) return res.status(404).json({ error: 'Kategori bulunamadı.' });
        res.json(updated);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'Bu isimde bir kategori zaten var.' });
        throw err;
    }
}));

router.delete('/categories/:id', asyncHandler(async (req, res) => {
    try {
        await db.deleteCategory(req.params.id);
        res.status(204).end();
    } catch (err) {
        if (err.code === 'CATEGORY_IN_USE') return res.status(409).json({ error: err.message });
        throw err;
    }
}));

module.exports = router;
