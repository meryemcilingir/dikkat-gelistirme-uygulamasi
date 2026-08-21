import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface DiffQuestion {
    id: number;
    emoji: string;
    leftCount: number;
    rightCount: number;
    answer: number;
    options: number[];
    selectedAnswer: number | null;
    color: string;
}

interface SavedState {
    answers: (number | null)[];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'count-difference';

const QUESTIONS: Omit<DiffQuestion, 'selectedAnswer'>[] = [
    {
        id: 0,
        emoji: '🍎',
        leftCount: 7,
        rightCount: 4,
        answer: 3,
        options: [2, 3, 4, 5], // 3 is 2nd
        color: '#ef5350',
    },
    {
        id: 1,
        emoji: '🚗',
        leftCount: 5,
        rightCount: 8,
        answer: 3,
        options: [4, 1, 3, 2], // 3 is 3rd
        color: '#42a5f5',
    },
    {
        id: 2,
        emoji: '🌻',
        leftCount: 9,
        rightCount: 3,
        answer: 6,
        options: [3, 4, 5, 6], // 6 is 4th
        color: '#66bb6a',
    },
];



@Component({
    selector: 'app-count-difference',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './count-difference.component.html',
    styleUrl: './count-difference.component.scss',
})
export class CountDifferenceComponent implements OnInit {
    questions: DiffQuestion[] = this.createFreshQuestions();
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
            saved.answers.forEach((ans, i) => {
                if (this.questions[i]) this.questions[i].selectedAnswer = ans;
            });
        }
    }

    private createFreshQuestions(): DiffQuestion[] {
        return QUESTIONS.map(q => ({ ...q, selectedAnswer: null }));
    }

    private persist(): void {
        this.gs.save(ID, {
            answers: this.questions.map(q => q.selectedAnswer),
            feedbackState: this.feedbackState,
        });
    }

    getArray(n: number): number[] {
        return new Array(n).fill(0);
    }

    selectAnswer(question: DiffQuestion, option: number): void {
        if (this.feedbackState === 'correct') return;
        question.selectedAnswer = option;
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
        const allSelected = this.questions.every(q => q.selectedAnswer !== null);
        if (!allSelected) {
            this.fb.showFeedback('error', 'Lütfen önce cevaplarınızı seçin!');
            return;
        }

        const allCorrect = this.questions.every(q => q.selectedAnswer === q.answer);

        if (allCorrect) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Tebrikler! Sayı farklarını doğru buldun! 🎯');
        } else {
            this.hintService.registerError(ID);
            this.feedbackState = 'wrong';

            if (this.showHint) {
                this.questions.forEach(q => {
                    if (q.selectedAnswer !== q.answer) q.selectedAnswer = null;
                });
            }

            this.fb.showFeedback('error', 'Bazı yanıtlar hatalı, tekrar saymayı dene!');
        }
        this.persist();
    }

    goPrev(): void { this.router.navigate(['/first-letter-match']); }
    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/number-ordering']);
    }
}
