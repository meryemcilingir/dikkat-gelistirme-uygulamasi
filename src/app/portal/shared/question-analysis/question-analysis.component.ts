import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TeacherService } from '../../../core/services/teacher.service';
import { AdminService } from '../../../core/services/admin.service';
import {
    QuestionDetail,
    QuestionStat,
    QuestionStatsQuery,
    QuestionStatsResult,
} from '../../../core/models/question-stats.model';
import { QUESTION_SORT_PRESETS, presetIndexFor } from '../../../core/models/sort-presets';
import { questionTitle } from '../../../core/models/question-titles';
import { PaginationComponent } from '../pagination/pagination.component';

const PAGE_SIZE = 25;

/**
 * Soru Analizi — öğretmen kendi öğrencilerinin, yönetici sistem genelinin
 * TAMAMLANMIŞ sınavları üzerinden 150 sorunun istatistiğini görür.
 * Ayrı bir veri kopyası yok: answers/exam_attempts tablolarından hesaplanan
 * mevcut API (`/api/{teacher,admin}/question-stats`) üzerinden okunur.
 */
@Component({
    selector: 'app-question-analysis',
    standalone: true,
    imports: [CommonModule, FormsModule, PaginationComponent],
    templateUrl: './question-analysis.component.html',
    styleUrl: './question-analysis.component.scss',
})
export class QuestionAnalysisComponent implements OnInit {
    /** 'teacher' → kendi öğrencileri; 'admin' → sistem geneli. */
    @Input() scope: 'teacher' | 'admin' = 'teacher';

    private teacherApi = inject(TeacherService);
    private adminApi = inject(AdminService);
    private router = inject(Router);

    readonly sortPresets = QUESTION_SORT_PRESETS;
    readonly result = signal<QuestionStatsResult | null>(null);
    readonly loading = signal(false);

    readonly selected = signal<QuestionDetail | null>(null);
    readonly detailLoading = signal(false);
    readonly detailTab = signal<'wrong' | 'correct'>('wrong');

    /** Üstteki "en çok zorlanılan" özeti, ana tablonun sort/sayfa durumundan bağımsız — hep gerçek en kötü 5 soru. */
    readonly topHardest = signal<QuestionStat[]>([]);

    query: QuestionStatsQuery = {
        page: 1, pageSize: PAGE_SIZE, sortBy: 'wrongCount', sortDirection: 'desc',
    };

    async ngOnInit(): Promise<void> {
        const [, hardest] = await Promise.all([
            this.reload(1),
            this.api().getQuestionStats({ page: 1, pageSize: 5, sortBy: 'wrongCount', sortDirection: 'desc' }),
        ]);
        this.topHardest.set(hardest.items.filter(q => q.answered > 0));
    }

    private api() {
        return this.scope === 'admin' ? this.adminApi : this.teacherApi;
    }

    async reload(page?: number): Promise<void> {
        if (page) this.query.page = page;
        this.loading.set(true);
        try {
            this.result.set(await this.api().getQuestionStats(this.query));
        } finally {
            this.loading.set(false);
        }
    }

    get sortIndex(): number {
        return presetIndexFor(this.sortPresets, this.query.sortBy, this.query.sortDirection);
    }
    set sortIndex(i: number) {
        const preset = this.sortPresets[i];
        if (!preset) return;
        this.query.sortBy = preset.sortBy;
        this.query.sortDirection = preset.sortDirection;
        this.reload(1);
    }

    async openDetail(q: QuestionStat): Promise<void> {
        this.detailLoading.set(true);
        this.selected.set(null);
        this.detailTab.set('wrong');
        try {
            this.selected.set(await this.api().getQuestionDetail(q.questionId));
        } finally {
            this.detailLoading.set(false);
        }
    }

    closeDetail(): void {
        this.selected.set(null);
    }

    goToStudentReview(studentId: string): void {
        const base = this.scope === 'admin' ? '/admin/students' : '/teacher/students';
        this.router.navigate([base, studentId, 'review']);
    }

    title(questionId: string): string {
        return questionTitle(questionId);
    }

    /** Toplam cevaplanmış soru sayısı — kategori özetleri sayfalamadan bağımsız TÜM soruları kapsar. */
    get totalAnsweredQuestions(): number {
        return (this.result()?.categories ?? []).reduce((s, c) => s + c.questionCount, 0);
    }

    /** Kategori bazlı ağırlıklı ortalama başarı (gerçek per-kategori verilerden hesaplanır, uydurma yok). */
    get weightedAvgCorrectRate(): number | null {
        const categories = this.result()?.categories ?? [];
        const totalQ = categories.reduce((s, c) => s + c.questionCount, 0);
        if (!totalQ) return null;
        const sum = categories.reduce((s, c) => s + c.avgCorrectRate * c.questionCount, 0);
        return Math.round(sum / totalQ);
    }

    /** Kategoriler backend'de avgCorrectRate'e göre azalan sıralı geliyor — son eleman en zorlanılan. */
    get hardestCategory(): { category: string; avgCorrectRate: number } | null {
        const categories = this.result()?.categories ?? [];
        return categories.length ? categories[categories.length - 1] : null;
    }

    hbarWidth(wrongRate: number): number {
        const max = Math.max(...this.topHardest().map(q => q.wrongRate), 1);
        return Math.round((wrongRate / max) * 100);
    }
}
