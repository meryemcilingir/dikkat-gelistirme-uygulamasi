const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, authenticate, publicUser } = require('../auth');
const { LIMITS } = require('../validate');
const { asyncHandler } = require('../asyncHandler');

const router = express.Router();

router.post('/login', asyncHandler(async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
        return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli.' });
    }
    const user = await db.findUserByUsername(username);
    if (!user || !user.active || !bcrypt.compareSync(password, user.passwordHash)) {
        return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı.' });
    }
    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
}));

router.get('/me', authenticate, (req, res) => {
    res.json({ user: publicUser(req.user) });
});

// Kullanıcının kendi şifresini değiştirmesi (rol fark etmeksizin) — mevcut şifre doğrulanır.
router.post('/change-password', authenticate, asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Mevcut şifre ve yeni şifre gerekli.' });
    }
    if (!bcrypt.compareSync(currentPassword, req.user.passwordHash)) {
        // 401 kasıtlı olarak kullanılmıyor: frontend interceptor'ı 401'i "oturum süresi doldu"
        // olarak yorumlayıp kullanıcıyı otomatik çıkışa yönlendiriyor. Bu, geçerli bir oturumda
        // sadece yanlış şifre girildiği için oturumun sonlanmasına yol açar.
        return res.status(400).json({ error: 'Mevcut şifre hatalı.' });
    }
    const len = String(newPassword).trim().length;
    if (len < LIMITS.password.min || len > LIMITS.password.max) {
        return res.status(400).json({
            error: `Şifre en az ${LIMITS.password.min}, en fazla ${LIMITS.password.max} karakter olmalıdır.`,
        });
    }
    await db.updateUser(req.user.id, { password: newPassword });
    res.json({ ok: true });
}));

module.exports = router;
