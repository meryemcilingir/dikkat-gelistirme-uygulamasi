import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';

interface AdditionRow {
    id: number;
    symbol: string;
    type: 'triangle' | 'tulip' | 'square';
    leftCount: number;
    rightCount: number;
    correctSum: number;
    userSum: number | null;
}

const ROWS: AdditionRow[] = [
    { id: 1, symbol: '▲', type: 'triangle', leftCount: 3, rightCount: 2, correctSum: 5, userSum: null },
    { id: 2, symbol: '🌷', type: 'tulip',    leftCount: 3, rightCount: 2, correctSum: 5, userSum: null },
    { id: 3, symbol: '■', type: 'square',   leftCount: 3, rightCount: 3, correctSum: 6, userSum: null },
];

interface SymbolAdditionState {
    userSums: (number | null)[];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'symbol-addition';

@Component({
    selector: 'app-symbol-addition',
    standalone: true,
    imports: [CommonModule, FormsModule, ActionButtonsComponent, ActivityHeaderComponent, SharedFeedbackComponent],
    templateUrl: './symbol-addition.component.html',
    styleUrl: './symbol-addition.component.scss',
})
export class SymbolAdditionComponent implements OnInit {
    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) { }

    rows = JSON.parse(JSON.stringify(ROWS));
    feedbackState: 'correct' | 'wrong' | null = null;

    get showHint(): boolean {
        return this.hintService.shouldShowHint(ID);
    }

    get isNextUnlocked(): boolean { return this.feedbackState === 'correct' || this.gs.isCompleted(ID); }

    ngOnInit(): void {
        const saved = this.gs.getData<SymbolAdditionState>(ID);
        if (saved) {
            this.rows.forEach((row: AdditionRow, i: number) => {
                row.userSum = saved.userSums[i];
            });
            this.feedbackState = saved.feedbackState;
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            userSums: this.rows.map((r: AdditionRow) => r.userSum),
            feedbackState: this.feedbackState
        });
    }

    checkAnswer(): void {
        const allAnswered = this.rows.every((r: AdditionRow) => r.userSum !== null);
        if (!allAnswered) {
            this.fb.showFeedback('error', 'Lütfen tüm boşlukları doldurun!');
            return;
        }

        const allCorrect = this.rows.every((r: AdditionRow) => r.userSum === r.correctSum);
        this.feedbackState = allCorrect ? 'correct' : 'wrong';

        if (allCorrect) {
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Tebrikler! Tüm toplama işlemlerini doğru yaptın!');
        } else {
            this.hintService.registerError(ID);
            this.fb.showFeedback('error', 'Bazı sonuçlar yanlış gibi, tekrar kontrol et.');
        }
        this.persist();
    }

    restartActivity(): void {
        this.rows.forEach((r: AdditionRow) => r.userSum = null);
        this.feedbackState = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
        this.persist();
    }

    goPrev(): void { this.router.navigate(['/elephant-direction']); }
    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/grid-coloring-numbers']);
    }

    // Helper to generate array for *ngFor
    getSymbols(count: number): number[] {
        return Array(count).fill(0);
    }
}
