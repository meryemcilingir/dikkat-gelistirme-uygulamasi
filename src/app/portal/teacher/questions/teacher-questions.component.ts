import { Component } from '@angular/core';
import { QuestionAnalysisComponent } from '../../shared/question-analysis/question-analysis.component';

/** /teacher/questions rotası — Soru Analizi ekranını öğretmen kapsamında gösterir. */
@Component({
    selector: 'app-teacher-questions',
    standalone: true,
    imports: [QuestionAnalysisComponent],
    template: `<app-question-analysis scope="teacher"></app-question-analysis>`,
})
export class TeacherQuestionsComponent {}
