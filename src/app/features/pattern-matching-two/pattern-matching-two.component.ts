import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ReviewModeService } from '../../core/services/review-mode.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

// ─────────────────────────────────────────────────────────
// 6x6 pattern, replicating the orange animal face from the image
const PUZZLE_PAGES: boolean[][][] = [
    [
        [false, false, false, false, false, false],
        [false, false, false, false, false, false],
        [false, true, false, false, true, false],
        [false, false, true, true, false, false],
        [false, false, true, true, false, false],
        [false, false, false, false, false, false],
    ],
];

interface PatternTwoState {
    userGrid: boolean[][];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'pattern-2';

@Component({
    selector: 'app-pattern-matching-two',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './pattern-matching-two.component.html',
    styleUrl: './pattern-matching-two.component.scss',
})
export class PatternMatchingTwoComponent implements OnInit {
    reviewMode = inject(ReviewModeService);

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) { }

    readonly currentPage = signal(0);
    readonly totalPages = PUZZLE_PAGES.length;
    readonly targetGrid = computed(() => PUZZLE_PAGES[this.currentPage()]);

    userGrid: boolean[][] = this.createEmptyGrid();
    feedbackState: 'correct' | 'wrong' | null = null;

    get showHints(): boolean {
        return this.hintService.shouldShowHint(ID);
    }

    get isNextUnlocked(): boolean {
        return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
    }

    // ── Lifecycle ─────────────────────────────────────────
    ngOnInit(): void {
        const saved = this.gs.getData<PatternTwoState>(ID);
        if (saved) {
            this.userGrid = saved.userGrid.map(row => [...row]);
            this.feedbackState = saved.feedbackState;
        }
    }

    // ── Yardımcı ──────────────────────────────────────────
    private createEmptyGrid(): boolean[][] {
        return Array.from({ length: 6 }, () => Array(6).fill(false));
    }

    private persist(): void {
        this.gs.save(ID, {
            userGrid: this.userGrid,
            feedbackState: this.feedbackState
        });
    }

    // ── Etkileşim ─────────────────────────────────────────
    toggleCell(row: number, col: number): void {
        if (this.gs.isCompleted(ID) && this.feedbackState === 'correct') return; // locked if finished
        this.userGrid[row][col] = !this.userGrid[row][col];
        this.feedbackState = null;
        this.persist();
    }

    clearGrid(): void {
        this.userGrid = this.createEmptyGrid();
        this.feedbackState = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    checkPattern(): void {
        if (!this.userGrid.some(row => row.some(cell => cell))) {
            this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
            return;
        }

        const target = this.targetGrid();

        const isCorrect = target.every((row, r) =>
            row.every((cell, c) => cell === this.userGrid[r][c])
        );
        this.feedbackState = isCorrect ? 'correct' : 'wrong';
        if (isCorrect) {
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Tebrikler! Deseni mükemmel kopyaladın!');
        } else {
            this.hintService.registerError(ID);
            this.fb.showFeedback('error', 'Tekrar Denemelisin');
        }
        this.persist();
    }

    isHintRemove(r: number, c: number): boolean {
        if (!this.showHints) return false;
        return this.userGrid[r][c] && !this.targetGrid()[r][c]; // Extra painted
    }

    isHintAdd(r: number, c: number): boolean {
        if (!this.showHints) return false;
        return !this.userGrid[r][c] && this.targetGrid()[r][c]; // Missing painted
    }

    // ── Navigasyon ────────────────────────────────────────
    goPrev(): void {
        this.router.navigate(['/animal-position']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/shape-coloring']);
    }

    readonly rowIndices = [0, 1, 2, 3, 4, 5] as const;
    readonly colIndices = [0, 1, 2, 3, 4, 5] as const;
}
