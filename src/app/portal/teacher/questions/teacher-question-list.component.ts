import { Component, Input, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TeacherService } from '../../../core/services/teacher.service';
import { QuestionStat, QuestionStatsQuery } from '../../../core/models/question-stats.model';
import { QUESTION_SORT_PRESETS, presetIndexFor } from '../../../core/models/sort-presets';
import { questionTitle } from '../../../core/models/question-titles';
import { catColor } from '../../../core/models/category-color';
import { PortalIconComponent } from '../../shared/icon/portal-icon.component';
import { PaginationComponent } from '../../shared/pagination/pagination.component';
import { QuestionDetailPanelComponent } from '../../shared/question-detail-panel/question-detail-panel.component';

type SortKey = NonNullable<QuestionStatsQuery['sortBy']>;

/**
 * Öğretmen tarafı "Sorular" — admin'in Sorular sekmesiyle aynı mantık,
 * salt-okunur: 150 sorunun TAMAMI, kendi öğrencilerinin istatistikleriyle
 * (aynı /api/teacher/question-stats — Analiz ekranıyla aynı gerçek kaynak).
 * Öğretmen soru bankasını YÖNETMEZ (kategori/aktif-pasif admin'de kalır) —
 * yalnızca arayıp, sıralayıp, bir soruya tıklayınca detayını ve "Sınavda
 * Gör" ile gerçek sınav ekranını görebilir.
 */
@Component({
    selector: 'app-teacher-question-list',
    standalone: true,
    imports: [CommonModule, FormsModule, PaginationComponent, PortalIconComponent, QuestionDetailPanelComponent],
    templateUrl: './teacher-question-list.component.html',
    styleUrl: './teacher-question-list.component.scss',
})
export class TeacherQuestionListComponent implements OnInit {
    private teacherApi = inject(TeacherService);

    @ViewChild('detailPanel') detailPanel!: QuestionDetailPanelComponent;

    /** Analiz sekmesindeki "Dikkat Gerektirenler" / dağılım çubuğundan gelindiğinde başlangıç sıralaması. */
    @Input() initialSortBy: SortKey = 'questionIndex';
    @Input() initialSortDirection: 'asc' | 'desc' = 'asc';

    /** Analiz sekmesindeki "Dikkat Gerektirenler" satırından gelindiğinde başlangıç başarı-aralığı filtresi. */
    @Input() initialRateMin: number | null = null;
    @Input() initialRateMax: number | null = null;
    @Input() initialNoData = false;

    readonly loading = signal(true);
    readonly allQuestions = signal<QuestionStat[]>([]);
    readonly sortPresets = QUESTION_SORT_PRESETS;

    search = '';
    private sortBy: SortKey = 'questionIndex';
    private sortDirection: 'asc' | 'desc' = 'asc';

    rateMin: number | null = null;
    rateMax: number | null = null;
    noDataFilter = false;

    readonly page = signal(1);
    readonly pageSize = signal(25);

    async ngOnInit(): Promise<void> {
        this.sortBy = this.initialSortBy;
        this.sortDirection = this.initialSortDirection;
        this.rateMin = this.initialRateMin;
        this.rateMax = this.initialRateMax;
        this.noDataFilter = this.initialNoData;
        this.loading.set(true);
        try {
            const res = await this.teacherApi.getQuestionStats({ page: 1, pageSize: 150, sortBy: 'questionIndex', sortDirection: 'asc' });
            this.allQuestions.set(res.items);
        } finally {
            this.loading.set(false);
        }
    }

    get sortIndex(): number {
        return presetIndexFor(this.sortPresets, this.sortBy, this.sortDirection);
    }
    set sortIndex(i: number) {
        const preset = this.sortPresets[i];
        if (!preset) return;
        this.sortBy = preset.sortBy;
        this.sortDirection = preset.sortDirection;
        this.page.set(1);
    }

    onSearchInput(): void {
        this.page.set(1);
    }

    /** Filtre çipinde gösterilecek etiket (bkz. teacher-questions.component.ts viewFilteredQuestions). */
    get rateFilterLabel(): string | null {
        if (this.noDataFilter) return 'Yeterli veri yok';
        if (this.rateMin === null && this.rateMax === null) return null;
        if (this.rateMin === null) return `Başarı: %${this.rateMax} ve altı`;
        if (this.rateMax === null) return `Başarı: %${this.rateMin} ve üzeri`;
        return `Başarı: %${this.rateMin}–${this.rateMax}`;
    }

    clearRateFilter(): void {
        this.rateMin = null;
        this.rateMax = null;
        this.noDataFilter = false;
        this.page.set(1);
    }

    private get filteredSorted(): QuestionStat[] {
        const term = this.search.trim().toLowerCase();
        let items = this.allQuestions();
        if (term) {
            items = items.filter(q =>
                this.title(q.questionId).toLowerCase().includes(term) ||
                q.category.toLowerCase().includes(term)
            );
        }
        if (this.noDataFilter) {
            items = items.filter(q => q.answered === 0);
        } else {
            if (this.rateMin !== null) items = items.filter(q => q.answered > 0 && q.correctRate >= this.rateMin!);
            if (this.rateMax !== null) items = items.filter(q => q.answered > 0 && q.correctRate <= this.rateMax!);
        }
        const key = this.sortBy;
        const dir = this.sortDirection === 'asc' ? 1 : -1;
        const valueOf = (q: QuestionStat): number => {
            switch (key) {
                case 'wrongCount': return q.wrong;
                case 'correctCount': return q.correct;
                case 'correctRate': return q.correctRate;
                default: return q.questionIndex ?? 0;
            }
        };
        return [...items].sort((a, b) => (valueOf(a) - valueOf(b)) * dir);
    }

    get total(): number {
        return this.filteredSorted.length;
    }

    get totalPages(): number {
        return Math.max(Math.ceil(this.total / this.pageSize()), 1);
    }

    get pagedItems(): QuestionStat[] {
        const start = (this.page() - 1) * this.pageSize();
        return this.filteredSorted.slice(start, start + this.pageSize());
    }

    onPageChange(p: number): void {
        this.page.set(p);
    }

    onPageSizeChange(size: number): void {
        this.pageSize.set(size);
        this.page.set(1);
    }

    title(questionId: string): string {
        return questionTitle(questionId);
    }

    openDetail(q: QuestionStat): void {
        this.detailPanel.open(q.questionId);
    }

    /** Admin'in "Sorular" tablosuyla aynı görsel dil (bkz. category-color.ts). */
    catColor = catColor;

    statusLabel(q: QuestionStat): string {
        return q.active ? 'Aktif' : 'Pasif';
    }

    statusKind(q: QuestionStat): 'active' | 'passive' {
        return q.active ? 'active' : 'passive';
    }
}
