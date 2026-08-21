import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AppUser, PagedResult, StudentQuery, StudentWithExam } from '../models/user.model';
import { TeacherExamReview } from '../models/exam.model';
import { QuestionDetail, QuestionStatsQuery, QuestionStatsResult } from '../models/question-stats.model';
import { CorrectWrongTotals, RecentActivityItem, ScoreDistribution } from './admin.service';

export interface CreateStudentPayload {
    firstName: string;
    lastName: string;
    username: string;
    password: string;
}

export interface TeacherOverview {
    studentCount: number;
    activeStudentCount: number;
    examSummary: {
        completed: number;
        inProgress: number;
        notStarted: number;
        avgScore: number | null;
    };
    scoreDistribution: ScoreDistribution;
    correctWrongTotals: CorrectWrongTotals;
    recentActivity: RecentActivityItem[];
}

/** Boş/undefined alanları atarak HttpParams üretir. */
function toParams(query: Record<string, unknown>): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null || value === '') continue;
        params = params.set(key, String(value));
    }
    return params;
}

@Injectable({ providedIn: 'root' })
export class TeacherService {
    private http = inject(HttpClient);

    listStudents(query: StudentQuery = {}): Promise<PagedResult<StudentWithExam>> {
        return firstValueFrom(
            this.http.get<{ students: StudentWithExam[] } & Omit<PagedResult<never>, 'items'>>(
                '/api/teacher/students',
                { params: toParams(query as Record<string, unknown>) }
            )
        ).then(r => ({
            items: r.students,
            total: r.total,
            page: r.page,
            pageSize: r.pageSize,
            totalPages: r.totalPages,
        }));
    }

    createStudent(payload: CreateStudentPayload): Promise<AppUser> {
        return firstValueFrom(this.http.post<{ user: AppUser }>('/api/teacher/students', payload))
            .then(r => r.user);
    }

    updateStudent(id: string, patch: Partial<CreateStudentPayload & { active: boolean }>): Promise<AppUser> {
        return firstValueFrom(this.http.patch<{ user: AppUser }>(`/api/teacher/students/${id}`, patch))
            .then(r => r.user);
    }

    getStudentExam(studentId: string): Promise<TeacherExamReview> {
        return firstValueFrom(this.http.get<TeacherExamReview>(`/api/teacher/students/${studentId}/exam`));
    }

    getQuestionStats(query: QuestionStatsQuery = {}): Promise<QuestionStatsResult> {
        return firstValueFrom(
            this.http.get<QuestionStatsResult>('/api/teacher/question-stats', { params: toParams(query as Record<string, unknown>) })
        );
    }

    getQuestionDetail(questionId: string): Promise<QuestionDetail> {
        return firstValueFrom(this.http.get<QuestionDetail>(`/api/teacher/question-stats/${questionId}`));
    }

    overview(): Promise<TeacherOverview> {
        return firstValueFrom(this.http.get<TeacherOverview>('/api/teacher/overview'));
    }
}
