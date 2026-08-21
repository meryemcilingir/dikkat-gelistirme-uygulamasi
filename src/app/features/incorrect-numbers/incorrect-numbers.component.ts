import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface GameNumber {
    id: number;
    value: number;
    color: string;
    isFlipped: boolean;
    isSelected: boolean;
}

interface NumbersState {
    selections: number[];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'incorrect-numbers';

@Component({
    selector: 'app-incorrect-numbers',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './incorrect-numbers.component.html',
    styleUrl: './incorrect-numbers.component.scss'
})
export class IncorrectNumbersComponent implements OnInit {
    numbers: GameNumber[] = [
        { id: 1, value: 3, color: '#4caf8a', isFlipped: true, isSelected: false },
        { id: 2, value: 5, color: '#5b6fa6', isFlipped: false, isSelected: false },
        { id: 3, value: 7, color: '#bf4f6b', isFlipped: true, isSelected: false },
        { id: 4, value: 2, color: '#4caf8a', isFlipped: false, isSelected: false },
        { id: 5, value: 9, color: '#5b6fa6', isFlipped: true, isSelected: false },
        { id: 6, value: 4, color: '#bf4f6b', isFlipped: false, isSelected: false },
        { id: 7, value: 6, color: '#4caf8a', isFlipped: true, isSelected: false },
        { id: 8, value: 5, color: '#5b6fa6', isFlipped: true, isSelected: false },
        { id: 9, value: 8, color: '#bf4f6b', isFlipped: false, isSelected: false },
        { id: 10, value: 3, color: '#4caf8a', isFlipped: false, isSelected: false },
        { id: 11, value: 1, color: '#5b6fa6', isFlipped: false, isSelected: false },
        { id: 12, value: 2, color: '#bf4f6b', isFlipped: true, isSelected: false },
        { id: 13, value: 9, color: '#4caf8a', isFlipped: false, isSelected: false },
        { id: 14, value: 6, color: '#5b6fa6', isFlipped: false, isSelected: false }
    ];

    feedbackState: 'correct' | 'wrong' | null = null;

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) { }

    get showHints(): boolean {
        return this.hintService.shouldShowHint(ID);
    }

    get isNextUnlocked(): boolean {
        return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<NumbersState>(ID);
        if (saved) {
            this.numbers.forEach(n => {
                n.isSelected = saved.selections.includes(n.id);
            });
            this.feedbackState = saved.feedbackState;
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            selections: this.numbers.filter(n => n.isSelected).map(n => n.id),
            feedbackState: this.feedbackState
        });
    }

    toggleSelection(num: GameNumber): void {
        if (this.gs.isCompleted(ID) && this.feedbackState === 'correct') return;
        num.isSelected = !num.isSelected;
        this.feedbackState = null;
        this.persist();
    }

    clearSelections(): void {
        this.numbers.forEach(n => n.isSelected = false);
        this.feedbackState = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    checkAnswers(): void {
        if (!this.numbers.some(n => n.isSelected)) {
            this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
            return;
        }

        let isCorrect = true;
        this.numbers.forEach(n => {
            if (n.isFlipped !== n.isSelected) {
                isCorrect = false;
            }
        });

        this.feedbackState = isCorrect ? 'correct' : 'wrong';

        if (isCorrect) {
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Harika! Doğru yazılmamış bütün sayıları buldun.');
        } else {
            this.hintService.registerError(ID);
            this.fb.showFeedback('error', 'Bazı seçimler yanlış veya eksik, tekrar kontrol et.');
        }
        this.persist();
    }

    isHintAdd(num: GameNumber): boolean {
        if (!this.showHints) return false;
        return num.isFlipped && !num.isSelected;
    }

    isHintRemove(num: GameNumber): boolean {
        if (!this.showHints) return false;
        return !num.isFlipped && num.isSelected;
    }

    goPrev(): void {
        this.router.navigate(['/finding-green-lines']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/water-capacity']);
    }
}
