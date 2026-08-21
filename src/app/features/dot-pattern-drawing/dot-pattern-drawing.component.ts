import { Component, OnInit, inject } from '@angular/core';
import { ReviewModeService } from '../../core/services/review-mode.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface Point {
    x: number;
    y: number;
    id: number;
}

interface DotState {
    userEdges: string[];
    feedbackState: 'correct' | 'wrong' | null;
    mistakeCount?: number;
}

const ID = 'dot-pattern-drawing';

@Component({
    selector: 'app-dot-pattern-drawing',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './dot-pattern-drawing.component.html',
    styleUrl: './dot-pattern-drawing.component.scss'
})
export class DotPatternDrawingComponent implements OnInit {
    reviewMode = inject(ReviewModeService);
    // Grid config: 5x5
    readonly GRID_SIZE = 5;
    readonly DOT_SPACING = 60; // Distance between dots in px
    readonly GRID_PADDING = 30; // Padding inside the SVG

    // Calculate total SVG size based on spacing and padding
    readonly SVG_SIZE = (this.GRID_SIZE - 1) * this.DOT_SPACING + this.GRID_PADDING * 2;

    dots: Point[] = [];

    targetEdgesArray = [
        [5, 10], [10, 15], [15, 20], // Col 0: row 1 to 4
        [20, 21],                    // Row 4: col 0 to col 1
        [21, 16], [16, 11], [11, 6], [6, 1], // Col 1: row 4 up to row 0
        [1, 2],                      // Row 0: col 1 to col 2
        [2, 7], [7, 12], [12, 17],   // Col 2: row 0 down to row 3
        [17, 13],                    // Diagonal: (3,2) to (2,3)
        [13, 8],                     // Col 3: row 2 up to row 1
        [8, 9],                      // Row 1: col 3 to col 4
        [9, 14]                      // Col 4: row 1 down to row 2
    ];

    targetEdges: string[] = [];
    userEdges: string[] = [];

    // Interactive state
    activeDot: number | null = null;
    hoverDot: number | null = null;

    feedbackState: 'correct' | 'wrong' | null = null;
    hasChecked = false;
    mistakeCount = 0;

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) {
        this.initGrid();
        this.targetEdges = this.targetEdgesArray.map(e => this.makeEdgeId(e[0], e[1]));
    }

    get showHint(): boolean {
        return this.hintService.shouldShowHint(ID) || this.mistakeCount >= 2;
    }

    get isNextUnlocked(): boolean {
        return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<DotState>(ID);
        if (saved) {
            this.feedbackState = saved.feedbackState;
            this.mistakeCount = saved.mistakeCount ?? 0;
            this.userEdges = saved.userEdges || [];
            if (this.feedbackState) {
                this.hasChecked = true;
            }
        }
    }

    private initGrid() {
        for (let row = 0; row < this.GRID_SIZE; row++) {
            for (let col = 0; col < this.GRID_SIZE; col++) {
                this.dots.push({
                    id: row * this.GRID_SIZE + col,
                    x: this.GRID_PADDING + col * this.DOT_SPACING,
                    y: this.GRID_PADDING + row * this.DOT_SPACING
                });
            }
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            userEdges: this.userEdges,
            feedbackState: this.feedbackState,
            mistakeCount: this.mistakeCount
        });
    }

    // --- Interaction Logic ---

    makeEdgeId(a: number, b: number): string {
        return Math.min(a, b) + '-' + Math.max(a, b);
    }

    onDotClick(id: number) {
        if (this.isNextUnlocked) return; // Prevent edits if correct

        if (this.hasChecked) {
            // Kontrol ettikten sonra tekrar tıklanırsa eski işaretlemeleri sil
            this.userEdges = [];
            this.activeDot = id;
            this.feedbackState = null;
            this.hasChecked = false;
            this.persist();
            return;
        }

        if (this.activeDot === null) {
            // First click
            this.activeDot = id;
        } else if (this.activeDot === id) {
            // Clicked same dot -> deselect
            this.activeDot = null;
        } else {
            // Second click -> form edges (handling long straight lines!)
            const r1 = Math.floor(this.activeDot / this.GRID_SIZE);
            const c1 = this.activeDot % this.GRID_SIZE;
            const r2 = Math.floor(id / this.GRID_SIZE);
            const c2 = id % this.GRID_SIZE;

            const rDiff = r2 - r1;
            const cDiff = c2 - c1;

            // Only allow horizontal, vertical, or perfectly diagonal straight lines
            const isStraight = r1 === r2 || c1 === c2 || Math.abs(rDiff) === Math.abs(cDiff);

            if (isStraight) {
                const steps = Math.max(Math.abs(rDiff), Math.abs(cDiff));
                const rStep = rDiff === 0 ? 0 : rDiff / Math.abs(rDiff);
                const cStep = cDiff === 0 ? 0 : cDiff / Math.abs(cDiff);

                let currentDot = this.activeDot;

                // Toggle mode decision based on the FIRST segment
                // If the first segment exists, we will TURN OFF the whole path.
                // If it doesn't, we will TURN ON the whole path.
                const firstNextDot = (r1 + rStep) * this.GRID_SIZE + (c1 + cStep);
                const firstEdge = this.makeEdgeId(currentDot, firstNextDot);
                const isTogglingOff = this.userEdges.includes(firstEdge);

                for (let i = 1; i <= steps; i++) {
                    const nextR = r1 + rStep * i;
                    const nextC = c1 + cStep * i;
                    const nextDot = nextR * this.GRID_SIZE + nextC;

                    const edgeId = this.makeEdgeId(currentDot, nextDot);
                    const existsIdx = this.userEdges.indexOf(edgeId);

                    if (isTogglingOff && existsIdx > -1) {
                        this.userEdges.splice(existsIdx, 1);
                    } else if (!isTogglingOff && existsIdx === -1) {
                        this.userEdges.push(edgeId);
                    }

                    currentDot = nextDot;
                }

                if (isTogglingOff) {
                    this.activeDot = null; // Break chain if removing
                } else {
                    this.activeDot = id; // Keep chain at the very end
                }

                this.feedbackState = null;
                this.hasChecked = false;
                this.persist();
            } else {
                // If it's some L-shape jump, just fallback strictly to standard connection to avoid weird jumps
                // Though UI-wise it shouldn't happen naturally.
                this.activeDot = null;
            }
        }
    }

    onDotDoubleClick(id: number) {
        if (this.isNextUnlocked) return;
        if (this.userEdges.length === 0) return;

        let cutIndex = -1;
        let clearAll = false;

        for (let i = 0; i < this.userEdges.length; i++) {
            const parts = this.userEdges[i].split('-');
            if (parts.includes(id.toString())) {
                cutIndex = i;
                if (i === 0) {
                    if (this.userEdges.length > 1) {
                        const nextParts = this.userEdges[1].split('-');
                        if (!nextParts.includes(id.toString())) {
                            clearAll = true; // Clicked the very start of the first line
                        }
                    } else {
                        clearAll = true;
                    }
                }
                break; // Found the earliest edge involving this dot
            }
        }

        if (cutIndex !== -1) {
            if (clearAll) {
                this.userEdges = [];
                this.activeDot = null;
            } else {
                this.userEdges = this.userEdges.slice(0, cutIndex + 1);
                this.activeDot = id;
            }
            this.feedbackState = null;
            this.hasChecked = false;
            this.persist();
        }
    }

    onDotHover(id: number | null) {
        if (this.isNextUnlocked) return;
        this.hoverDot = id;
    }

    // Helpers for drawing
    getDotById(id: number): Point {
        return this.dots[id];
    }

    getParsedEdges(edges: string[]): { from: Point, to: Point }[] {
        return edges.map(e => {
            const parts = e.split('-');
            return {
                from: this.getDotById(parseInt(parts[0], 10)),
                to: this.getDotById(parseInt(parts[1], 10))
            };
        });
    }

    clearSelection(): void {
        this.userEdges = [];
        this.activeDot = null;
        this.feedbackState = null;
        this.hasChecked = false;
        this.mistakeCount = 0;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    checkAnswer(): void {
        if (this.userEdges.length === 0) {
            this.fb.showFeedback('error', 'Lütfen noktaları birleştirerek bir şekil çizin.');
            return;
        }

        // Check if userEdges and targetEdges match exactly
        const isCorrect =
            this.userEdges.length === this.targetEdges.length &&
            this.userEdges.every(e => this.targetEdges.includes(e));

        this.hasChecked = true;

        if (isCorrect) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.activeDot = null;
            this.fb.showFeedback('success', 'Tebrikler! Şekli doğru çizdiniz.');
        } else {
            this.mistakeCount++;
            this.hintService.registerError(ID);
            this.feedbackState = 'wrong';
            this.activeDot = null;
            this.fb.showFeedback('error', 'Şekil tam olarak eşleşmiyor. Kontrol edip tekrar deneyin.');
        }

        this.persist();
    }

    goPrev(): void {
        this.router.navigate(['/abacus-counting']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/fruit-count-matching']);
    }
}
