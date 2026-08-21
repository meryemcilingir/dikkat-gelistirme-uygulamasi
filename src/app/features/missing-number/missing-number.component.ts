import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface MissingNumberQuestion {
    id: number;
    sequence: (number | null)[]; // null = boş/eksik
    missingIndex: number;
    answer: number;
    options: number[];
    selectedOption: number | null;
    color: string;
}

interface SavedState {
    selections: (number | null)[];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'missing-number';

const QUESTIONS: Omit<MissingNumberQuestion, 'selectedOption'>[] = [
    {
        id: 0,
        sequence: [2, 4, null, 8, 10],
        missingIndex: 2,
        answer: 6,
        options: [5, 6, 7, 9],
        color: '#f9a825',
    },
    {
        id: 1,
        sequence: [10, 20, 30, null, 50],
        missingIndex: 3,
        answer: 40,
        options: [35, 40, 45, 55],
        color: '#66bb6a',
    },
    {
        id: 2,
        sequence: [1, null, 3, 4, 5],
        missingIndex: 1,
        answer: 2,
        options: [1, 2, 6, 7],
        color: '#42a5f5',
    },
    {
        id: 3,
        sequence: [3, 6, 9, null, 15],
        missingIndex: 3,
        answer: 12,
        options: [10, 11, 12, 13],
        color: '#ab47bc',
    },
];


@Component({
    selector: 'app-missing-number',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './missing-number.component.html',
    styleUrl: './missing-number.component.scss',
})
export class MissingNumberComponent implements OnInit {
    questions: MissingNumberQuestion[] = this.createFreshQuestions();
    feedbackState: 'correct' | 'wrong' | null = null;

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService,
    ) {}

    get showHint(): boolean {
        return this.hintService.shouldShowHint(ID);
    }

    get isNextUnlocked(): boolean {
        return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<SavedState>(ID);
        if (saved) {
            this.feedbackState = saved.feedbackState;
            saved.selections.forEach((sel, i) => {
                if (this.questions[i]) this.questions[i].selectedOption = sel;
            });
        }
    }

    private createFreshQuestions(): MissingNumberQuestion[] {
        return QUESTIONS.map(q => ({ ...q, selectedOption: null }));
    }

    private persist(): void {
        this.gs.save(ID, {
            selections: this.questions.map(q => q.selectedOption),
            feedbackState: this.feedbackState,
        });
    }

    selectOption(question: MissingNumberQuestion, option: number): void {
        if (this.feedbackState === 'correct') return;
        question.selectedOption = option;
        this.feedbackState = null;
        this.persist();
    }

    clearAll(): void {
        this.questions = this.createFreshQuestions();
        this.feedbackState = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    checkAnswers(): void {
        const allSelected = this.questions.every(q => q.selectedOption !== null);
        if (!allSelected) {
            this.fb.showFeedback('error', 'Lütfen önce bir seçim yapın!');
            return;
        }

        const allCorrect = this.questions.every(q => q.selectedOption === q.answer);

        if (allCorrect) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Tebrikler! Eksik sayıları doğru buldun! 🎉');
        } else {
            this.hintService.registerError(ID);
            this.feedbackState = 'wrong';

            if (this.showHint) {
                this.questions.forEach(q => {
                    if (q.selectedOption !== q.answer) q.selectedOption = null;
                });
            }

            this.fb.showFeedback('error', 'Bazı yanıtlar yanlış, tekrar dene!');
        }
        this.persist();
    }

    goPrev(): void { this.router.navigate(['/letter-hunt']); }
    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/odd-category-out']);
    }
}
