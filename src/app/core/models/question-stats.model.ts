export interface QuestionStat {
    questionId: string;
    questionIndex: number | null;
    category: string;
    answered: number;
    correct: number;
    wrong: number;
    correctRate: number;
    wrongRate: number;
    /** Admin'in aktif/pasif ataması — global veri, öğretmene de gösterilir. */
    active: boolean;
}

export interface QuestionCategoryStat {
    category: string;
    questionCount: number;
    totalAnswered: number;
    avgCorrectRate: number;
}

export interface QuestionStatsQuery {
    page?: number;
    pageSize?: number;
    sortBy?: 'questionIndex' | 'wrongCount' | 'correctCount' | 'correctRate';
    sortDirection?: 'asc' | 'desc';
    /** Yalnızca admin: belirli bir öğretmenle sınırlamak için (opsiyonel). */
    teacherId?: string;
}

export interface QuestionStatsResult {
    items: QuestionStat[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    categories: QuestionCategoryStat[];
}

/**
 * "Dikkat Gerektirenler" satırlarından "Sorular" sekmesine geçerken uygulanan
 * karşılıklı dışlayan başarı-aralığı filtresi — admin ve öğretmen tarafında
 * ortak (bkz. question-analysis.component.ts).
 */
export interface QuestionRateFilter {
    correctRateMin?: number;
    correctRateMax?: number;
    /** true ise yalnızca hiç cevaplanmamış (answered=0) sorular. */
    noData?: boolean;
}

export interface QuestionWrongStudent {
    studentId: string;
    firstName: string;
    lastName: string;
}

export interface QuestionDetail extends QuestionStat {
    wrongStudents: QuestionWrongStudent[];
    correctStudents: QuestionWrongStudent[];
}
