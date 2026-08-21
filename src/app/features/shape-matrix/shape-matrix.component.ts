import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export type Shape = 'circle' | 'square' | 'triangle' | null;

interface ShapeOption {
    id: number;
    shape: Shape;
    isCorrect: boolean;
    isShaking?: boolean;
    rotated?: boolean;
}

interface ShapeMatrixState {
    selectedId: number | null;
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'shape-matrix';

// 3×3 matris — her satır ve sütunda her şekil tam bir kez bulunur
// Satır 0: daire  kare    üçgen
// Satır 1: kare   üçgen   daire
// Satır 2: üçgen  [?]     kare     → cevap: daire
const GRID: Shape[][] = [
    ['circle',   'square',   'triangle'],
    ['square',   'triangle', 'circle'  ],
    ['triangle', null,       'square'  ],
];
const MISSING_ROW = 2;
const MISSING_COL = 1;

@Component({
    selector: 'app-shape-matrix',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './shape-matrix.component.html',
    styleUrl: './shape-matrix.component.scss'
})
export class ShapeMatrixComponent implements OnInit {

    readonly grid = GRID;
    readonly missingRow = MISSING_ROW;
    readonly missingCol = MISSING_COL;

    options: ShapeOption[] = [
        { id: 1, shape: 'circle',   isCorrect: true  },
        { id: 2, shape: 'square',   isCorrect: false },
        { id: 3, shape: 'triangle', isCorrect: false },
        { id: 4, shape: 'square',   isCorrect: false, rotated: true }, // baklava (döndürülmüş kare) — birebir aynı görünmesin
    ];

    selectedId: number | null = null;
    feedbackState: 'correct' | 'wrong' | null = null;

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) {}

    get showHint(): boolean { return this.hintService.shouldShowHint(ID); }
    get isNextUnlocked(): boolean {
        return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
    }

    get selectedShape(): Shape {
        if (this.selectedId === null) return null;
        return this.options.find(o => o.id === this.selectedId)?.shape ?? null;
    }

    // Önizleme: seçilen şekli ? hücresinde göster
    cellShape(row: number, col: number): Shape {
        if (row === MISSING_ROW && col === MISSING_COL) {
            return this.isNextUnlocked ? this.selectedShape : (this.selectedShape ?? null);
        }
        return this.grid[row][col];
    }

    ngOnInit(): void {
        const saved = this.gs.getData<ShapeMatrixState>(ID);
        if (saved) {
            this.selectedId = saved.selectedId;
            this.feedbackState = saved.feedbackState;
        }
    }

    private persist(): void {
        this.gs.save(ID, { selectedId: this.selectedId, feedbackState: this.feedbackState });
    }

    selectOption(id: number): void {
        if (this.feedbackState === 'correct' || this.gs.isCompleted(ID)) return;
        this.selectedId = this.selectedId === id ? null : id;
        this.feedbackState = null;
        this.persist();
    }

    checkAnswer(): void {
        if (this.selectedId === null) {
            this.fb.showFeedback('error', 'Lütfen önce eksik şekli seçin!');
            return;
        }
        const selected = this.options.find(o => o.id === this.selectedId)!;
        if (selected.isCorrect) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Harika! Her satır ve sütunda her şekil bir kez var!');
        } else {
            this.feedbackState = 'wrong';
            this.hintService.registerError(ID);
            selected.isShaking = true;
            setTimeout(() => (selected.isShaking = false), 500);
            this.fb.showFeedback('error', 'Her satırda ve sütunda her şekil bir kez olmalı. Tekrar bak!');
        }
        this.persist();
    }

    clearSelection(): void {
        this.selectedId = null;
        this.feedbackState = null;
        this.options.forEach(o => (o.isShaking = false));
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    goPrev(): void { this.router.navigate(['/symbol-sequence-match']); }
    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/school-profession']);
    }
}
