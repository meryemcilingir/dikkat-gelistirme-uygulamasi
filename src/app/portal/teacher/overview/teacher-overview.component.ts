import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TeacherService, TeacherOverview } from '../../../core/services/teacher.service';
import { StudentWithExam } from '../../../core/models/user.model';
import { QuestionCategoryStat } from '../../../core/models/question-stats.model';
import { PortalIconComponent } from '../../shared/icon/portal-icon.component';

/** Genel Bakış'ta gösterilen en zorlanılan kategori sayısı — kalanı Soru Analizi'nde. */
const TOP_CATEGORY_COUNT = 5;

/**
 * Öğretmen paneli — Genel Bakış sayfası (/teacher/overview). "Benim
 * öğrencilerim nasıl gidiyor ve kime müdahale etmem gerekiyor?" sorusuna
 * cevap verir — admin'in sistem geneli özetinin kopyası DEĞİL: müdahale
 * gereken öğrenciler tek bir listede öne çıkar, öğretmen karşılaştırma
 * tablosu yok. Yalnızca kendi öğrencilerinin verisinden hesaplanır.
 */
@Component({
    selector: 'app-teacher-overview',
    standalone: true,
    imports: [CommonModule, PortalIconComponent],
    templateUrl: './teacher-overview.component.html',
    styleUrl: './teacher-overview.component.scss',
})
export class TeacherOverviewComponent implements OnInit {
    private teacherApi = inject(TeacherService);
    private router = inject(Router);

    readonly overview = signal<TeacherOverview | null>(null);
    readonly categories = signal<QuestionCategoryStat[]>([]);
    readonly completedExams = signal<StudentWithExam[]>([]);
    readonly attentionStudents = signal<StudentWithExam[]>([]);
    readonly loading = signal(true);

    async ngOnInit(): Promise<void> {
        const [overview, questionStats, completed, lowScore, inProgress, notStarted] = await Promise.all([
            this.teacherApi.overview(),
            this.teacherApi.getQuestionStats({ page: 1, pageSize: 1 }),
            this.teacherApi.listStudents({ page: 1, pageSize: 6, status: 'Completed' }),
            this.teacherApi.listStudents({ page: 1, pageSize: 4, status: 'Completed', sortBy: 'score', sortDirection: 'asc' }),
            this.teacherApi.listStudents({ page: 1, pageSize: 3, status: 'InProgress', sortBy: 'progress', sortDirection: 'asc' }),
            this.teacherApi.listStudents({ page: 1, pageSize: 3, status: 'Assigned' }),
        ]);
        this.overview.set(overview);
        // Kategoriler backend'de avgCorrectRate'e göre azalan geliyor — en zorlanılan (en düşük) üstte olsun diye ters çevirip ilk 5'i alıyoruz.
        this.categories.set([...questionStats.categories].reverse().slice(0, TOP_CATEGORY_COUNT));
        this.completedExams.set(completed.items);

        // Müdahale gereken öğrenciler: düşük başarı + yarım kalan + hiç başlamamış — tek listede, öncelik sırasına göre.
        const seen = new Set<string>();
        const merged: StudentWithExam[] = [];
        for (const s of [...lowScore.items.filter(s => (s.exam.finalScore ?? 100) < 50), ...inProgress.items, ...notStarted.items]) {
            if (seen.has(s.id)) continue;
            seen.add(s.id);
            merged.push(s);
        }
        this.attentionStudents.set(merged.slice(0, 6));

        this.loading.set(false);
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

    statusLabel(s: StudentWithExam): string {
        if (s.exam.status === 'Completed') return 'Tamamlandı';
        if (s.exam.status === 'InProgress') return 'Devam Ediyor';
        return 'Başlamadı';
    }

    /** "72/150 · Devam ediyor" / "24/150 · Düşük sonuç" / "Başlamadı" — öğrenci burada neden listeleniyor. */
    attentionReason(s: StudentWithExam): string {
        if (s.exam.status === 'Assigned') return 'Başlamadı';
        if (s.exam.status === 'InProgress') return `${s.exam.answered}/${s.exam.total} · Devam ediyor`;
        return `${s.exam.correctCount}/${s.exam.total} · Düşük sonuç`;
    }

    /** Düşük sonuçla tamamlayanlar daha acil (danger); henüz başlamamış/yarım kalanlar (warning). */
    attentionSeverity(s: StudentWithExam): 'danger' | 'warning' {
        return s.exam.status === 'Completed' ? 'danger' : 'warning';
    }

    /** "46 dk 18 sn" / "18 sn" formatında gösterir; süre kaydı olmayan eski sonuçlarda "—". */
    formatDuration(seconds: number | null | undefined): string {
        if (seconds === null || seconds === undefined) return '—';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins === 0) return `${secs} sn`;
        return `${mins} dk ${secs} sn`;
    }

    viewStudents(): void {
        this.router.navigate(['/teacher/students']);
    }

    /** Başarı dağılımı grafiğindeki bir sütuna tıklanınca o puan aralığındaki öğrencilere gider. */
    viewStudentsByScore(min: number, max: number): void {
        this.router.navigate(['/teacher/students'], { queryParams: { scoreMin: min, scoreMax: max } });
    }

    openQuestion(): void {
        this.router.navigate(['/teacher/questions']);
    }

    openStudent(s: StudentWithExam): void {
        this.router.navigate(['/teacher/students', s.id, 'review']);
    }
}
