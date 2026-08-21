import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface OrderingSet {
    id: number;
    numbers: number[]; // Original scrambled
    pool: number[];    // Current available
    slots: (number | null)[]; // Current placed
    correctOrder: number[];
    color: string;
}

interface SavedState {
    sets: { pool: number[], slots: (number | null)[] }[];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'number-ordering';

const DATA = [
    { id: 0, numbers: [7, 2, 9, 1, 5], color: '#fbc02d' },
    { id: 1, numbers: [12, 4, 18, 9, 15], color: '#8e24aa' },
    { id: 2, numbers: [25, 11, 40, 2, 33], color: '#00897b' },
];

@Component({
    selector: 'app-number-ordering',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './number-ordering.component.html',
    styleUrl: './number-ordering.component.scss',
})
export class NumberOrderingComponent implements OnInit {
    sets: OrderingSet[] = this.createFresh();
    feedbackState: 'correct' | 'wrong' | null = null;

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService,
    ) { }

    get showHint(): boolean { return this.hintService.shouldShowHint(ID); }
    get isNextUnlocked(): boolean {
        return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<SavedState>(ID);
        if (saved) {
            this.feedbackState = saved.feedbackState;
            saved.sets.forEach((s, i) => {
                if (this.sets[i]) {
                    this.sets[i].pool = [...s.pool];
                    this.sets[i].slots = [...s.slots];
                }
            });
        }
    }

    private createFresh(): OrderingSet[] {
        return DATA.map(d => ({
            ...d,
            pool: [...d.numbers],
            slots: new Array(d.numbers.length).fill(null),
            correctOrder: [...d.numbers].sort((a, b) => a - b)
        }));
    }

    private persist(): void {
        this.gs.save(ID, {
            sets: this.sets.map(s => ({ pool: s.pool, slots: s.slots })),
            feedbackState: this.feedbackState
        });
    }

    moveToSlot(set: OrderingSet, num: number, poolIndex: number): void {
        if (this.feedbackState === 'correct') return;
        const firstEmpty = set.slots.indexOf(null);
        if (firstEmpty !== -1) {
            set.slots[firstEmpty] = num;
            set.pool.splice(poolIndex, 1);
            this.feedbackState = null;
            this.persist();
        }
    }

    removeFromSlot(set: OrderingSet, slotIndex: number): void {
        if (this.feedbackState === 'correct') return;
        const num = set.slots[slotIndex];
        if (num !== null) {
            set.pool.push(num);
            set.slots[slotIndex] = null;
            // Re-order slots to fill gaps (optional, but cleaner)
            const remaining = set.slots.filter(s => s !== null);
            set.slots = [...remaining, ...new Array(set.numbers.length - remaining.length).fill(null)];
            this.feedbackState = null;
            this.persist();
        }
    }

    clearAll(): void {
        this.sets = this.createFresh();
        this.feedbackState = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    checkAnswers(): void {
        const allPlaced = this.sets.every(s => s.slots.every(val => val !== null));
        if (!allPlaced) {
            this.fb.showFeedback('error', 'Lütfen sayıları sıralayın!');
            return;
        }

        const allCorrect = this.sets.every(s =>
            s.slots.every((val, i) => val === s.correctOrder[i])
        );

        if (allCorrect) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Harika! Bütün sayıları doğru sıraladın! 🔢');
        } else {
            this.hintService.registerError(ID);
            this.feedbackState = 'wrong';

            if (this.showHint) {
                this.sets.forEach(s => {
                    s.slots.forEach((val, i) => {
                        if (val !== null && val !== s.correctOrder[i]) {
                            s.pool.push(val);
                            s.slots[i] = null;
                        }
                    });
                    // Re-align
                    const remaining = s.slots.filter(v => v !== null);
                    s.slots = [...remaining, ...new Array(s.numbers.length - remaining.length).fill(null)];
                });
            }

            this.fb.showFeedback('error', 'Bazı sıralamalar hatalı, tekrar dene!');
        }
        this.persist();
    }

    goPrev(): void { this.router.navigate(['/count-difference']); }
    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/rotate-shape']);
    }
}
