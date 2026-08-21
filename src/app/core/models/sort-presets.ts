import { StudentQuery, TeacherQuery } from './user.model';
import { QuestionStatsQuery } from './question-stats.model';

export interface SortPreset<TSortBy extends string> {
    label: string;
    sortBy: TSortBy;
    sortDirection: 'asc' | 'desc';
}

/** Öğrenci listelerinde (yönetici ve öğretmen tarafında ortak) sunulan sıralama seçenekleri. */
export const STUDENT_SORT_PRESETS: SortPreset<NonNullable<StudentQuery['sortBy']>>[] = [
    { label: 'Ada göre (A-Z)', sortBy: 'name', sortDirection: 'asc' },
    { label: 'Ada göre (Z-A)', sortBy: 'name', sortDirection: 'desc' },
    { label: 'En yüksek puan', sortBy: 'score', sortDirection: 'desc' },
    { label: 'En düşük puan', sortBy: 'score', sortDirection: 'asc' },
    { label: 'En yüksek doğru oranı', sortBy: 'correctRate', sortDirection: 'desc' },
    { label: 'En düşük doğru oranı', sortBy: 'correctRate', sortDirection: 'asc' },
    { label: 'En fazla tamamlanan soru', sortBy: 'progress', sortDirection: 'desc' },
    { label: 'En az tamamlanan soru', sortBy: 'progress', sortDirection: 'asc' },
    { label: 'En yeni eklenen', sortBy: 'createdAt', sortDirection: 'desc' },
    { label: 'En eski eklenen', sortBy: 'createdAt', sortDirection: 'asc' },
];

/** Yönetici tarafında öğretmen listesi için sıralama seçenekleri. */
export const TEACHER_SORT_PRESETS: SortPreset<NonNullable<TeacherQuery['sortBy']>>[] = [
    { label: 'Ada göre (A-Z)', sortBy: 'name', sortDirection: 'asc' },
    { label: 'Ada göre (Z-A)', sortBy: 'name', sortDirection: 'desc' },
    { label: 'Öğrenci sayısı (çok-az)', sortBy: 'studentCount', sortDirection: 'desc' },
    { label: 'Öğrenci sayısı (az-çok)', sortBy: 'studentCount', sortDirection: 'asc' },
    { label: 'Aktif öğrenci sayısı (çok-az)', sortBy: 'activeStudentCount', sortDirection: 'desc' },
    { label: 'Aktif öğrenci sayısı (az-çok)', sortBy: 'activeStudentCount', sortDirection: 'asc' },
    { label: 'Ortalama başarı (yüksek-düşük)', sortBy: 'avgScore', sortDirection: 'desc' },
    { label: 'Ortalama başarı (düşük-yüksek)', sortBy: 'avgScore', sortDirection: 'asc' },
    { label: 'Tamamlanan sınav (çok-az)', sortBy: 'completedExams', sortDirection: 'desc' },
    { label: 'Tamamlanan sınav (az-çok)', sortBy: 'completedExams', sortDirection: 'asc' },
    { label: 'En yeni eklenen', sortBy: 'createdAt', sortDirection: 'desc' },
    { label: 'En eski eklenen', sortBy: 'createdAt', sortDirection: 'asc' },
];

/** Soru analizi tablosu için sıralama seçenekleri. */
export const QUESTION_SORT_PRESETS: SortPreset<NonNullable<QuestionStatsQuery['sortBy']>>[] = [
    { label: 'En çok yanlış yapılan', sortBy: 'wrongCount', sortDirection: 'desc' },
    { label: 'En çok doğru yapılan', sortBy: 'correctCount', sortDirection: 'desc' },
    { label: 'Başarı oranı düşükten yükseğe', sortBy: 'correctRate', sortDirection: 'asc' },
    { label: 'Başarı oranı yüksekten düşüğe', sortBy: 'correctRate', sortDirection: 'desc' },
];

/** query.sortBy + query.sortDirection çiftini presets listesindeki index'e çevirir (select binding için). */
export function presetIndexFor<T extends string>(
    presets: SortPreset<T>[],
    sortBy: T | undefined,
    sortDirection: 'asc' | 'desc' | undefined
): number {
    const i = presets.findIndex(p => p.sortBy === sortBy && p.sortDirection === (sortDirection ?? 'asc'));
    return i === -1 ? 0 : i;
}
