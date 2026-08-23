import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { NumericOnlyDirective } from '../../shared/numeric-only.directive';

interface NumberQuestion {
    id: number;
    centerTarget: number;
    expectedPrev: number;
    expectedNext: number;
    prevInput: string | null;
    nextInput: string | null;
    prevError: boolean;
    nextError: boolean;
}

interface NumberSeqState {
    prevInputs: (string | null)[];
    nextInputs: (string | null)[];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'number-sequence';

const QUESTION_TEMPLATES = [
    { id: 0, centerTarget: 6, expectedPrev: 5, expectedNext: 7 },
    { id: 1, centerTarget: 3, expectedPrev: 2, expectedNext: 4 },
    { id: 2, centerTarget: 9, expectedPrev: 8, expectedNext: 10 },
    { id: 3, centerTarget: 1, expectedPrev: 0, expectedNext: 2 },
    { id: 4, centerTarget: 10, expectedPrev: 9, expectedNext: 11 },
    { id: 5, centerTarget: 12, expectedPrev: 11, expectedNext: 13 },
];

@Component({
    selector: 'app-number-sequence',
    standalone: true,
    imports: [CommonModule, FormsModule, ActionButtonsComponent, ActivityHeaderComponent, NumericOnlyDirective],
    templateUrl: './number-sequence.component.html',
    styleUrl: './number-sequence.component.scss',
})
export class NumberSequenceComponent implements OnInit {
    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) { }

    questions: NumberQuestion[] = this.createFreshQuestions();
    feedbackState: 'correct' | 'wrong' | null = null;

    get showHint(): boolean {
        return this.hintService.shouldShowHint(ID);
    }

    get isNextUnlocked(): boolean {
        return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
    }

    readonly tapeColors = ['#79d9b8', '#f9ca24', '#f0932b', '#e55039', '#6ab04c', '#2980b9'];

    // ── Lifecycle ─────────────────────────────────────────
    ngOnInit(): void {
        const saved = this.gs.getData<NumberSeqState>(ID);
        if (saved) {
            this.feedbackState = saved.feedbackState;
            saved.prevInputs.forEach((v, i) => (this.questions[i].prevInput = v));
            saved.nextInputs.forEach((v, i) => (this.questions[i].nextInput = v));
        }
    }

    private createFreshQuestions(): NumberQuestion[] {
        return QUESTION_TEMPLATES.map(t => ({
            ...t, prevInput: null, nextInput: null, prevError: false, nextError: false,
        }));
    }

    private persist(): void {
        this.gs.save(ID, {
            prevInputs: this.questions.map(q => q.prevInput),
            nextInputs: this.questions.map(q => q.nextInput),
            feedbackState: this.feedbackState
        });
    }

    // ── Etkileşim ─────────────────────────────────────────
    onInputChange(): void {
        this.feedbackState = null;
        this.persist();
    }

    /** Tüm girdi alanını ve ilerlemeyi sıfırlar */
    clearAll(): void {
        this.questions = this.createFreshQuestions();
        this.feedbackState = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    /** Tüm soru yanıtlarını doğrular */
    checkAnswers(): void {
        if (!this.questions.every(q => q.prevInput !== null && q.nextInput !== null)) {
            this.fb.showFeedback('error', 'Lütfen tüm kutucukları doldurun!');
            return;
        }

        let allCorrect = true;
        this.questions.forEach(q => {
            const prevOk = parseInt(q.prevInput ?? '', 10) === q.expectedPrev;
            const nextOk = parseInt(q.nextInput ?? '', 10) === q.expectedNext;
            q.prevError = !prevOk;
            q.nextError = !nextOk;
            if (!prevOk || !nextOk) allCorrect = false;
        });

        if (allCorrect) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Tebrikler! Sayıları doğru yazdın!');
        } else {
            this.hintService.registerError(ID);
            this.feedbackState = 'wrong';

            this.questions.forEach(q => {
                if (q.prevError || q.nextError) {
                    setTimeout(() => { q.prevError = false; q.nextError = false; }, 600);
                }
            });

            if (this.showHint) {
                // Silik ipuçları çıksın diye hatalı olanları temizle
                this.questions.forEach(q => {
                    if (q.prevError) q.prevInput = null;
                    if (q.nextError) q.nextInput = null;
                });
            }
            this.fb.showFeedback('error', 'Tekrar Denemelisin');
        }
        this.persist();
    }

    // ── Navigasyon ────────────────────────────────────────
    goPrev(): void { this.router.navigate(['/shade-sorting']); }
    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/symbol-matching']);
    }
}
