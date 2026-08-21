export type ExamStatus = 'Assigned' | 'InProgress' | 'Completed';

export interface ExamAttempt {
    id: string;
    studentId: string;
    status: ExamStatus;
    totalQuestions: number;
    currentIndex: number;
    startedAt: string | null;
    lastActivityAt: string | null;
    completedAt: string | null;
    finalScore: number | null;
    correctCount: number | null;
    wrongCount: number | null;
}

export interface ExamAnswer {
    id?: string;
    examAttemptId?: string;
    questionIndex: number;
    questionId: string;
    studentAnswer?: unknown;
    isCorrect: boolean;
    attemptCount: number;
    score: number;
    answeredAt?: string;
    /** Öğretmenin inceleme ekranında gösterilir — öğrenciye hiç gösterilmez. Eski kayıtlarda yok olabilir. */
    timeSpentSeconds?: number | null;
    /** Yalnızca öğretmen/admin inceleme uç noktalarında backend tarafından hesaplanıp eklenir. */
    category?: string;
}

export interface StudentExamState {
    attempt: ExamAttempt;
    questions: string[];
    answers: ExamAnswer[];
}

export interface TeacherExamReview {
    student: { id: string; firstName: string; lastName: string; username: string; teacherId: string | null };
    attempt: ExamAttempt;
    questions: string[];
    answers: ExamAnswer[];
}
