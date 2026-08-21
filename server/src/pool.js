const { Pool } = require('pg');

// Prod'da gerçek hosting sağlayıcısı (Neon/Supabase/RDS vb.) DATABASE_URL'i verir.
// Yerelde geliştirme için varsayılan bağlantı .env / ortam değişkeniyle geçilebilir.
const connectionString = process.env.DATABASE_URL
    || 'postgres://postgres:postgres@localhost:5432/dikkat_gelistirme';

const pool = new Pool({
    connectionString,
    // Yerel/tek küçük sunucu için makul bir üst sınır; barındırma sağlayıcısı
    // limitine göre PGPOOL_MAX ile ayarlanabilir.
    max: Number(process.env.PGPOOL_MAX) || 10,
});

pool.on('error', (err) => {
    // Boşta bekleyen bir client'ta beklenmeyen hata — process'i çökertmesin.
    console.error('[pg pool] beklenmeyen hata:', err.message);
});

module.exports = { pool };
