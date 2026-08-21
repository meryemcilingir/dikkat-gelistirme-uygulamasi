import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface CountRow {
    id: number;
    emoji: string;
    count: number;
    emojiArray: string[];
    options: number[];
    selectedOption: number | null;
}

interface ShapeCountingState {
    selections: (number | null)[];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'shape-counting';

@Component({
    selector: 'app-shape-counting',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './shape-counting.component.html',
    styleUrl: './shape-counting.component.scss'
})
export class ShapeCountingComponent implements OnInit {
    rows: CountRow[] = [
        { id: 1, emoji: '🌹', count: 7, emojiArray: Array(7).fill('🌹'), options: [5, 6, 7, 8], selectedOption: null },
        { id: 2, emoji: '💜', count: 3, emojiArray: Array(3).fill('💜'), options: [3, 4, 5, 6], selectedOption: null },
        { id: 3, emoji: '⚽', count: 8, emojiArray: Array(8).fill('⚽'), options: [5, 6, 7, 8], selectedOption: null },
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
        const saved = this.gs.getData<ShapeCountingState>(ID);
        if (saved) {
            saved.selections.forEach((sel, i) => {
                if (this.rows[i]) this.rows[i].selectedOption = sel;
            });
            this.feedbackState = saved.feedbackState;
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            selections: this.rows.map(r => r.selectedOption),
            feedbackState: this.feedbackState
        });
    }

    selectNumber(rowIdx: number, num: number): void {
        if (this.gs.isCompleted(ID) && this.feedbackState === 'correct') return;
        const row = this.rows[rowIdx];
        row.selectedOption = row.selectedOption === num ? null : num;
        this.feedbackState = null;
        this.persist();
    }

    clearSelections(): void {
        this.rows.forEach(r => r.selectedOption = null);
        this.feedbackState = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    checkAnswers(): void {
        const allSelected = this.rows.every(r => r.selectedOption !== null);
        if (!allSelected) {
            this.fb.showFeedback('error', 'Lütfen her satır için bir sayı seçin.');
            return;
        }

        const isCorrect = this.rows.every(row => row.selectedOption === row.count);

        this.feedbackState = isCorrect ? 'correct' : 'wrong';

        if (isCorrect) {
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Tebrikler! Hepsini doğru saydın!');
        } else {
            this.hintService.registerError(ID);
            this.fb.showFeedback('error', 'Bazı sayılar yanlış. Tekrar say.');
        }
        this.persist();
    }

    isHintCorrect(rowIdx: number, num: number): boolean {
        if (!this.showHints) return false;
        const row = this.rows[rowIdx];
        return num === row.count && row.selectedOption !== num;
    }

    goPrev(): void {
        this.router.navigate(['/pattern-completion']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/happy-children']);
    }
}
