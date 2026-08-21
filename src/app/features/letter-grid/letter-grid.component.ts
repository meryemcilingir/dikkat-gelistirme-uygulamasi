import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface ShapeOption {
    id: number;
    shape: 'arrow-left' | 'stair-right' | 'bracket-right';
    isCorrect: boolean;
    isShaking?: boolean;
}

interface LetterGridState {
    selectedId: number | null;
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'letter-grid';

// 4×4 letter grid (last row/col of the 5×5 removed)
export const GRID: string[][] = [
    ['e', 'a', 'l', 'k'],
    ['i', 'e', 'k', 'l'],
    ['e', 'a', 'e', 'k'],
    ['i', 'a', 'e', 'l'],
];

// Highlighted path: e(0,0) → e(1,1) → e(2,2) → e(3,2) forms a stair going right-down
export const PATH_CELLS: [number, number][] = [
    [0, 0], [1, 1], [2, 2], [3, 2]
];

@Component({
    selector: 'app-letter-grid',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './letter-grid.component.html',
    styleUrl: './letter-grid.component.scss'
})
export class LetterGridComponent implements OnInit {
    grid = GRID;
    pathCells = new Set(PATH_CELLS.map(([r, c]) => `${r}-${c}`));

    options: ShapeOption[] = [
        { id: 1, shape: 'arrow-left', isCorrect: false },
        { id: 2, shape: 'stair-right', isCorrect: true },
        { id: 3, shape: 'bracket-right', isCorrect: false },
    ];

    selectedId: number | null = null;
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

    isPathCell(row: number, col: number): boolean {
        return this.pathCells.has(`${row}-${col}`);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<LetterGridState>(ID);
        if (saved) {
            this.selectedId = saved.selectedId;
            this.feedbackState = saved.feedbackState;
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            selectedId: this.selectedId,
            feedbackState: this.feedbackState
        });
    }

    selectOption(id: number): void {
        if (this.feedbackState === 'correct') return;
        this.selectedId = this.selectedId === id ? null : id;
        this.feedbackState = null;
        this.persist();
    }

    clearSelection(): void {
        this.selectedId = null;
        this.feedbackState = null;
        this.options.forEach(o => o.isShaking = false);
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    checkAnswer(): void {
        if (this.selectedId === null) return;
        const selected = this.options.find(o => o.id === this.selectedId)!;
        if (selected.isCorrect) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Tebrikler! Doğru şekli buldun!');
        } else {
            this.feedbackState = 'wrong';
            this.hintService.registerError(ID);
            selected.isShaking = true;
            setTimeout(() => (selected.isShaking = false), 500);
            this.fb.showFeedback('error', 'Tekrar dene. "e" harflerini izle.');
        }
        this.persist();
    }

    goPrev(): void {
        this.router.navigate(['/different-mountain']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/ice-cream-shape']);
    }
}
