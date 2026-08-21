export type Role = 'admin' | 'teacher' | 'student';

export interface AppUser {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    role: Role;
    teacherId: string | null;
    active: boolean;
    createdAt: string;
}

export interface ExamSummary {
    status: 'Assigned' | 'InProgress' | 'Completed';
    answered: number;
    total: number;
    finalScore?: number | null;
    correctCount?: number | null;
    wrongCount?: number | null;
    correctRate?: number | null;
    /** Süresi kaydedilmiş cevap yoksa (eski kayıt) null — öğretmen ekranında "—" gösterilir. */
    totalTimeSeconds?: number | null;
}

export interface StudentWithExam extends AppUser {
    exam: ExamSummary;
    teacherName?: string | null;
}

/** Öğretmenin öğrencileri üzerinden hesaplanan toplu istatistikler. */
export interface TeacherStats {
    studentCount: number;
    activeStudentCount: number;
    completedExams: number;
    inProgressExams: number;
    notStartedExams: number;
    avgScore: number | null;
    correctCount: number;
    wrongCount: number;
    correctRate: number | null;
}

export interface TeacherWithCount extends AppUser, TeacherStats { }

/** Sayfalı liste yanıtı. */
export interface PagedResult<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface TeacherQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: '' | 'active' | 'passive';
    sortBy?: 'name' | 'username' | 'studentCount' | 'activeStudentCount' | 'avgScore' | 'completedExams' | 'createdAt';
    sortDirection?: 'asc' | 'desc';
}

export interface StudentQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    teacherId?: string;
    status?: '' | 'Assigned' | 'InProgress' | 'Completed';
    active?: '' | 'active' | 'passive';
    scoreMin?: number | null;
    scoreMax?: number | null;
    correctRateMin?: number | null;
    correctRateMax?: number | null;
    /** Tamamlanma tarihine göre filtre — ISO tarih string'i (yyyy-MM-dd). */
    completedFrom?: string | null;
    completedTo?: string | null;
    sortBy?: 'name' | 'username' | 'score' | 'progress' | 'correctRate' | 'createdAt';
    sortDirection?: 'asc' | 'desc';
}
