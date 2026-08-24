import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuestionAnalysisComponent } from '../../shared/question-analysis/question-analysis.component';
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

    setTab(t: Tab): void {
        this.tab.set(t);
    }

    /** Analiz sekmesindeki "Dikkat Gerektirenler" / "Soru Başarı Dağılımı" — Sorular sekmesini başarı oranına göre sıralı açar. */
    viewQuestionsSorted(direction: 'asc' | 'desc'): void {
        this.questionsSortBy.set('correctRate');
        this.questionsSortDirection.set(direction);
        this.tab.set('questions');
    }
}
