import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface SubtractionProblem {
    id: number;
    emoji: string;
    total: number;
    subtracted: number;
    answer: number;
    text: string;
    userInput: string;
    isShaking: boolean;
    isCorrect: boolean | null;
}

interface FruitSubtractionState {
    inputs: string[];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'fruit-subtraction';

@Component({
    selector: 'app-fruit-subtraction',
    standalone: true,
    imports: [CommonModule, FormsModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './fruit-subtraction.component.html',
    styleUrl: './fruit-subtraction.component.scss'
})
export class FruitSubtractionComponent implements OnInit {

    problems: SubtractionProblem[] = [
        {
            id: 0, emoji: '🍎', total: 5, subtracted: 2, answer: 3,
            text: '5 tane elma var. 2\'sini yedim. Geriye kaç elma kaldı?',
            userInput: '', isShaking: false, isCorrect: null
        },
        {
            id: 1, emoji: '🍌', total: 8, subtracted: 3, answer: 5,
            text: '8 tane muz var. 3\'ünü yedim. Geriye kaç muz kaldı?',
            userInput: '', isShaking: false, isCorrect: null
        },
        {
            id: 2, emoji: '🥚', total: 9, subtracted: 4, answer: 5,
            text: '9 tane yumurta var. 4\'ü kırıldı. Geriye kaç yumurta kaldı?',
            userInput: '', isShaking: false, isCorrect: null
        },
    ];

    feedbackState: 'correct' | 'wrong' | null = null;

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) {}

    get showHint(): boolean {
        return this.hintService.shouldShowHint(ID);
    }

    get isNextUnlocked(): boolean {
        return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
    }

    totalArray(n: number): number[] {
        return Array.from({ length: n }, (_, i) => i);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<FruitSubtractionState>(ID);
        if (saved?.inputs) {
            saved.inputs.forEach((val, i) => {
                if (this.problems[i]) this.problems[i].userInput = val;
            });
            this.feedbackState = saved.feedbackState ?? null;
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            inputs: this.problems.map(p => p.userInput),
            feedbackState: this.feedbackState,
        });
    }

    onInput(): void {
        this.feedbackState = null;
        this.problems.forEach(p => p.isCorrect = null);
        this.persist();
    }

    checkAnswer(): void {
        const allFilled = this.problems.every(p => String(p.userInput).trim() !== '');
        if (!allFilled) {
            this.fb.showFeedback('error', 'Lütfen tüm kutucukları doldurun.');
            return;
        }

        let allCorrect = true;
        this.problems.forEach(p => {
            const val = parseInt(String(p.userInput).trim(), 10);
            if (val === p.answer) {
                p.isCorrect = true;
            } else {
                p.isCorrect = false;
                p.isShaking = true;
                allCorrect = false;
                setTimeout(() => {
                    p.isShaking = false;
                    p.userInput = '';
                    p.isCorrect = null;
                }, 600);
            }
        });

        if (allCorrect) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Harika! Tüm işlemleri doğru yaptın!');
        } else {
            this.feedbackState = 'wrong';
            this.hintService.registerError(ID);
            this.fb.showFeedback('error', 'Bazı cevaplar yanlış. Tekrar dene!');
        }
        this.persist();
    }

    clearSelection(): void {
        this.problems.forEach(p => {
            p.userInput = '';
            p.isShaking = false;
            p.isCorrect = null;
        });
        this.feedbackState = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    goPrev(): void {
        this.router.navigate(['/letter-color-match']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/triangle-match']);
    }
}
