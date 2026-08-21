const jwt = require('jsonwebtoken');
const db = require('./db');

// Demo/eğitim amaçlı sabit secret. Gerçek üretimde ortam değişkeninden okunmalı.
const JWT_SECRET = process.env.JWT_SECRET || 'dikkat-gelistirme-demo-secret-key';

function signToken(user) {
    return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
}

async function authenticate(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Giriş gerekli.' });
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        const user = await db.findUserById(payload.sub);
        if (!user || !user.active) return res.status(401).json({ error: 'Oturum geçersiz.' });
        req.user = user;
        next();
    } catch {
        return res.status(401).json({ error: 'Oturum geçersiz veya süresi dolmuş.' });
    }
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
        }
        next();
    };
}

function publicUser(user) {
    if (!user) return null;
    const { passwordHash, ...rest } = user;
    return rest;
}

module.exports = { signToken, authenticate, requireRole, publicUser, JWT_SECRET };
