require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const teacherRoutes = require('./routes/teacher');
const studentRoutes = require('./routes/student');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası.' });
});

const PORT = process.env.PORT || 3333;

async function start() {
    await db.migrate();
    await db.seedAdmin();
    app.listen(PORT, () => {
        console.log(`Dikkat geliştirme API sunucusu http://localhost:${PORT} adresinde çalışıyor`);
    });
}

start().catch(err => {
    console.error('Sunucu başlatılamadı (veritabanına bağlanılamadı olabilir):', err.message);
    process.exit(1);
});
