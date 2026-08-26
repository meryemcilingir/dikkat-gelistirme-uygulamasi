import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService } from '../../core/services/admin.service';
import { AppUser, StudentWithExam, TeacherStats } from '../../core/models/user.model';
import { QuestionCategoryStat } from '../../core/models/question-stats.model';
import { TeacherDetailStudentsComponent } from './teacher-detail-students/teacher-detail-students.component';

/** Kart taşmasın diye "Zorlanılan Kategoriler"de gösterilen en fazla kategori sayısı. */
const TOP_CATEGORY_COUNT = 5;

/**
 * Öğretmen detayı — "Bu öğretmenin sorumluluğundaki öğrenciler nasıl
 * gidiyor?" sorusuna cevap verir. Ana içerik "Öğrenci Performansı"
 * (bkz. app-teacher-detail-students — kendi arama/sıralama/sayfalamasıyla,
 * 100+ öğrencide de kullanılabilir); onun altında özet niteliğinde zorlanılan
 * kategoriler + sınav durumu + dikkat gerektiren öğrenciler. Ayrı bir veri
 * kopyası yok: mevcut admin öğrenci/soru-analizi uç noktaları teacherId ile
 * filtrelenerek kullanılır.
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
    /** Dashboard = özet + top N + "Tümünü Gör" — kart kontrolsüz uzamasın. */
    readonly attentionStudents = signal<StudentWithExam[]>([]);
    readonly attentionTotal = signal(0);
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);

    teacherId = '';
    private static readonly ATTENTION_DISPLAY_COUNT = 5;

    async ngOnInit(): Promise<void> {
        this.teacherId = this.route.snapshot.paramMap.get('id')!;
        try {
            const [res, questionStats, lowScore, inProgress, notStarted] = await Promise.all([
                this.adminApi.getTeacher(this.teacherId),
                this.adminApi.getQuestionStats({ teacherId: this.teacherId, page: 1, pageSize: 1 }),
                // scoreMax:49 sunucu tarafında filtrelenir — hem gösterilen öğrenciler hem de
                // "toplam düşük başarılı" sayısı (lowScore.total) buna göre doğru gelir.
                this.adminApi.listStudents({ teacherId: this.teacherId, page: 1, pageSize: 4, status: 'Completed', scoreMax: 49, sortBy: 'score', sortDirection: 'asc' }),
                this.adminApi.listStudents({ teacherId: this.teacherId, page: 1, pageSize: 3, status: 'InProgress', sortBy: 'progress', sortDirection: 'asc' }),
                this.adminApi.listStudents({ teacherId: this.teacherId, page: 1, pageSize: 3, status: 'Assigned' }),
            ]);
            this.teacher.set(res.teacher);
            this.stats.set(res.stats);
            // Kategoriler backend'de avgCorrectRate'e göre azalan geliyor — en zorlanılan (en düşük) üstte olsun diye ters çevirip ilk 5'i alıyoruz.
            this.categories.set([...questionStats.categories].reverse().slice(0, TOP_CATEGORY_COUNT));

            const seen = new Set<string>();
            const merged: StudentWithExam[] = [];
            for (const s of [...lowScore.items, ...inProgress.items, ...notStarted.items]) {
                if (seen.has(s.id)) continue;
                seen.add(s.id);
                merged.push(s);
            }
            this.attentionStudents.set(merged.slice(0, AdminTeacherDetailComponent.ATTENTION_DISPLAY_COUNT));
            // Üç durum (Completed düşük puan / InProgress / Assigned) birbirini dışlar, toplamları basitçe toplamak çakışma yaratmaz.
            this.attentionTotal.set(lowScore.total + inProgress.total + notStarted.total);
        } catch (err: any) {
            this.error.set(err?.error?.error || 'Öğretmen bilgisi alınamadı.');
        } finally {
            this.loading.set(false);
        }
    }

    viewAttentionStudents(): void {
        this.router.navigate(['/admin/students'], { queryParams: { teacherId: this.teacherId } });
    }

    /** "Sınav Durumu" satırı — bu öğretmenin, o duruma sahip öğrencilerine gider. */
    viewByStatus(status: 'Completed' | 'InProgress' | 'Assigned'): void {
        this.router.navigate(['/admin/students'], { queryParams: { teacherId: this.teacherId, status } });
    }

    /** "Zorlanılan Kategoriler" satırı — o kategoriye filtrelenmiş Sorular sekmesine gider. */
    viewCategory(c: QuestionCategoryStat): void {
        this.router.navigate(['/admin/questions'], { queryParams: { category: c.category } });
    }

    categoryBarWidth(avgCorrectRate: number): number {
        return Math.max(avgCorrectRate, 2);
    }

    attentionReason(s: StudentWithExam): string {
        if (s.exam.status === 'Assigned') return 'Başlamadı';
        if (s.exam.status === 'InProgress') return `${s.exam.answered}/${s.exam.total} · Devam ediyor`;
        return `${s.exam.correctCount}/${s.exam.total} · Başarı %${s.exam.finalScore}`;
    }

    attentionSeverity(s: StudentWithExam): 'danger' | 'warning' {
        return s.exam.status === 'Completed' ? 'danger' : 'warning';
    }

    openStudent(s: StudentWithExam): void {
        this.router.navigate(['/admin/students', s.id, 'review'], { queryParams: { from: 'teacher', teacherId: this.teacherId } });
    }

    back(): void {
        this.router.navigate(['/admin/teachers']);
    }
}
