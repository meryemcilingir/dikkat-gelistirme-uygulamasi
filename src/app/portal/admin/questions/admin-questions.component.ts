import { Component } from '@angular/core';
import { QuestionAnalysisComponent } from '../../shared/question-analysis/question-analysis.component';

/** /admin/questions rotası — Soru Analizi ekranını admin kapsamında gösterir. */
@Component({
    selector: 'app-admin-questions',
    standalone: true,
    imports: [QuestionAnalysisComponent],
    template: `<app-question-analysis scope="admin"></app-question-analysis>`,
})
export class AdminQuestionsComponent {}
