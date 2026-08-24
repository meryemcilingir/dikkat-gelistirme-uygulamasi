import { Component, EventEmitter, Input, OnInit, Output, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TeacherService } from '../../../core/services/teacher.service';
import { AdminService } from '../../../core/services/admin.service';
import { QuestionStat, QuestionCategoryStat, QuestionRateFilter } from '../../../core/models/question-stats.model';
import { questionTitle } from '../../../core/models/question-titles';
import { QuestionDetailPanelComponent } from '../question-detail-panel/question-detail-panel.component';

/**
 * Soru Analizi — öğretmen kendi öğrencilerinin, yönetici sistem genelinin
 * TAMAMLANMIŞ sınavları üzerinden 150 sorunun PERFORMANS analizini gösterir.
 * Soru YÖNETİMİ (arama/filtre/kategori atama/aktif-pasif) burada yapılmaz —
 * o iş admin tarafında ayrı "Sorular" sekmesinde; bu ekran salt-okunur analitik.
 * Ayrı bir veri kopyası yok: answers/exam_attempts tablolarından hesaplanan
 * mevcut API (`/api/{teacher,admin}/question-stats`) üzerinden okunur.
 */
@Component({
    selector: 'app-question-analysis',
    standalone: true,
    imports: [CommonModule, QuestionDetailPanelComponent],
    templateUrl: './question-analysis.component.html',
    styleUrl: './question-analysis.component.scss',
})
export class QuestionAnalysisComponent implements OnInit {
    /** 'teacher' → kendi öğrencileri; 'admin' → sistem geneli. */
    @Input() scope: 'teacher' | 'admin' = 'teacher';

    /** Başka bir sayfanın sekmesi içinde gösteriliyorsa kendi sayfa başlığını çizmez. */
    @Input() embedded = false;

    /**
     * "Dikkat Gerektirenler" satırlarına veya "Soru Başarı Dağılımı"
     * çubuklarına tıklanınca üst component'e (admin-questions /
     * teacher-questions) "Sorular sekmesine, şu yönde başarı oranına göre
     * sıralı git" sinyali gönderir — hem admin hem öğretmen tarafında.
     */
    @Output() viewQuestionsSorted = new EventEmitter<'asc' | 'desc'>();

    /**
     * "Dikkat Gerektirenler" satırına tıklanınca üst component'e (admin-questions /
     * teacher-questions) "Sorular sekmesine, şu başarı-aralığı filtresiyle git"
     * sinyali gönderir — hem admin hem öğretmen tarafında.
     */
    @Output() viewFilteredQuestions = new EventEmitter<QuestionRateFilter>();

    @ViewChild('detailPanel') detailPanel!: QuestionDetailPanelComponent;

    private teacherApi = inject(TeacherService);
    private adminApi = inject(AdminService);

    readonly loading = signal(true);

    /** Tüm 150 sorunun ham istatistiği (cevaplanmamışlar dahil) — tüm kartlar buradan türetilir. */
    readonly allQuestions = signal<QuestionStat[]>([]);
    readonly categories = signal<QuestionCategoryStat[]>([]);

    /** "Kategori Bazlı Başarı" listesi: true=düşükten yükseğe, false=yüksekten düşüğe. */
    readonly categorySortAsc = signal(true);

    async ngOnInit(): Promise<void> {
        this.loading.set(true);
        try {
            const res = await this.api().getQuestionStats({ page: 1, pageSize: 150, sortBy: 'wrongCount', sortDirection: 'desc' });
            this.allQuestions.set(res.items);
            this.categories.set(res.categories);
        } finally {
            this.loading.set(false);
        }
    }

    private api() {
        return this.scope === 'admin' ? this.adminApi : this.teacherApi;
    }

    openDetail(q: QuestionStat): void {
        this.detailPanel.open(q.questionId);
    }

    title(questionId: string): string {
        return questionTitle(questionId);
    }

    private get answeredQuestions(): QuestionStat[] {
        return this.allQuestions().filter(q => q.answered > 0);
    }

    /** Yalnızca gerçek veriye sahip kategoriler — "veri yok" kategoriler en zor/en başarılı sayılmaz. */
    private get categoriesWithData(): QuestionCategoryStat[] {
        return this.categories().filter(c => c.totalAnswered > 0);
    }

    /** Cevaplanan tüm sorular, en düşük başarı oranından en yükseğe sıralı. */
    get hardestQuestions(): QuestionStat[] {
        return [...this.answeredQuestions].sort((a, b) => a.correctRate - b.correctRate);
    }

    /**
     * "En Çok Zorlanılan Sorular" çubuğunun rengi — başarı oranı aralığına
     * göre (bkz. görev tanımı: %0–25 kırmızı, %26–50 turuncu, %51–75 mor,
     * %76–100 yeşil). Mevcut tasarım paletindeki tokenlarla birebir aynı
     * (bkz. portal-tokens.scss) — TS içinden SCSS değişkenine erişilemediği
     * için hex değerleri burada tekrar edilir.
     */
    rateBarColor(correctRate: number): string {
        if (correctRate <= 25) return '#dc2626'; // $p-danger
        if (correctRate <= 50) return '#d97706'; // $p-warning
        if (correctRate <= 75) return '#4f46e5'; // $p-accent (mor/indigo)
        return '#16a34a'; // $p-success
    }

    get sortedCategories(): QuestionCategoryStat[] {
        const list = this.categories();
        // Backend avgCorrectRate'e göre azalan (yüksekten düşüğe) sıralı veriyor.
        return this.categorySortAsc() ? [...list].reverse() : list;
    }

    toggleCategorySort(): void {
        this.categorySortAsc.update(v => !v);
    }

    /** Toplam cevaplanmış soru sayısı — kategori özetleri üzerinden (mevcut backend alanı). */
    get totalAnsweredQuestions(): number {
        return this.categories().reduce((s, c) => s + c.questionCount, 0);
    }

    /** Kategori bazlı ağırlıklı ortalama başarı — "Genel Başarı" kartında gösterilir. */
    get weightedAvgCorrectRate(): number | null {
        const categories = this.categories();
        const totalQ = categories.reduce((s, c) => s + c.questionCount, 0);
        if (!totalQ) return null;
        const sum = categories.reduce((s, c) => s + c.avgCorrectRate * c.questionCount, 0);
        return Math.round(sum / totalQ);
    }

    get hardestCategory(): QuestionCategoryStat | null {
        const c = this.categoriesWithData;
        return c.length ? c[c.length - 1] : null;
    }

    get mostSuccessfulCategory(): QuestionCategoryStat | null {
        const c = this.categoriesWithData;
        return c.length ? c[0] : null;
    }

    /** "Soru Başarı Dağılımı" — cevaplanmış sorular 4 başarı aralığına ayrılır. */
    get distributionBuckets(): { label: string; min: number; max: number; count: number }[] {
        const buckets = [
            { label: '0–25%', min: 0, max: 25, count: 0 },
            { label: '26–50%', min: 26, max: 50, count: 0 },
            { label: '51–75%', min: 51, max: 75, count: 0 },
            { label: '76–100%', min: 76, max: 100, count: 0 },
        ];
        for (const q of this.answeredQuestions) {
            const bucket = buckets.find(b => q.correctRate >= b.min && q.correctRate <= b.max);
            if (bucket) bucket.count++;
        }
        return buckets;
    }

    get maxDistributionCount(): number {
        return Math.max(...this.distributionBuckets.map(b => b.count), 1);
    }

    /**
     * "Dikkat Gerektirenler" — karşılıklı dışlayan (mutually exclusive) üç
     * grup: aynı soru asla iki satırda birden sayılmaz.
     *  - Kritik: başarı oranı %10 ve altı
     *  - Düşük performanslı: başarı oranı %11–25 (kritik hariç)
     *  - Yeterli veri yok: hiç cevaplanmamış (answered=0) — diğer ikisi zaten
     *    yalnızca cevaplanmış soruları (answeredQuestions) kapsadığı için
     *    bu grupla hiçbir zaman kesişmez.
     */
    get criticalCount(): number {
        return this.answeredQuestions.filter(q => q.correctRate <= 10).length;
    }

    get lowPerformanceCount(): number {
        return this.answeredQuestions.filter(q => q.correctRate > 10 && q.correctRate <= 25).length;
    }

    get noDataCount(): number {
        return this.allQuestions().filter(q => q.answered === 0).length;
    }

    /** "Kritik Sorular" satırı — Sorular sekmesini %10 ve altı filtresiyle açar. */
    onViewCritical(): void {
        this.viewFilteredQuestions.emit({ correctRateMax: 10 });
    }

    /** "Düşük Performanslı Sorular" satırı — Sorular sekmesini %11–25 filtresiyle açar. */
    onViewLowPerformance(): void {
        this.viewFilteredQuestions.emit({ correctRateMin: 11, correctRateMax: 25 });
    }

    /** "Yeterli Veri Olmayan Sorular" satırı — Sorular sekmesini yalnızca cevaplanmamışlarla açar. */
    onViewNoData(): void {
        this.viewFilteredQuestions.emit({ noData: true });
    }

    /**
     * "Soru Başarı Dağılımı" çubuğu — ilgili sorulara götürür. Düşük başarı
     * aralıkları (0-50%) en düşükten, yüksek aralıklar (51-100%) en
     * yüksekten sıralı açılır ki tıklanan çubuğa karşılık gelen sorular
     * listenin başında görünsün.
     */
    onViewBucket(bucket: { max: number }): void {
        this.viewQuestionsSorted.emit(bucket.max <= 50 ? 'asc' : 'desc');
    }
}
