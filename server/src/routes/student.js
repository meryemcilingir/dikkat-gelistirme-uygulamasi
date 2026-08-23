const express = require('express');
const db = require('../db');
const { authenticate, requireRole } = require('../auth');
const { scoreForAttempt } = require('../scoring');
const { asyncHandler } = require('../asyncHandler');

const router = express.Router();
router.use(authenticate, requireRole('student'));

// Öğrenci her zaman sadece KENDİ sınavına erişir (req.user.id'den türetilir, body/param'dan asla).
router.get('/exam', asyncHandler(async (req, res) => {
    const attempt = await db.findExamAttemptByStudentId(req.user.id);
    if (!attempt) return res.status(404).json({ error: 'Size atanmış bir sınav bulunamadı.' });
    const rawAnswers = await db.answersForAttempt(attempt.id);
    const answers = rawAnswers.map(a => ({
        questionIndex: a.questionIndex,
        isCorrect: a.isCorrect,
        score: a.score,
    }));
    res.json({ attempt, questions: db.questionsForAttempt(attempt), answers });
}));

router.post('/exam/answer', asyncHandler(async (req, res) => {
    const attempt = await db.findExamAttemptByStudentId(req.user.id);
    if (!attempt) return res.status(404).json({ error: 'Size atanmış bir sınav bulunamadı.' });
    if (attempt.status === 'Completed') {
        return res.status(400).json({ error: 'Sınav zaten tamamlandı.' });
    }

    const { questionIndex, questionId, studentAnswer, isCorrect, attemptCount, timeSpentSeconds } = req.body || {};
    if (
        typeof questionIndex !== 'number' ||
        questionIndex !== attempt.currentIndex ||
        !questionId
    ) {
        return res.status(400).json({ error: 'Geçersiz veya sırası gelmemiş soru.' });
    }

    // Süre bilgisi yalnızca öğretmen inceleme ekranında gösterilir; makul olmayan
    // (negatif veya aşırı büyük — sekme uzun süre açık unutulmuş olabilir) değerler
    // sınav süresi toplamını bozmasın diye kaydedilmez (— olarak gösterilir).
    const MAX_QUESTION_SECONDS = 30 * 60;
    const parsedTime = Number(timeSpentSeconds);
    const safeTimeSpentSeconds = Number.isFinite(parsedTime) && parsedTime >= 0 && parsedTime <= MAX_QUESTION_SECONDS
        ? Math.round(parsedTime)
        : null;

    const score = scoreForAttempt(Math.max(1, attemptCount || 1), !!isCorrect);
    await db.upsertAnswer({
        examAttemptId: attempt.id,
        questionIndex,
        questionId,
        studentAnswer,
        isCorrect: !!isCorrect,
        attemptCount: attemptCount || 1,
        score,
        timeSpentSeconds: safeTimeSpentSeconds,
    });

    const now = new Date().toISOString();
    const patch = {
        lastActivityAt: now,
        status: 'InProgress',
        currentIndex: attempt.currentIndex + 1,
    };
    if (!attempt.startedAt) patch.startedAt = now;

    if (patch.currentIndex >= attempt.totalQuestions) {
        const answers = await db.answersForAttempt(attempt.id);
        const correctCount = answers.filter(a => a.isCorrect).length;
        const wrongCount = answers.length - correctCount;
        const rawTotal = answers.reduce((sum, a) => sum + (a.score || 0), 0);
        const maxTotal = attempt.totalQuestions * 10;
        patch.status = 'Completed';
        patch.completedAt = now;
        patch.correctCount = correctCount;
        patch.wrongCount = wrongCount;
        patch.finalScore = Math.round((rawTotal / maxTotal) * 100);
    }

    const updated = await db.updateExamAttempt(attempt.id, patch);
    res.json({ attempt: updated });
}));

module.exports = router;
