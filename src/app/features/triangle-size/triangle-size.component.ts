import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface Triangle {
    id: number;
    size: number; // Relative size for display
    isLargest: boolean;
    isSmallest: boolean;
    selected: boolean;
}

interface TriangleSizeState {
    selections: boolean[];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'triangle-size';

@Component({
    selector: 'app-triangle-size',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './triangle-size.component.html',
    styleUrl: './triangle-size.component.scss'
})
export class TriangleSizeComponent implements OnInit {
    triangles: Triangle[] = [
        { id: 1, size: 140, isLargest: true, isSmallest: false, selected: false },
        { id: 2, size: 80, isLargest: false, isSmallest: false, selected: false },
        { id: 3, size: 40, isLargest: false, isSmallest: true, selected: false },
        { id: 4, size: 100, isLargest: false, isSmallest: false, selected: false },
        { id: 5, size: 120, isLargest: false, isSmallest: false, selected: false }
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
        const saved = this.gs.getData<TriangleSizeState>(ID);
        if (saved) {
            saved.selections.forEach((s, i) => this.triangles[i].selected = s);
            this.feedbackState = saved.feedbackState;
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            selections: this.triangles.map(t => t.selected),
            feedbackState: this.feedbackState
        });
    }

    toggleSelection(index: number): void {
        if (this.gs.isCompleted(ID) && this.feedbackState === 'correct') return;
        this.triangles[index].selected = !this.triangles[index].selected;
        this.feedbackState = null;
        this.persist();
    }

    clearAll(): void {
        this.triangles.forEach(t => t.selected = false);
        this.feedbackState = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    checkAnswers(): void {
        if (!this.triangles.some(t => t.selected)) {
            this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
            return;
        }

        const selectedIndices = this.triangles
            .map((t, i) => t.selected ? i : -1)
            .filter(i => i !== -1);

        if (selectedIndices.length !== 2) {
            this.fb.showFeedback('error', 'En büyük ve en küçük olmak üzere iki üçgen seçmelisin.');
            return;
        }

        const largestIndex = this.triangles.findIndex(t => t.isLargest);
        const smallestIndex = this.triangles.findIndex(t => t.isSmallest);

        const isCorrect = this.triangles[largestIndex].selected && this.triangles[smallestIndex].selected;

        if (isCorrect) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Harika! Doğru üçgenleri buldun!');
        } else {
            this.feedbackState = 'wrong';
            this.hintService.registerError(ID);
            this.fb.showFeedback('error', 'Yanlış seçim, tekrar deneyelim.');
        }
        this.persist();
    }

    isHintAdd(index: number): boolean {
        if (!this.showHints) return false;
        const t = this.triangles[index];
        return !t.selected && (t.isLargest || t.isSmallest);
    }

    isHintRemove(index: number): boolean {
        if (!this.showHints) return false;
        const t = this.triangles[index];
        return t.selected && !t.isLargest && !t.isSmallest;
    }

    goPrev(): void {
        this.router.navigate(['/box-coloring']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/flower-coloring']);
    }
}
