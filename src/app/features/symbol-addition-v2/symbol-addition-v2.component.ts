import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActivityService } from '../../core/services/activity.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';

interface AdditionRowV2 {
    id: number;
    symbol: string;
    type: 'triangle' | 'tulip' | 'circle';
    leftCount: number;
    rightCount: number;
    correctSum: number;
    userSum: number | null;
}

const ROWS_V2: AdditionRowV2[] = [
    { id: 1, symbol: '▲', type: 'triangle', leftCount: 4, rightCount: 1, correctSum: 5, userSum: null },
    { id: 2, symbol: '🌷', type: 'tulip',    leftCount: 2, rightCount: 4, correctSum: 6, userSum: null },
    { id: 3, symbol: '●', type: 'circle',   leftCount: 4, rightCount: 4, correctSum: 8, userSum: null },
];

interface SymbolAdditionV2State {
    userSums: (number | null)[];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'symbol-addition-v2';

@Component({
    selector: 'app-symbol-addition-v2',
    standalone: true,
    imports: [CommonModule, FormsModule, ActionButtonsComponent, ActivityHeaderComponent, SharedFeedbackComponent],
    templateUrl: './symbol-addition-v2.component.html',
    styleUrl: './symbol-addition-v2.component.scss',
})
export class SymbolAdditionV2Component implements OnInit {
    private gs = inject(GameStateService);
    private fb = inject(FeedbackService);
    private hintService = inject(HintService);
    private activityService = inject(ActivityService);

    rows = JSON.parse(JSON.stringify(ROWS_V2));
    feedbackState: 'correct' | 'wrong' | null = null;

    get showHint(): boolean {
        return this.hintService.shouldShowHint(ID);
    }

    get isNextUnlocked(): boolean { return this.feedbackState === 'correct' || this.gs.isCompleted(ID); }

    ngOnInit(): void {
        const saved = this.gs.getData<SymbolAdditionV2State>(ID);
        if (saved) {
            this.rows.forEach((row: AdditionRowV2, i: number) => {
                row.userSum = saved.userSums[i];
            });
            this.feedbackState = saved.feedbackState;
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            userSums: this.rows.map((r: AdditionRowV2) => r.userSum),
            feedbackState: this.feedbackState
        });
    }

    onCheck(): void {
        const allAnswered = this.rows.every((r: AdditionRowV2) => r.userSum !== null);
        if (!allAnswered) {
            this.fb.showFeedback('error', 'Lütfen tüm boşlukları doldurun!');
            return;
        }

        const allCorrect = this.rows.every((r: AdditionRowV2) => r.userSum === r.correctSum);
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

    onReset(): void {
        this.rows.forEach((r: AdditionRowV2) => r.userSum = null);
        this.feedbackState = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
        this.persist();
    }

    prev(): void { this.activityService.prev(); }
    next(): void {
        if (!this.isNextUnlocked) return;
        this.activityService.next();
    }

    getSymbols(count: number): number[] {
        return Array(count).fill(0);
    }
}
