import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface BoxColoringState {
    group2: boolean[];
    group3: boolean[];
    group4: boolean[];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'box-coloring';

@Component({
    selector: 'app-box-coloring',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './box-coloring.component.html',
    styleUrl: './box-coloring.component.scss'
})
export class BoxColoringComponent implements OnInit {
    group1: boolean[] = [];
    group2 = Array(20).fill(false);
    group3 = Array(20).fill(false);
    group4 = Array(20).fill(false);

    readonly target1Arr = this.getTargetArray(12);
    readonly target2Arr = this.getTargetArray(15);
    readonly target3Arr = this.getTargetArray(19);
    readonly target4Arr = this.getTargetArray(8);

    feedbackState: 'correct' | 'wrong' | null = null;
    readonly col1Indices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    readonly col2Indices = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) {
        this.group1 = [...this.target1Arr];
    }

    get showHints(): boolean {
        return this.hintService.shouldShowHint(ID);
    }

    get isNextUnlocked(): boolean {
        return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
    }

    private getTargetArray(target: number): boolean[] {
        const arr = Array(20).fill(false);
        for (let i = 0; i < target; i++) {
            arr[i] = true;
        }
        return arr;
    }

    ngOnInit(): void {
        const saved = this.gs.getData<BoxColoringState>(ID);
        if (saved) {
            this.group2 = [...saved.group2];
            this.group3 = [...saved.group3];
            this.group4 = [...saved.group4];
            this.feedbackState = saved.feedbackState;
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            group2: this.group2,
            group3: this.group3,
            group4: this.group4,
            feedbackState: this.feedbackState
        });
    }

    toggleBox(group: 2 | 3 | 4, index: number): void {
        if (this.gs.isCompleted(ID) && this.feedbackState === 'correct') return;

        if (group === 2) this.group2[index] = !this.group2[index];
        else if (group === 3) this.group3[index] = !this.group3[index];
        else if (group === 4) this.group4[index] = !this.group4[index];

        this.resetFeedback();
    }

    private resetFeedback(): void {
        this.feedbackState = null;
        this.persist();
    }

    clearGrid(): void {
        this.group2.fill(false);
        this.group3.fill(false);
        this.group4.fill(false);
        this.feedbackState = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    checkPattern(): void {
        const g2Selected = this.group2.some(b => b);
        const g3Selected = this.group3.some(b => b);
        const g4Selected = this.group4.some(b => b);
        if (!g2Selected && !g3Selected && !g4Selected) {
            this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
            return;
        }
        if (!g2Selected || !g3Selected || !g4Selected) {
            this.fb.showFeedback('error', 'Lütfen her bloktan en az bir kutu boyayın!');
            return;
        }

        const g2Correct = this.group2.every((val, i) => val === this.target2Arr[i]);
        const g3Correct = this.group3.every((val, i) => val === this.target3Arr[i]);
        const g4Correct = this.group4.every((val, i) => val === this.target4Arr[i]);

        const isCorrect = g2Correct && g3Correct && g4Correct;

        this.feedbackState = isCorrect ? 'correct' : 'wrong';

        if (isCorrect) {
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Harika! Bütün kutuları doğru boyadın!');
        } else {
            this.hintService.registerError(ID);
            this.fb.showFeedback('error', 'Bazı kutular yanlış boyanmış, örnekteki gibi dolduralım.');
        }
        this.persist();
    }

    isGroupCorrect(group: 2 | 3 | 4): boolean {
        if (this.feedbackState !== 'wrong') return true;

        if (group === 2) return this.group2.every((v, i) => v === this.target2Arr[i]);
        if (group === 3) return this.group3.every((v, i) => v === this.target3Arr[i]);
        if (group === 4) return this.group4.every((v, i) => v === this.target4Arr[i]);

        return true;
    }

    isHintAdd(group: 2 | 3 | 4, index: number): boolean {
        if (!this.showHints) return false;
        if (group === 2) return !this.group2[index] && this.target2Arr[index];
        if (group === 3) return !this.group3[index] && this.target3Arr[index];
        if (group === 4) return !this.group4[index] && this.target4Arr[index];
        return false;
    }

    isHintRemove(group: 2 | 3 | 4, index: number): boolean {
        if (!this.showHints) return false;
        if (group === 2) return this.group2[index] && !this.target2Arr[index];
        if (group === 3) return this.group3[index] && !this.target3Arr[index];
        if (group === 4) return this.group4[index] && !this.target4Arr[index];
        return false;
    }

    goPrev(): void {
        this.router.navigate(['/top-view']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/triangle-size']);
    }
}
