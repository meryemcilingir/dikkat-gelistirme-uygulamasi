/**
 * Sınav Yönetimi (Sorular/Kategoriler sekmeleri) için yönetilebilir metadata modelleri.
 * Sorunun kendi interaktif içeriği (görsel/mantık) src/app/features altındaki
 * component'ten gelir — burada yalnızca kategori ataması, aktif/pasif durumu
 * ve (taslaklar için) başlık tutulur. "Soru Analizi" (question-stats.model.ts)
 * tamamen ayrı, salt-okunur bir analitik modeldir.
 */
export interface Category {
    id: string;
    name: string;
    questionCount: number;
    avgCorrectRate: number | null;
}

export interface AdminQuestionListItem {
    questionId: string;
    /** null ise taslak soru — sınav sırasında yer almaz. */
    questionIndex: number | null;
    title: string;
    category: string;
    categoryId: string | null;
    active: boolean;
    isDraft: boolean;
    answered: number;
    correctRate: number | null;
}

export interface AdminQuestionDetail extends AdminQuestionListItem {
    correct: number;
    wrong: number;
    wrongStudents: { studentId: string; firstName: string; lastName: string }[];
    correctStudents: { studentId: string; firstName: string; lastName: string }[];
}

export interface AdminQuestionQuery {
    search?: string;
    categoryId?: string;
    active?: '' | 'active' | 'passive' | 'draft';
    sortBy?: 'index' | 'correctRate' | 'title';
    sortDirection?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
}

export interface AdminQuestionPage {
    items: AdminQuestionListItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}
