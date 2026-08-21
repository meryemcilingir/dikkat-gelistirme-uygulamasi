const LIMITS = {
    firstName: { min: 2, max: 50, label: 'Ad' },
    lastName: { min: 2, max: 50, label: 'Soyad' },
    username: { min: 4, max: 30, label: 'Kullanıcı adı' },
    password: { min: 6, max: 50, label: 'Şifre' },
};

/**
 * Ad/soyad/kullanıcı adı/şifre alanlarını uzunluk sınırlarına göre doğrular.
 * Geçerliyse null, değilse kullanıcıya gösterilecek anlaşılır bir Türkçe mesaj döndürür.
 */
function validateUserFields({ firstName, lastName, username, password }) {
    const fields = { firstName, lastName, username, password };
    for (const [key, limit] of Object.entries(LIMITS)) {
        const value = fields[key];
        if (typeof value !== 'string' || value.trim().length === 0) {
            return `${limit.label} zorunludur.`;
        }
        const len = value.trim().length;
        if (len < limit.min) {
            return `${limit.label} en az ${limit.min} karakter olmalıdır.`;
        }
        if (len > limit.max) {
            return `${limit.label} en fazla ${limit.max} karakter olabilir.`;
        }
    }
    return null;
}

/** PATCH gibi kısmi güncellemelerde sadece gönderilen alanları doğrular. */
function validatePartialUserFields(patch) {
    const fields = {};
    for (const key of Object.keys(LIMITS)) {
        if (patch[key] !== undefined) fields[key] = patch[key];
    }
    for (const [key, value] of Object.entries(fields)) {
        const limit = LIMITS[key];
        if (typeof value !== 'string' || value.trim().length === 0) {
            return `${limit.label} boş olamaz.`;
        }
        const len = value.trim().length;
        if (len < limit.min) {
            return `${limit.label} en az ${limit.min} karakter olmalıdır.`;
        }
        if (len > limit.max) {
            return `${limit.label} en fazla ${limit.max} karakter olabilir.`;
        }
    }
    return null;
}

module.exports = { validateUserFields, validatePartialUserFields, LIMITS };
