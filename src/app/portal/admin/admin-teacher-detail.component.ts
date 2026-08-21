import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService } from '../../core/services/admin.service';
import { AppUser, StudentWithExam, TeacherStats } from '../../core/models/user.model';
import { QuestionCategoryStat } from '../../core/models/question-stats.model';
import { TeacherDetailStudentsComponent } from './teacher-detail-students/teacher-detail-students.component';

/**
 * Öğretmen detayı — "Bu öğretmenin sorumluluğundaki öğrenciler nasıl
 * gidiyor?" sorusuna cevap verir. KPI + öğrenci performans karşılaştırması +
 * sınav durumu + grubun en çok zorlandığı alanlar + dikkat gerektiren
 * öğrenciler + tam liste. Ayrı bir veri kopyası yok: mevcut
 * admin öğrenci/soru-analizi uç noktaları teacherId ile filtrelenerek
 * kullanılır.
 */
@Component({
    selector: 'app-admin-teacher-detail',
    standalone: true,
    imports: [CommonModule, TeacherDetailStudentsComponent],
    templateUrl: './admin-teacher-detail.component.html',
    styleUrl: './admin-teacher-detail.component.scss',
})
export class AdminTeacherDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private adminApi = inject(AdminService);

    readonly teacher = signal<AppUser | null>(null);
    readonly stats = signal<TeacherStats | null>(null);
    readonly categories = signal<QuestionCategoryStat[]>([]);
    readonly rankedStudents = signal<StudentWithExam[]>([]);
    readonly attentionStudents = signal<StudentWithExam[]>([]);
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);

    teacherId = '';

    async ngOnInit(): Promise<void> {
        this.teacherId = this.route.snapshot.paramMap.get('id')!;
        try {
            const [res, questionStats, ranked, lowScore, inProgress, notStarted] = await Promise.all([
                this.adminApi.getTeacher(this.teacherId),
                this.adminApi.getQuestionStats({ teacherId: this.teacherId, page: 1, pageSize: 1 }),
                this.adminApi.listStudents({ teacherId: this.teacherId, page: 1, pageSize: 6, status: 'Completed', sortBy: 'score', sortDirection: 'asc' }),
                this.adminApi.listStudents({ teacherId: this.teacherId, page: 1, pageSize: 4, status: 'Completed', sortBy: 'score', sortDirection: 'asc' }),
                this.adminApi.listStudents({ teacherId: this.teacherId, page: 1, pageSize: 3, status: 'InProgress', sortBy: 'progress', sortDirection: 'asc' }),
                this.adminApi.listStudents({ teacherId: this.teacherId, page: 1, pageSize: 3, status: 'Assigned' }),
            ]);
            this.teacher.set(res.teacher);
            this.stats.set(res.stats);
            // Kategoriler backend'de avgCorrectRate'e göre azalan geliyor — en zorlanılan (en düşük) üstte olsun diye ters çeviriyoruz.
            this.categories.set([...questionStats.categories].reverse());
            this.rankedStudents.set(ranked.items);

            const seen = new Set<string>();
            const merged: StudentWithExam[] = [];
            for (const s of [...lowScore.items.filter(s => (s.exam.finalScore ?? 100) < 50), ...inProgress.items, ...notStarted.items]) {
                if (seen.has(s.id)) continue;
                seen.add(s.id);
                merged.push(s);
            }
            this.attentionStudents.set(merged.slice(0, 6));
        } catch (err: any) {
            this.error.set(err?.error?.error || 'Öğretmen bilgisi alınamadı.');
        } finally {
            this.loading.set(false);
        }
    }

    categoryBarWidth(avgCorrectRate: number): number {
        return Math.max(avgCorrectRate, 2);
    }

    rankedBarWidth(finalScore: number | null | undefined): number {
        return Math.max(finalScore ?? 0, 2);
    }

    statusLabel(s: StudentWithExam): string {
        if (s.exam.status === 'Completed') return 'Tamamlandı';
        if (s.exam.status === 'InProgress') return 'Devam Ediyor';
        return 'Başlamadı';
    }

    openStudent(s: StudentWithExam): void {
        this.router.navigate(['/admin/students', s.id, 'review'], { queryParams: { from: 'teacher', teacherId: this.teacherId } });
    }

    back(): void {
        this.router.navigate(['/admin/teachers']);
    }
}
