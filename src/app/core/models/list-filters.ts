import { StudentQuery } from './user.model';

export interface FilterChip {
    label: string;
    clear: () => void;
}

const STATUS_LABELS: Record<string, string> = {
    Assigned: 'Başlamadı',
    InProgress: 'Devam Ediyor',
    Completed: 'Tamamlandı',
};

/**
 * Aktif olan öğrenci filtrelerini "silinebilir etiket" listesine çevirir.
 * `teacherLabel` yalnızca öğretmen filtresi kullanıcıya gösterilecekse (yönetici
 * tarafındaki genel öğrenci listesinde) verilir; öğretmenin kendi listesinde
 * veya belirli bir öğretmene sabitlenmiş ekranlarda bu filtre zaten gizlidir.
 */
export function studentFilterChips(
    q: StudentQuery,
    reload: () => void,
    teacherLabel?: string | null
): FilterChip[] {
    const chips: FilterChip[] = [];

    if (q.search) {
        chips.push({ label: `Arama: "${q.search}"`, clear: () => { q.search = ''; reload(); } });
    }
    if (teacherLabel !== undefined && q.teacherId) {
        chips.push({ label: `Öğretmen: ${teacherLabel ?? '—'}`, clear: () => { q.teacherId = ''; reload(); } });
    }
    if (q.status) {
        chips.push({ label: `Durum: ${STATUS_LABELS[q.status] ?? q.status}`, clear: () => { q.status = ''; reload(); } });
    }
    if (q.active) {
        chips.push({ label: q.active === 'active' ? 'Aktif öğrenciler' : 'Pasif öğrenciler', clear: () => { q.active = ''; reload(); } });
    }
    if (q.scoreMin != null || q.scoreMax != null) {
        chips.push({
            label: `Puan: ${q.scoreMin ?? 0}–${q.scoreMax ?? 100}`,
            clear: () => { q.scoreMin = null; q.scoreMax = null; reload(); },
        });
    }
    if (q.correctRateMin != null || q.correctRateMax != null) {
        chips.push({
            label: `Başarı: %${q.correctRateMin ?? 0}–%${q.correctRateMax ?? 100}`,
            clear: () => { q.correctRateMin = null; q.correctRateMax = null; reload(); },
        });
    }
    return chips;
}
