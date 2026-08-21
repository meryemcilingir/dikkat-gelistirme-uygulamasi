import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
    AppUser,
    PagedResult,
    StudentQuery,
    StudentWithExam,
    TeacherQuery,
    TeacherStats,
    TeacherWithCount,
} from '../models/user.model';
import { TeacherExamReview } from '../models/exam.model';
import { QuestionDetail, QuestionStatsQuery, QuestionStatsResult } from '../models/question-stats.model';

export interface CreateTeacherPayload {
    firstName: string;
    lastName: string;
    username: string;
    password: string;
}

export interface ScoreDistribution {
    range0_25: number;
    range26_50: number;
    range51_75: number;
    range76_100: number;
}

export interface CorrectWrongTotals {
    correct: number;
    wrong: number;
}

export interface RecentActivityItem {
    studentId: string;
    firstName: string;
    lastName: string;
    completedAt: string;
    finalScore: number | null;
}

export interface AdminOverview {
    teacherCount: number;
    activeTeacherCount: number;
    studentCount: number;
    activeStudentCount: number;
    teachersWithNoCompletions: number;
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
export class AdminService {
    private http = inject(HttpClient);

    // ── Öğretmenler ───────────────────────────────────────
    listTeachers(query: TeacherQuery = {}): Promise<PagedResult<TeacherWithCount>> {
        return firstValueFrom(
            this.http.get<{ teachers: TeacherWithCount[] } & Omit<PagedResult<never>, 'items'>>(
                '/api/admin/teachers',
                { params: toParams(query as Record<string, unknown>) }
            )
        ).then(r => ({
            items: r.teachers,
            total: r.total,
            page: r.page,
            pageSize: r.pageSize,
            totalPages: r.totalPages,
        }));
    }

    getTeacher(id: string): Promise<{ teacher: AppUser; stats: TeacherStats }> {
        return firstValueFrom(
            this.http.get<{ teacher: AppUser; stats: TeacherStats }>(`/api/admin/teachers/${id}`)
        );
    }

    createTeacher(payload: CreateTeacherPayload): Promise<AppUser> {
        return firstValueFrom(this.http.post<{ user: AppUser }>('/api/admin/teachers', payload))
            .then(r => r.user);
    }

    updateTeacher(id: string, patch: Partial<CreateTeacherPayload & { active: boolean }>): Promise<AppUser> {
        return firstValueFrom(this.http.patch<{ user: AppUser }>(`/api/admin/teachers/${id}`, patch))
            .then(r => r.user);
    }

    // ── Öğrenciler ────────────────────────────────────────
    listStudents(query: StudentQuery = {}): Promise<PagedResult<StudentWithExam>> {
        return firstValueFrom(
            this.http.get<{ students: StudentWithExam[] } & Omit<PagedResult<never>, 'items'>>(
                '/api/admin/students',
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

    updateStudent(id: string, patch: Partial<CreateTeacherPayload & { active: boolean }>): Promise<AppUser> {
        return firstValueFrom(this.http.patch<{ user: AppUser }>(`/api/admin/students/${id}`, patch))
            .then(r => r.user);
    }

    getStudentExam(studentId: string): Promise<TeacherExamReview> {
        return firstValueFrom(this.http.get<TeacherExamReview>(`/api/admin/students/${studentId}/exam`));
    }

    // ── Genel bakış ───────────────────────────────────────
    overview(): Promise<AdminOverview> {
        return firstValueFrom(this.http.get<AdminOverview>('/api/admin/overview'));
    }

    // ── Soru analizi ────────────────────────────────────────
    getQuestionStats(query: QuestionStatsQuery = {}): Promise<QuestionStatsResult> {
        return firstValueFrom(
            this.http.get<QuestionStatsResult>('/api/admin/question-stats', { params: toParams(query as Record<string, unknown>) })
        );
    }

    getQuestionDetail(questionId: string, teacherId?: string): Promise<QuestionDetail> {
        return firstValueFrom(
            this.http.get<QuestionDetail>(`/api/admin/question-stats/${questionId}`, { params: toParams({ teacherId }) })
        );
    }
}
