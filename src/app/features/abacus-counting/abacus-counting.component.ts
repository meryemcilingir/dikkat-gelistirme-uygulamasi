import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface AbacusQuestion {
    id: number;
    topBeads: ('g' | 'r')[];
    bottomBeads: ('g' | 'r')[];
    expectedTotal: number;
    input: string | null;
    hasError: boolean;
}

interface AbacusState {
    inputs: (string | null)[];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'abacus-counting';

const INITIAL_QUESTIONS: Omit<AbacusQuestion, 'input' | 'hasError'>[] = [
    { id: 0, topBeads: ['g', 'g', 'g'], bottomBeads: ['r'], expectedTotal: 4 },
    { id: 1, topBeads: ['g', 'g', 'g', 'g'], bottomBeads: ['g', 'g', 'g', 'r'], expectedTotal: 8 },
    { id: 2, topBeads: ['g', 'g', 'g'], bottomBeads: ['g', 'g'], expectedTotal: 5 },
    { id: 3, topBeads: ['g', 'g', 'g', 'g'], bottomBeads: ['g', 'g', 'r'], expectedTotal: 7 },
    { id: 4, topBeads: ['g'], bottomBeads: [], expectedTotal: 1 },
    { id: 5, topBeads: ['g', 'g', 'g', 'g', 'r'], bottomBeads: ['g', 'g', 'g', 'g', 'r'], expectedTotal: 10 },
];

@Component({
    selector: 'app-abacus-counting',
    standalone: true,
    imports: [CommonModule, FormsModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './abacus-counting.component.html',
    styleUrl: './abacus-counting.component.scss'
})
export class AbacusCountingComponent implements OnInit {

    questions: AbacusQuestion[] = this.createFreshQuestions();
    feedbackState: 'correct' | 'wrong' | null = null;
    hasChecked = false;

    mistakeCount = 0; // State for tracking mistakes across checks

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) { }

    get showHint(): boolean {
        // Show placeholders (hints) if hintService indicates, OR if user got it wrong twice
        return this.hintService.shouldShowHint(ID) || this.mistakeCount >= 2;
    }

    get isNextUnlocked(): boolean {
        return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<AbacusState & { mistakeCount?: number }>(ID);
        if (saved) {
            this.feedbackState = saved.feedbackState;
            this.mistakeCount = saved.mistakeCount ?? 0;
            saved.inputs.forEach((v, i) => (this.questions[i].input = v));
            if (this.feedbackState) {
                this.hasChecked = true;
            }
        }
    }

    private createFreshQuestions(): AbacusQuestion[] {
        return INITIAL_QUESTIONS.map(q => ({
            ...q,
            input: null,
            hasError: false
        }));
    }

    private persist(): void {
        this.gs.save(ID, {
            inputs: this.questions.map(q => q.input),
            feedbackState: this.feedbackState,
            mistakeCount: this.mistakeCount
        });
    }

    onInputChange(id: number): void {
        // Enforce numeric only by stripping out non-digit characters
        const q = this.questions.find(x => x.id === id);
        if (q && q.input) {
            q.input = q.input.replace(/\D/g, '');
        }

        this.feedbackState = null;
        this.hasChecked = false;
        this.persist();
    }

    clearAll(): void {
        this.questions = this.createFreshQuestions();
        this.feedbackState = null;
        this.hasChecked = false;
        this.mistakeCount = 0;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    checkAnswers(): void {
        if (this.questions.every(q => q.input === null)) {
            this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
            return;
        }

        let allCorrect = true;
        let anyEmpty = false;

        this.questions.forEach(q => {
            if (!q.input || q.input.trim() === '') {
                anyEmpty = true;
                allCorrect = false;
            } else {
                const isOk = parseInt(q.input, 10) === q.expectedTotal;
                q.hasError = !isOk;
                if (!isOk) allCorrect = false;
            }
        });

        if (anyEmpty && !allCorrect) {
            this.fb.showFeedback('error', 'Lütfen tüm kutucukları doldurun.');
            return;
        }

        this.hasChecked = true;

        if (allCorrect) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Tebrikler! Abaküsteki boncukları doğru saydın!');
        } else {
            this.mistakeCount++;
            this.hintService.registerError(ID);
            this.feedbackState = 'wrong';

            this.questions.forEach(q => {
                if (q.hasError) {
                    setTimeout(() => { q.hasError = false; }, 600);
                }
            });

            if (this.showHint) {
                this.questions.forEach(q => {
                    if (q.hasError) q.input = null; // Clear bad inputs automatically from inputs so placeholder shows
                });
            }
            this.fb.showFeedback('error', 'Bazı cevaplar yanlış. Tekrar saymalısın.');
        }

        this.persist();
    }

    goPrev(): void {
        this.router.navigate(['/traffic-sign-matching']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/dot-pattern-drawing']);
    }
}
