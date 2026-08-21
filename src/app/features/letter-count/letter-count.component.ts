import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface LetterCountQuestion {
    id: number;
    target: string;
    letters: string[];
    answer: number;
    options: number[];
    selectedAnswer: number | null;
    color: string;
}

interface SavedState {
    answers: (number | null)[];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'letter-count';

const QUESTIONS: Omit<LetterCountQuestion, 'selectedAnswer'>[] = [
    {
        id: 0,
        target: 'b',
        letters: ['b', 'd', 'b', 'q', 'p', 'b', 'd', 'b', 'p', 'q', 'b', 'd'],
        answer: 5,
        options: [4, 5, 6, 7],
        color: '#f9a825',
    },
    {
        id: 1,
        target: 'm',
        letters: ['m', 'n', 'm', 'w', 'm', 'u', 'n', 'm', 'w', 'm', 'u', 'm'],
        answer: 6,
        options: [5, 6, 7, 8],
        color: '#66bb6a',
    },
    {
        id: 2,
        target: 's',
        letters: ['s', 'z', '5', 's', '8', 's', 'z', '5', 's', 'z', 's', '8'],
        answer: 5,
        options: [4, 5, 6, 7],
        color: '#42a5f5',
    },
];


@Component({
    selector: 'app-letter-count',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './letter-count.component.html',
    styleUrl: './letter-count.component.scss',
})
export class LetterCountComponent implements OnInit {
    questions: LetterCountQuestion[] = this.createFreshQuestions();
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

    private createFreshQuestions(): LetterCountQuestion[] {
        return QUESTIONS.map(q => ({ ...q, selectedAnswer: null }));
    }

    private persist(): void {
        this.gs.save(ID, {
            answers: this.questions.map(q => q.selectedAnswer),
            feedbackState: this.feedbackState,
        });
    }

    selectAnswer(question: LetterCountQuestion, option: number): void {
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
            this.fb.showFeedback('success', 'Harika! Bütün harfleri doğru saydın! 🎯');
        } else {
            this.hintService.registerError(ID);
            this.feedbackState = 'wrong';

            if (this.showHint) {
                this.questions.forEach(q => {
                    if (q.selectedAnswer !== q.answer) q.selectedAnswer = null;
                });
            }

            this.fb.showFeedback('error', 'Bazı sayımlar hatalı, tekrar saymayı dene!');
        }
        this.persist();
    }

    goPrev(): void { this.router.navigate(['/mirror-letter']); }
    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/first-letter-match']);
    }
}
