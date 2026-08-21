import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface AdditionProblem {
    id: number;
    emoji: string;
    firstGroup: number;
    secondGroup: number;
    answer: number;
    text: string;
    userInput: string;
    isShaking: boolean;
    isCorrect: boolean | null;
}

interface ObjectAdditionState {
    inputs: string[];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'object-addition';

@Component({
    selector: 'app-object-addition',
    standalone: true,
    imports: [CommonModule, FormsModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './object-addition.component.html',
    styleUrl: './object-addition.component.scss'
})
export class ObjectAdditionComponent implements OnInit {

    problems: AdditionProblem[] = [
        {
            id: 0, emoji: '⭐', firstGroup: 3, secondGroup: 4, answer: 7,
            text: '3 tane yıldız var. 4 tane daha geldi. Toplam kaç yıldız oldu?',
            userInput: '', isShaking: false, isCorrect: null
        },
        {
            id: 1, emoji: '🚗', firstGroup: 5, secondGroup: 3, answer: 8,
            text: '5 tane araba var. 3 tane daha geldi. Toplam kaç araba oldu?',
            userInput: '', isShaking: false, isCorrect: null
        },
        {
            id: 2, emoji: '📚', firstGroup: 4, secondGroup: 5, answer: 9,
            text: '4 tane kitap var. 5 tane daha geldi. Toplam kaç kitap oldu?',
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

    countArray(n: number): number[] {
        return Array.from({ length: n }, (_, i) => i);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<ObjectAdditionState>(ID);
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
        this.router.navigate(['/symbol-color-match']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/symbol-block-match']);
    }
}
