// Soru ID'sinden (activity path) kaba bir kategori türetir. 150 sorunun ayrı
// bir kategori alanı yok; anahtar-kelime eşlemesiyle yaklaşık bir gruplama
// yapılıyor (öğretmen/yönetici soru analizinde "kategoriye göre başarı" için).
// Sıra önemlidir — ilk eşleşen kategori kullanılır.
const RULES = [
    { category: 'Desen', keywords: ['pattern', 'identical-pattern'] },
    { category: 'Eşleştirme', keywords: ['match', 'matching'] },
    { category: 'Sayma', keywords: ['count', 'number', 'digit', 'abacus'] },
    { category: 'Toplama / Çıkarma', keywords: ['addition', 'subtraction', 'balance-scale'] },
    { category: 'Farklıyı Bulma', keywords: ['different', 'odd-', 'find-', 'subtle-difference'] },
    { category: 'Sıralama', keywords: ['sequence', 'order', 'sort-by', 'ranking'] },
    { category: 'Renklendirme', keywords: ['color', 'coloring'] },
    { category: 'Harf', keywords: ['letter', 'word', 'zebra-letters'] },
    { category: 'Şekil', keywords: ['shape', 'triangle', 'rectangle', 'geometric'] },
    { category: 'Yön / Konum', keywords: ['direction', 'position', 'view', 'rotate'] },
    { category: 'Izgara / Çizim', keywords: ['grid', 'draw', 'copy'] },
    { category: 'Genel Kültür', keywords: ['profession', 'people', 'children', 'doctor', 'living-things', 'traffic-sign', 'activity', 'expressions'] },
];

function categorize(questionId) {
    const id = String(questionId || '').toLowerCase();
    for (const rule of RULES) {
        if (rule.keywords.some(k => id.includes(k))) return rule.category;
    }
    return 'Diğer';
}

module.exports = { categorize };
