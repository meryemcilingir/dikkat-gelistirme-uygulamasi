import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AdminService, AdminOverview } from '../../../core/services/admin.service';
import { StudentQuery, TeacherWithCount } from '../../../core/models/user.model';
import { QuestionCategoryStat } from '../../../core/models/question-stats.model';
import { PortalIconComponent } from '../../shared/icon/portal-icon.component';

const DAY_LABEL = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' });
/** Genel Bakış'ta gösterilen en zorlanılan kategori sayısı — kalanı Soru Analizi'nde. */
const TOP_CATEGORY_COUNT = 5;

/**
 * Yönetici paneli — Genel Bakış / operasyon dashboard'u (/admin/overview).
 * "Sistemin tamamında neler oluyor?" sorusuna cevap verir: sistem özeti,
 * dikkat gerektiren durumlar, sınav/başarı dağılımı, en zorlanılan alanlar,
 * öğretmen özeti, son aktiviteler. Kendi verisini kendi çeker; diğer
 * sekmelerle hiçbir state paylaşmaz.
 */
@Component({
    selector: 'app-admin-overview',
    standalone: true,
    imports: [CommonModule, PortalIconComponent],
    templateUrl: './admin-overview.component.html',
    styleUrl: './admin-overview.component.scss',
})
export class AdminOverviewComponent implements OnInit {
    private adminApi = inject(AdminService);
    private router = inject(Router);

    readonly overview = signal<AdminOverview | null>(null);
    readonly categories = signal<QuestionCategoryStat[]>([]);
    readonly teacherSummary = signal<TeacherWithCount[]>([]);
    readonly loading = signal(true);

    async ngOnInit(): Promise<void> {
        const [overview, questionStats, teachers] = await Promise.all([
            this.adminApi.overview(),
            this.adminApi.getQuestionStats({ page: 1, pageSize: 1 }),
            this.adminApi.listTeachers({ page: 1, pageSize: 8, sortBy: 'avgScore', sortDirection: 'asc' }),
        ]);
        this.overview.set(overview);
        // Kategoriler backend'de avgCorrectRate'e göre azalan geliyor — en zorlanılan (en düşük) üstte olsun diye ters çevirip ilk 5'i alıyoruz.
        this.categories.set([...questionStats.categories].reverse().slice(0, TOP_CATEGORY_COUNT));
        this.teacherSummary.set(teachers.items);
        this.loading.set(false);
    }

    get completionRate(): number | null {
        const o = this.overview();
        if (!o || !o.studentCount) return null;
        return Math.round((o.examSummary.completed / o.studentCount) * 100);
    }

    get lowScoreCount(): number {
        return this.overview()?.scoreDistribution.range0_25 ?? 0;
    }

    get hasAttentionItems(): boolean {
        const o = this.overview();
        if (!o) return false;
        return o.examSummary.notStarted > 0 || o.examSummary.inProgress > 0
            || this.lowScoreCount > 0 || o.teachersWithNoCompletions > 0;
    }

    segmentPct(count: number): number {
        const o = this.overview();
        if (!o || !o.studentCount) return 0;
        return Math.round((count / o.studentCount) * 100);
    }

    get scoreDistMax(): number {
        const d = this.overview()?.scoreDistribution;
        if (!d) return 1;
        return Math.max(d.range0_25, d.range26_50, d.range51_75, d.range76_100, 1);
    }
    barWidth(count: number): number { return Math.round((count / this.scoreDistMax) * 100); }

    categoryBarWidth(avgCorrectRate: number): number {
        return Math.max(avgCorrectRate, 2);
    }

    timeAgo(iso: string): string {
        const diffMs = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diffMs / 60000);
        if (mins < 1) return 'az önce';
        if (mins < 60) return `${mins} dk önce`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} sa önce`;
        const days = Math.floor(hours / 24);
        if (days === 1) return 'dün';
        if (days < 7) return `${days} gün önce`;
        return DAY_LABEL.format(new Date(iso));
    }

    viewTeachers(): void {
        this.router.navigate(['/admin/teachers']);
    }

    viewStudents(status?: StudentQuery['status']): void {
        this.router.navigate(['/admin/students'], status ? { queryParams: { status } } : {});
    }

    viewLowScoreStudents(): void {
        this.router.navigate(['/admin/students'], { queryParams: { scoreMax: 25 } });
    }

    openQuestion(): void {
        this.router.navigate(['/admin/questions']);
    }

    openTeacher(t: TeacherWithCount): void {
        this.router.navigate(['/admin/teachers', t.id]);
    }

    openStudent(studentId: string): void {
        this.router.navigate(['/admin/students', studentId, 'review']);
    }
}
