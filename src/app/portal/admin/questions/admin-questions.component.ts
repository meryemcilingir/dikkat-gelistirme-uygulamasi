import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminService, AdminOverview } from '../../../core/services/admin.service';
import { StudentQuery } from '../../../core/models/user.model';
import {
    AdminQuestionDetail,
    AdminQuestionListItem,
    AdminQuestionPage,
    AdminQuestionQuery,
    Category,
} from '../../../core/models/question-admin.model';
import { ADMIN_QUESTION_SORT_PRESETS, presetIndexFor } from '../../../core/models/sort-presets';
import { QuestionRateFilter } from '../../../core/models/question-stats.model';
import { catColor } from '../../../core/models/category-color';
import { PaginationComponent } from '../../shared/pagination/pagination.component';
import { FloatingMenuDirective } from '../../shared/floating-menu.directive';
import { PortalIconComponent } from '../../shared/icon/portal-icon.component';
import { QuestionAnalysisComponent } from '../../shared/question-analysis/question-analysis.component';
import { QuestionPreviewService } from '../../../core/services/question-preview.service';

const PAGE_SIZE = 25;
const TOTAL_QUESTIONS = 150;

type Tab = 'overview' | 'questions' | 'categories' | 'analysis';

/**
 * Sorular (/admin/questions) — soru bankasının tek yönetim ekranı, 4 sekme:
 * Genel Bakış (özet/dağılım) · Sorular (arama/filtre/kategori atama/aktif-pasif/
 * taslak) · Kategoriler (kategori yönetimi) · Analiz (mevcut Soru Analizi
 * ekranı, gömülü olarak).
 *
 * ÖNEMLİ: sorunun kendi interaktif içeriği (görsel/mantık) src/app/features
 * altındaki 150 component'ten gelir ve HİÇ değişmez/üretilmez — burada
 * yalnızca kategori ataması, aktif/pasif durumu ve taslak başlığı yönetilir
 * (bkz. server/src/db.js "SINAV YÖNETİMİ" bölümü).
 */
@Component({
    selector: 'app-admin-questions',
    standalone: true,
    imports: [CommonModule, FormsModule, PaginationComponent, PortalIconComponent, QuestionAnalysisComponent, FloatingMenuDirective],
    templateUrl: './admin-questions.component.html',
    styleUrl: './admin-questions.component.scss',
})
export class AdminQuestionsComponent implements OnInit {
    private adminApi = inject(AdminService);
    private router = inject(Router);
    private preview = inject(QuestionPreviewService);

    readonly tab = signal<Tab>('overview');
    readonly totalQuestions = TOTAL_QUESTIONS;
    readonly sortPresets = ADMIN_QUESTION_SORT_PRESETS;

    // ── Genel Bakış ──────────────────────────────────────────
    readonly overview = signal<AdminOverview | null>(null);
    readonly overviewLoading = signal(true);

    // ── Sorular ──────────────────────────────────────────────
    readonly questionPage = signal<AdminQuestionPage | null>(null);
    readonly questionsLoading = signal(false);
    readonly categories = signal<Category[]>([]);
    readonly showFilters = signal(false);

    query: AdminQuestionQuery = {
        page: 1, pageSize: PAGE_SIZE, search: '', categoryId: '', active: '',
        correctRateMin: null, correctRateMax: null, noData: undefined,
        sortBy: 'index', sortDirection: 'asc',
    };

    readonly selectedQuestion = signal<AdminQuestionDetail | null>(null);
    readonly questionDetailLoading = signal(false);
    readonly editingQuestion = signal(false);
    editCategoryId = '';
    editTitle = '';
    readonly editSaving = signal(false);
    readonly editError = signal<string | null>(null);

    readonly showCreateQuestion = signal(false);
    newQuestionTitle = '';
    newQuestionCategoryId = '';
    readonly createQuestionSaving = signal(false);
    readonly createQuestionError = signal<string | null>(null);

    readonly openMenuId = signal<string | null>(null);

    private readonly search$ = new Subject<void>();

    // ── Kategoriler ──────────────────────────────────────────
    readonly categoriesLoading = signal(false);
    readonly showCreateCategory = signal(false);
    newCategoryName = '';
    readonly createCategorySaving = signal(false);
    readonly createCategoryError = signal<string | null>(null);

    readonly editingCategory = signal<Category | null>(null);
    editCategoryName = '';
    readonly categorySaving = signal(false);
    readonly categoryError = signal<string | null>(null);
    readonly categoryDeleteError = signal<string | null>(null);

    constructor() {
        this.search$.pipe(debounceTime(300), takeUntilDestroyed())
            .subscribe(() => this.reloadQuestions(1));
    }

    async ngOnInit(): Promise<void> {
        await Promise.all([this.loadOverview(), this.loadCategories()]);
    }

    setTab(t: Tab): void {
        this.tab.set(t);
        if (t === 'questions' && !this.questionPage()) this.reloadQuestions(1);
    }

    /** "Soru Başarı Dağılımı" çubuğu — Sorular sekmesini başarı oranına göre sıralı açar (filtre yok, yalnızca sıralama). */
    viewQuestionsSorted(direction: 'asc' | 'desc'): void {
        this.query.sortBy = 'correctRate';
        this.query.sortDirection = direction;
        this.tab.set('questions');
        this.reloadQuestions(1);
    }

    /** "Dikkat Gerektirenler" satırı — Sorular sekmesini o satırın başarı-aralığı filtresiyle açar. */
    viewFilteredQuestions(filter: QuestionRateFilter): void {
        this.query.search = '';
        this.query.categoryId = '';
        this.query.active = '';
        this.query.correctRateMin = filter.correctRateMin ?? null;
        this.query.correctRateMax = filter.correctRateMax ?? null;
        this.query.noData = filter.noData || undefined;
        this.query.sortBy = filter.noData ? 'index' : 'correctRate';
        this.query.sortDirection = 'asc';
        this.tab.set('questions');
        this.reloadQuestions(1);
    }

    clearRateFilter(): void {
        this.query.correctRateMin = null;
        this.query.correctRateMax = null;
        this.query.noData = undefined;
        this.reloadQuestions(1);
    }

    /** Filtre çipinde gösterilecek etiket (bkz. viewFilteredQuestions). */
    get rateFilterLabel(): string | null {
        if (this.query.noData) return 'Yeterli veri yok';
        const { correctRateMin, correctRateMax } = this.query;
        if (correctRateMin == null && correctRateMax == null) return null;
        if (correctRateMin == null) return `Başarı: %${correctRateMax} ve altı`;
        if (correctRateMax == null) return `Başarı: %${correctRateMin} ve üzeri`;
        return `Başarı: %${correctRateMin}–${correctRateMax}`;
    }

    private async loadOverview(): Promise<void> {
        this.overview.set(await this.adminApi.overview());
        this.overviewLoading.set(false);
    }

    private async loadCategories(): Promise<void> {
        this.categories.set(await this.adminApi.listCategories());
    }

    /** Genel Bakış'ta başarı oranına göre azalan sıralı kategori dağılımı. */
    get categoriesByRate(): Category[] {
        return [...this.categories()].sort((a, b) => (b.avgCorrectRate ?? -1) - (a.avgCorrectRate ?? -1));
    }

    get maxCategoryQuestionCount(): number {
        return Math.max(...this.categories().map(c => c.questionCount), 1);
    }

    get completionRate(): number | null {
        const o = this.overview();
        if (!o || !o.studentCount) return null;
        return Math.round((o.examSummary.completed / o.studentCount) * 100);
    }

    segmentPct(count: number): number {
        const o = this.overview();
        if (!o || !o.studentCount) return 0;
        return Math.round((count / o.studentCount) * 100);
    }

    /** Kategori noktası rengi — admin/öğretmen "Sorular" ekranlarında ortak (bkz. category-color.ts). */
    catColor = catColor;

    // ── Sorular: liste ───────────────────────────────────────
    async reloadQuestions(page?: number): Promise<void> {
        if (page) this.query.page = page;
        this.questionsLoading.set(true);
        try {
            this.questionPage.set(await this.adminApi.listQuestionsAdmin(this.query));
        } finally {
            this.questionsLoading.set(false);
        }
    }

    onSearchInput(): void { this.search$.next(); }

    get sortIndex(): number {
        return presetIndexFor(this.sortPresets, this.query.sortBy, this.query.sortDirection);
    }
    set sortIndex(i: number) {
        const preset = this.sortPresets[i];
        if (!preset) return;
        this.query.sortBy = preset.sortBy;
        this.query.sortDirection = preset.sortDirection;
        this.reloadQuestions(1);
    }

    toggleFilters(event: MouseEvent): void {
        event.stopPropagation();
        this.showFilters.update(v => !v);
    }

    clearFilters(): void {
        this.query.search = '';
        this.query.categoryId = '';
        this.query.active = '';
        this.query.correctRateMin = null;
        this.query.correctRateMax = null;
        this.query.noData = undefined;
        this.reloadQuestions(1);
    }

    get activeFilterCount(): number {
        return (this.query.categoryId ? 1 : 0) + (this.query.active ? 1 : 0) + (this.rateFilterLabel ? 1 : 0);
    }

    get hasActiveFilters(): boolean {
        return !!(this.query.search || this.query.categoryId || this.query.active || this.rateFilterLabel);
    }

    categoryName(id: string | null | undefined): string {
        if (!id) return '';
        return this.categories().find(c => c.id === id)?.name ?? '';
    }

    statusLabel(item: AdminQuestionListItem): string {
        if (item.isDraft) return 'Taslak';
        return item.active ? 'Aktif' : 'Pasif';
    }

    statusKind(item: AdminQuestionListItem): 'active' | 'passive' | 'draft' {
        if (item.isDraft) return 'draft';
        return item.active ? 'active' : 'passive';
    }

    // ── Sorular: detay drawer ────────────────────────────────
    async openDetail(item: AdminQuestionListItem): Promise<void> {
        this.editingQuestion.set(false);
        this.questionDetailLoading.set(true);
        this.selectedQuestion.set(null);
        try {
            this.selectedQuestion.set(await this.adminApi.getQuestionAdminDetail(item.questionId));
        } finally {
            this.questionDetailLoading.set(false);
        }
    }

    closeDetail(): void {
        this.selectedQuestion.set(null);
        this.editingQuestion.set(false);
        this.editError.set(null);
    }

    @HostListener('document:keydown.escape')
    onEscape(): void {
        if (this.selectedQuestion() || this.questionDetailLoading()) this.closeDetail();
    }

    startEditQuestion(): void {
        const d = this.selectedQuestion();
        if (!d) return;
        this.editCategoryId = d.categoryId ?? '';
        this.editTitle = d.title ?? '';
        this.editError.set(null);
        this.editingQuestion.set(true);
    }

    async openDetailForEdit(item: AdminQuestionListItem): Promise<void> {
        await this.openDetail(item);
        this.startEditQuestion();
    }

    cancelEditQuestion(): void {
        this.editingQuestion.set(false);
        this.editError.set(null);
    }

    async saveQuestionEdit(): Promise<void> {
        const d = this.selectedQuestion();
        if (!d) return;
        if (this.editTitle.trim().length < 3) {
            this.editError.set('Başlık en az 3 karakter olmalıdır.');
            return;
        }
        this.editSaving.set(true);
        this.editError.set(null);
        try {
            const updated = await this.adminApi.updateQuestionMeta(d.questionId, {
                categoryId: this.editCategoryId || null,
                title: this.editTitle.trim(),
            });
            this.selectedQuestion.set(updated);
            this.editingQuestion.set(false);
            await Promise.all([this.reloadQuestions(), this.loadCategories()]);
        } catch (err: any) {
            this.editError.set(err?.error?.error || 'Güncellenemedi.');
        } finally {
            this.editSaving.set(false);
        }
    }

    // ── Sorular: satır işlemleri ──────────────────────────────
    toggleMenu(id: string, event: MouseEvent): void {
        event.stopPropagation();
        this.openMenuId.set(this.openMenuId() === id ? null : id);
    }

    async toggleActive(item: AdminQuestionListItem): Promise<void> {
        this.openMenuId.set(null);
        await this.adminApi.updateQuestionMeta(item.questionId, { active: !item.active });
        await this.reloadQuestions();
        if (this.selectedQuestion()?.questionId === item.questionId) {
            this.selectedQuestion.set(await this.adminApi.getQuestionAdminDetail(item.questionId));
        }
    }

    async deleteDraft(item: AdminQuestionListItem): Promise<void> {
        this.openMenuId.set(null);
        if (!confirm(`"${item.title}" taslağını silmek istediğinize emin misiniz?`)) return;
        await this.adminApi.deleteDraftQuestion(item.questionId);
        if (this.selectedQuestion()?.questionId === item.questionId) this.closeDetail();
        await this.reloadQuestions();
    }

    /**
     * Sorunun projedeki gerçek, canlı sayfasına gider (admin bu rotalara
     * serbestçe girebilir). Bu rotaların kendi geri dönüş kontrolü olmadığı
     * için QuestionPreviewService, dönüşte bu sayfaya (veya filtrelenmiş
     * hâline) geri gelinmesini sağlayan sabit bir "← Sorulara Dön" butonu
     * gösterir (bkz. app.html app-question-preview-banner).
     */
    openLiveView(questionId: string): void {
        this.preview.enter(['/admin/questions']);
        this.router.navigate(['/', questionId]);
    }

    @HostListener('document:click')
    closeMenus(): void {
        this.openMenuId.set(null);
        this.showFilters.set(false);
    }

    // ── Sorular: yeni taslak ──────────────────────────────────
    toggleCreateQuestion(): void {
        const next = !this.showCreateQuestion();
        this.showCreateQuestion.set(next);
        if (next) {
            this.newQuestionTitle = '';
            this.newQuestionCategoryId = '';
            this.createQuestionError.set(null);
        }
    }

    async createQuestion(): Promise<void> {
        if (this.newQuestionTitle.trim().length < 3) {
            this.createQuestionError.set('Başlık en az 3 karakter olmalıdır.');
            return;
        }
        this.createQuestionSaving.set(true);
        this.createQuestionError.set(null);
        try {
            await this.adminApi.createDraftQuestion({
                title: this.newQuestionTitle.trim(),
                categoryId: this.newQuestionCategoryId || null,
            });
            this.showCreateQuestion.set(false);
            await this.reloadQuestions(1);
        } catch (err: any) {
            this.createQuestionError.set(err?.error?.error || 'Soru oluşturulamadı.');
        } finally {
            this.createQuestionSaving.set(false);
        }
    }

    // ── Kategoriler ────────────────────────────────────────────
    async reloadCategories(): Promise<void> {
        this.categoriesLoading.set(true);
        try {
            this.categories.set(await this.adminApi.listCategories());
        } finally {
            this.categoriesLoading.set(false);
        }
    }

    toggleCreateCategory(): void {
        const next = !this.showCreateCategory();
        this.showCreateCategory.set(next);
        if (next) {
            this.newCategoryName = '';
            this.createCategoryError.set(null);
        }
    }

    async createCategory(): Promise<void> {
        if (this.newCategoryName.trim().length < 2) {
            this.createCategoryError.set('Kategori adı en az 2 karakter olmalıdır.');
            return;
        }
        this.createCategorySaving.set(true);
        this.createCategoryError.set(null);
        try {
            await this.adminApi.createCategory(this.newCategoryName.trim());
            this.showCreateCategory.set(false);
            await this.reloadCategories();
        } catch (err: any) {
            this.createCategoryError.set(err?.error?.error || 'Kategori oluşturulamadı.');
        } finally {
            this.createCategorySaving.set(false);
        }
    }

    startEditCategory(c: Category, event?: MouseEvent): void {
        event?.stopPropagation();
        this.editingCategory.set(c);
        this.editCategoryName = c.name;
        this.categoryError.set(null);
    }

    cancelEditCategory(): void {
        this.editingCategory.set(null);
        this.categoryError.set(null);
    }

    async saveCategoryEdit(): Promise<void> {
        const c = this.editingCategory();
        if (!c) return;
        if (this.editCategoryName.trim().length < 2) {
            this.categoryError.set('Kategori adı en az 2 karakter olmalıdır.');
            return;
        }
        this.categorySaving.set(true);
        this.categoryError.set(null);
        try {
            await this.adminApi.renameCategory(c.id, this.editCategoryName.trim());
            this.editingCategory.set(null);
            await this.reloadCategories();
        } catch (err: any) {
            this.categoryError.set(err?.error?.error || 'Güncellenemedi.');
        } finally {
            this.categorySaving.set(false);
        }
    }

    /** Native confirm() yerine — çıkış onayıyla aynı kart tarzı modal (bkz. şablon sonu). */
    readonly confirmingCategoryDelete = signal<Category | null>(null);

    requestRemoveCategory(c: Category, event?: MouseEvent): void {
        event?.stopPropagation();
        this.categoryDeleteError.set(null);
        this.confirmingCategoryDelete.set(c);
    }

    cancelRemoveCategory(): void {
        this.confirmingCategoryDelete.set(null);
    }

    async confirmRemoveCategory(): Promise<void> {
        const c = this.confirmingCategoryDelete();
        if (!c) return;
        this.confirmingCategoryDelete.set(null);
        try {
            await this.adminApi.deleteCategory(c.id);
            await this.reloadCategories();
        } catch (err: any) {
            this.categoryDeleteError.set(err?.error?.error || 'Kategori silinemedi.');
        }
    }

    viewCategoryQuestions(c: Category): void {
        this.query.categoryId = c.id;
        this.query.search = '';
        this.query.active = '';
        this.tab.set('questions');
        this.reloadQuestions(1);
    }

    // ── Ortak ──────────────────────────────────────────────────
    viewStudents(status?: StudentQuery['status']): void {
        this.router.navigate(['/admin/students'], status ? { queryParams: { status } } : {});
    }
}
