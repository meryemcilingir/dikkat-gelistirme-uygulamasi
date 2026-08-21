import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';
import { ActivityService } from '../../core/services/activity.service';

interface GridCell {
    row: number;
    col: number;
    correctNumber: number | null;
    userColorId: number | null;
}

interface ColorKey {
    id: number;
    number: number;
    color: string;
    label: string;
}

const COLORS: ColorKey[] = [
    { id: 1, number: 1, color: '#ffffff', label: '1' },
    { id: 2, number: 2, color: '#4CAF50', label: '2' }, // Green (assumed from pattern)
    { id: 3, number: 3, color: '#e53935', label: '3' }, // Red
    { id: 4, number: 4, color: '#FFEB3B', label: '4' }, // Yellow (assumed)
    { id: 5, number: 5, color: '#7E57C2', label: '5' }, // Purple
];

// Grid 5x5 layout based on image
const GRID_DATA: (number | null)[][] = [
    [5, null, null, null, 5],
    [null, 3, 4, 3, null],
    [null, 4, 1, 4, null],
    [null, 3, 4, 3, null],
    [null, null, 2, null, null],
];

interface GridColoringState {
    userColors: (number | null)[][];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'grid-coloring-numbers';

@Component({
    selector: 'app-grid-coloring-numbers',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent, SharedFeedbackComponent],
    templateUrl: './grid-coloring-numbers.component.html',
    styleUrl: './grid-coloring-numbers.component.scss',
})
export class GridColoringNumbersComponent implements OnInit {
    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService,
        private activityService: ActivityService
    ) { }

    grid: GridCell[][] = [];
    colorKeys = COLORS;
    selectedColorId: number | null = null;
    feedbackState: 'correct' | 'wrong' | null = null;

    get showHint(): boolean {
        return this.hintService.shouldShowHint(ID);
    }

    get isNextUnlocked(): boolean { return this.feedbackState === 'correct' || this.gs.isCompleted(ID); }

    ngOnInit(): void {
        this.initGrid();
        const saved = this.gs.getData<GridColoringState>(ID);
        if (saved) {
            this.grid.forEach((row, rIdx) => {
                row.forEach((cell, cIdx) => {
                    cell.userColorId = saved.userColors[rIdx][cIdx];
                });
            });
            this.feedbackState = saved.feedbackState;
        }
    }

    private initGrid(): void {
        this.grid = GRID_DATA.map((row, rIdx) =>
            row.map((val, cIdx) => ({
                row: rIdx,
                col: cIdx,
                correctNumber: val,
                userColorId: null
            }))
        );
    }

    private persist(): void {
        this.gs.save(ID, {
            userColors: this.grid.map(row => row.map(cell => cell.userColorId)),
            feedbackState: this.feedbackState
        });
    }

    selectColor(id: number): void {
        this.selectedColorId = this.selectedColorId === id ? null : id;
    }

    paintCell(cell: GridCell): void {
        if (this.feedbackState === 'correct') return;
        if (cell.correctNumber === null) return; // Empty cells not interactive

        if (this.selectedColorId !== null) {
            cell.userColorId = this.selectedColorId;
            this.feedbackState = null;
            this.persist();
        }
    }

    getCellStyles(cell: GridCell): any {
        if (cell.userColorId === null) return {};
        const key = this.colorKeys.find(k => k.id === cell.userColorId);
        return { 'background-color': key?.color };
    }

    checkAnswer(): void {
        // Check if all numbered cells are colored correctly
        let allCorrect = true;
        let anyEmpty = false;

        this.grid.forEach(row => {
            row.forEach(cell => {
                if (cell.correctNumber !== null) {
                    if (cell.userColorId === null) {
                        anyEmpty = true;
                    } else {
                        const selectedKey = this.colorKeys.find(k => k.id === cell.userColorId);
                        if (selectedKey?.number !== cell.correctNumber) {
                            allCorrect = false;
                        }
                    }
                }
            });
        });

        if (anyEmpty) {
            this.fb.showFeedback('error', 'Lütfen tüm numaralı kutuları boyayın!');
            return;
        }

        this.feedbackState = allCorrect ? 'correct' : 'wrong';

        if (allCorrect) {
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Tebrikler! Tabloyu mükemmel boyadın!');
        } else {
            this.hintService.registerError(ID);
            this.fb.showFeedback('error', 'Bazı renkler yanlış kutuda duruyor.');
        }
        this.persist();
    }

    restartActivity(): void {
        this.grid.forEach(row => row.forEach(cell => cell.userColorId = null));
        this.selectedColorId = null;
        this.feedbackState = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
        this.persist();
    }

    goPrev(): void { this.activityService.prev(); }
    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.activityService.next();
    }
}
