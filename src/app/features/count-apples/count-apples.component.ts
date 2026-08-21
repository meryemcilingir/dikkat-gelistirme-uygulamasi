import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface AppleBox {
    id: number;
    count: number;
    userInput: string;
    isShaking: boolean;
    isCorrect: boolean | null;
}

interface CountApplesState {
    inputs: string[];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'count-apples';

@Component({
    selector: 'app-count-apples',
    standalone: true,
    imports: [CommonModule, FormsModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './count-apples.component.html',
    styleUrl: './count-apples.component.scss'
})
export class CountApplesComponent implements OnInit {

    boxes: AppleBox[] = [
        { id: 0, count: 6, userInput: '', isShaking: false, isCorrect: null },
        { id: 1, count: 8, userInput: '', isShaking: false, isCorrect: null },
        { id: 2, count: 5, userInput: '', isShaking: false, isCorrect: null },
        { id: 3, count: 1, userInput: '', isShaking: false, isCorrect: null },
        { id: 4, count: 9, userInput: '', isShaking: false, isCorrect: null },
        { id: 5, count: 3, userInput: '', isShaking: false, isCorrect: null },
        { id: 6, count: 10, userInput: '', isShaking: false, isCorrect: null },
        { id: 7, count: 4, userInput: '', isShaking: false, isCorrect: null },
    ];

    feedbackState: 'correct' | 'wrong' | null = null;

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) { }

    get showHint(): boolean {
        return this.hintService.shouldShowHint(ID);
    }

    get isNextUnlocked(): boolean {
        return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
    }

    getAppleArray(count: number): number[] {
        return Array.from({ length: count }, (_, i) => i);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<CountApplesState>(ID);
        if (saved?.inputs) {
            saved.inputs.forEach((val, i) => {
                if (this.boxes[i]) this.boxes[i].userInput = val;
            });
            this.feedbackState = saved.feedbackState ?? null;
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            inputs: this.boxes.map(b => b.userInput),
            feedbackState: this.feedbackState,
        });
    }

    onInput(): void {
        this.feedbackState = null;
        this.boxes.forEach(b => b.isCorrect = null);
        this.persist();
    }

    checkAnswer(): void {
        const allFilled = this.boxes.every(b => String(b.userInput).trim() !== '');
        if (!allFilled) {
            this.fb.showFeedback('error', 'Lütfen tüm kutucukları doldurun.');
            return;
        }

        let allCorrect = true;
        this.boxes.forEach(box => {
            const val = parseInt(String(box.userInput).trim(), 10);
            if (val === box.count) {
                box.isCorrect = true;
            } else {
                box.isCorrect = false;
                box.isShaking = true;
                allCorrect = false;
                setTimeout(() => {
                    box.isShaking = false;
                    box.userInput = '';
                    box.isCorrect = null;
                }, 600);
            }
        });

        if (allCorrect) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Harika! Tüm elmaları doğru saydın!');
        } else {
            this.feedbackState = 'wrong';
            this.hintService.registerError(ID);
            this.fb.showFeedback('error', 'Bazı sayılar yanlış. Tekrar say!');
        }
        this.persist();
    }

    clearSelection(): void {
        this.boxes.forEach(b => {
            b.userInput = '';
            b.isShaking = false;
            b.isCorrect = null;
        });
        this.feedbackState = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    goPrev(): void {
        this.router.navigate(['/shape-match-find']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/ball-sequence']);
    }
}
