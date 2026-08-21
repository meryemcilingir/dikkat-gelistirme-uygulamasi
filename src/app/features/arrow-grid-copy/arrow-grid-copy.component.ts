import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ReviewModeService } from '../../core/services/review-mode.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

type Arrow = '→' | '↑' | null;
type Feedback = 'correct' | 'wrong' | null;

interface ArrowGridState {
    userGrid: Arrow[][];
    feedbackGrid: Feedback[][];
    mistakeCount: number;
}

const ID = 'arrow-grid-copy';

@Component({
    selector: 'app-arrow-grid-copy',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './arrow-grid-copy.component.html',
    styleUrl: './arrow-grid-copy.component.scss'
})
export class ArrowGridCopyComponent implements OnInit {
    reviewMode = inject(ReviewModeService);

    // Referans: dama tahtası deseni (→ ve ↑)
    readonly referenceGrid: ReadonlyArray<ReadonlyArray<'→' | '↑'>> = [
        ['→', '↑', '→'],
        ['↑', '→', '↑'],
        ['→', '↑', '→']
    ];

    userGrid: Arrow[][] = [
        [null, null, null],
        [null, null, null],
        [null, null, null]
    ];

    feedbackGrid: Feedback[][] = [
        [null, null, null],
        [null, null, null],
        [null, null, null]
    ];

    ghostGrid: boolean[][] = [
        [false, false, false],
        [false, false, false],
        [false, false, false]
    ];

    selectedArrow: '→' | '↑' | null = null;
    mistakeCount = 0;

    readonly rows = [0, 1, 2];
    readonly cols = [0, 1, 2];

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) {}

    get showHint(): boolean {
        return this.hintService.shouldShowHint(ID) || this.mistakeCount >= 2;
    }

    get isNextUnlocked(): boolean { return this.gs.isCompleted(ID); }

    isHintCell(row: number, col: number): boolean {
        if (!this.showHint) return false;
        return this.feedbackGrid[row][col] === 'wrong' || this.userGrid[row][col] === null;
    }

    getGhostSymbol(row: number, col: number): string | null {
        if (!this.ghostGrid[row][col]) return null;
        if (this.userGrid[row][col] !== null) return null;
        return this.referenceGrid[row][col];
    }

    ngOnInit(): void {
        const saved = this.gs.getData<ArrowGridState>(ID);
        if (saved) {
            this.userGrid = saved.userGrid || this.userGrid;
            this.feedbackGrid = saved.feedbackGrid || this.feedbackGrid;
            this.mistakeCount = saved.mistakeCount ?? 0;
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            userGrid: this.userGrid,
            feedbackGrid: this.feedbackGrid,
            mistakeCount: this.mistakeCount
        });
    }

    onArrowSelect(arrow: '→' | '↑'): void {
        if (this.isNextUnlocked) return;
        this.selectedArrow = this.selectedArrow === arrow ? null : arrow;
    }

    onCellClick(row: number, col: number): void {
        if (this.isNextUnlocked) return;
        if (!this.selectedArrow) {
            this.fb.showFeedback('error', 'Lütfen önce aşağıdan bir ok seçin!');
            return;
        }
        this.userGrid[row][col] = this.selectedArrow;
        this.feedbackGrid[row][col] = null;
        this.persist();
    }

    checkAnswer(): void {
        const allFilled = this.userGrid.every(row => row.every(cell => cell !== null));
        if (!allFilled) {
            this.fb.showFeedback('error', 'Lütfen tüm kutucukları doldurun!');
            return;
        }

        let allCorrect = true;
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                if (this.userGrid[r][c] === this.referenceGrid[r][c]) {
                    this.feedbackGrid[r][c] = 'correct';
                } else {
                    this.feedbackGrid[r][c] = 'wrong';
                    allCorrect = false;
                }
            }
        }

        if (allCorrect) {
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Tebrikler! Ok yönlerini doğru yerleştirdin!');
        } else {
            this.mistakeCount++;
            this.hintService.registerError(ID);
            if (this.mistakeCount >= 2) {
                for (let r = 0; r < 3; r++) {
                    for (let c = 0; c < 3; c++) {
                        if (this.feedbackGrid[r][c] === 'wrong') {
                            this.userGrid[r][c] = null;
                            this.ghostGrid[r][c] = true;
                            this.feedbackGrid[r][c] = null;
                        }
                    }
                }
                this.fb.showFeedback('error', 'İpucu gösteriliyor! Soluk okları takip et.');
            } else {
                this.fb.showFeedback('error', 'Bazı oklar yanlış yönde. Tekrar kontrol et!');
            }
        }
        this.persist();
    }

    clearSelection(): void {
        this.userGrid = [[null, null, null], [null, null, null], [null, null, null]];
        this.feedbackGrid = [[null, null, null], [null, null, null], [null, null, null]];
        this.ghostGrid = [[false, false, false], [false, false, false], [false, false, false]];
        this.selectedArrow = null;
        this.mistakeCount = 0;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    goPrev(): void { this.router.navigate(['/fruit-sequence']); }
    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/color-pattern-completion']);
    }
}
