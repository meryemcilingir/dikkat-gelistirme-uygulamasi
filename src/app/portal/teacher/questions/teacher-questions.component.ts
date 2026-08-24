import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuestionAnalysisComponent } from '../../shared/question-analysis/question-analysis.component';
import { QuestionRateFilter } from '../../../core/models/question-stats.model';
import { TeacherQuestionListComponent } from './teacher-question-list.component';

type Tab = 'questions' | 'analysis';

/**
 * /teacher/questions — admin'in "Sorular" ekranıyla aynı mantık, iki sekme:
 * Sorular (150 sorunun tamamı, kendi öğrencilerinin istatistikleriyle,
 * salt-okunur) · Analiz (mevcut Soru Analizi). Admin'den farkı: kategori
 * yönetimi / aktif-pasif / soru ekleme YOK — öğretmen soru bankasını
 * yönetmez, yalnızca görür ve "Sınavda Gör" ile inceler.
 */
@Component({
    selector: 'app-teacher-questions',
    standalone: true,
    imports: [CommonModule, TeacherQuestionListComponent, QuestionAnalysisComponent],
    templateUrl: './teacher-questions.component.html',
    styleUrl: './teacher-questions.component.scss',
})
export class TeacherQuestionsComponent {
    readonly tab = signal<Tab>('questions');
    readonly questionsSortBy = signal<'questionIndex' | 'wrongCount' | 'correctCount' | 'correctRate'>('questionIndex');
    readonly questionsSortDirection = signal<'asc' | 'desc'>('asc');
    readonly questionsRateMin = signal<number | null>(null);
    readonly questionsRateMax = signal<number | null>(null);
    readonly questionsNoData = signal(false);

    setTab(t: Tab): void {
        this.tab.set(t);
    }

    /** "Soru Başarı Dağılımı" çubuğu — Sorular sekmesini başarı oranına göre sıralı açar (filtre yok, yalnızca sıralama). */
    viewQuestionsSorted(direction: 'asc' | 'desc'): void {
        this.questionsSortBy.set('correctRate');
        this.questionsSortDirection.set(direction);
        this.questionsRateMin.set(null);
        this.questionsRateMax.set(null);
        this.questionsNoData.set(false);
        this.tab.set('questions');
    }

    /** "Dikkat Gerektirenler" satırı — Sorular sekmesini o satırın başarı-aralığı filtresiyle açar. */
    viewFilteredQuestions(filter: QuestionRateFilter): void {
        this.questionsRateMin.set(filter.correctRateMin ?? null);
        this.questionsRateMax.set(filter.correctRateMax ?? null);
        this.questionsNoData.set(!!filter.noData);
        this.questionsSortBy.set(filter.noData ? 'questionIndex' : 'correctRate');
        this.questionsSortDirection.set('asc');
        this.tab.set('questions');
    }
}
