// Backend server/src/validate.js ile birebir aynı sınırlar.
export const USER_FIELD_LIMITS = {
    firstName: { min: 2, max: 50, label: 'Ad' },
    lastName: { min: 2, max: 50, label: 'Soyad' },
    username: { min: 4, max: 30, label: 'Kullanıcı adı' },
    password: { min: 6, max: 50, label: 'Şifre' },
} as const;

export interface UserFormFields {
    firstName: string;
    lastName: string;
    username: string;
    password: string;
}

/** Geçerliyse null, değilse kullanıcıya gösterilecek anlaşılır bir Türkçe mesaj döndürür. */
export function validateUserFields(fields: UserFormFields): string | null {
    for (const key of Object.keys(USER_FIELD_LIMITS) as (keyof UserFormFields)[]) {
        const limit = USER_FIELD_LIMITS[key];
        const value = (fields[key] ?? '').trim();
        if (!value) return `${limit.label} zorunludur.`;
        if (value.length < limit.min) return `${limit.label} en az ${limit.min} karakter olmalıdır.`;
        if (value.length > limit.max) return `${limit.label} en fazla ${limit.max} karakter olabilir.`;
    }
    return null;
}

/** Düzenleme formları için: ad/soyad/kullanıcı adı (şifresiz) doğrular. */
export function validateEditFields(fields: { firstName: string; lastName: string; username: string }): string | null {
    for (const key of ['firstName', 'lastName', 'username'] as const) {
        const limit = USER_FIELD_LIMITS[key];
        const value = (fields[key] ?? '').trim();
        if (!value) return `${limit.label} zorunludur.`;
        if (value.length < limit.min) return `${limit.label} en az ${limit.min} karakter olmalıdır.`;
        if (value.length > limit.max) return `${limit.label} en fazla ${limit.max} karakter olabilir.`;
    }
    return null;
}

/** Şifre sıfırlama formları için. */
export function validateNewPassword(password: string): string | null {
    const limit = USER_FIELD_LIMITS.password;
    const value = password ?? '';
    if (!value) return `${limit.label} zorunludur.`;
    if (value.length < limit.min) return `${limit.label} en az ${limit.min} karakter olmalıdır.`;
    if (value.length > limit.max) return `${limit.label} en fazla ${limit.max} karakter olabilir.`;
    return null;
}
