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

interface SavedState {
    userEdges1: string[];
    userEdges2: string[];
    feedbackState1: 'correct' | 'wrong' | null;
    feedbackState2: 'correct' | 'wrong' | null;
    mistakeCount: number;
}

// Zincirdeki her adım: hangi noktaya varıldı ve o adımda hangi kenarlar çizildi
interface StepEntry {
    dot: number;
    edges: string[];
}

const ID = 'dot-grid-copy';

@Component({
    selector: 'app-dot-grid-copy',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './dot-grid-copy.component.html',
    styleUrl: './dot-grid-copy.component.scss'
})
export class DotGridCopyComponent implements OnInit {
    reviewMode = inject(ReviewModeService);
    readonly GRID_SIZE = 6;
    readonly DOT_SPACING = 40;
    readonly GRID_PADDING = 20;
    readonly SVG_SIZE = (this.GRID_SIZE - 1) * this.DOT_SPACING + this.GRID_PADDING * 2;

    dots: Point[] = [];

    // Şekil 1: S-merdivenli (sol üstten sağ alta)
    // Row 0: 0 1 2 3 4 5 | Row 1: 6 7 8 9 10 11 | Row 2: 12 13 14 15 16 17
    // Row 3: 18 19 20 21 22 23 | Row 4: 24 25 26 27 28 29 | Row 5: 30 31 32 33 34 35
    readonly target1: string[];

    // Şekil 2: Z-merdivenli (üst sağdan sol alta)
    readonly target2: string[];

    userEdges1: string[] = [];
    userEdges2: string[] = [];

    activeDot1: number | null = null;
    activeDot2: number | null = null;
    hoverDot1: number | null = null;
    hoverDot2: number | null = null;

    feedbackState1: 'correct' | 'wrong' | null = null;
    feedbackState2: 'correct' | 'wrong' | null = null;
    hasChecked = false;
    mistakeCount = 0;

    // Zincir: [başlangıç noktası, 2. nokta, 3. nokta, ...]
    // activeDot her zaman zincirin son elemanıdır
    dotPath1: StepEntry[] = [];
    dotPath2: StepEntry[] = [];

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) {
        this.initGrid();

        // Şekil 1: S-merdiven
        // (0,0)→(0,2) üst yatay, (0,0)→(2,0) sol dikey,
        // (2,0)→(2,2) orta yatay, (2,2)→(4,2) sağ dikey, (4,2)→(4,4) alt yatay
        const rawTarget1 = [
            [0, 1], [1, 2],
            [0, 6], [6, 12],
            [12, 13], [13, 14],
            [14, 20], [20, 26],
            [26, 27], [27, 28]
        ];
        this.target1 = rawTarget1.map(e => this.makeEdgeId(e[0], e[1]));

        // Şekil 2: Z-merdiven
        // (1,1)→(1,4) üst yatay, (1,1)→(3,1) sol dikey,
        // (3,1)→(3,3) orta yatay, (3,3)→(5,3) alt dikey
        const rawTarget2 = [
            [7, 8], [8, 9], [9, 10],
            [7, 13], [13, 19],
            [19, 20], [20, 21],
            [21, 27], [27, 33]
        ];
        this.target2 = rawTarget2.map(e => this.makeEdgeId(e[0], e[1]));
    }

    get showHint(): boolean {
        return this.hintService.shouldShowHint(ID) || this.mistakeCount >= 2;
    }

    get isNextUnlocked(): boolean {
        return (this.feedbackState1 === 'correct' && this.feedbackState2 === 'correct')
            || this.gs.isCompleted(ID);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<SavedState>(ID);
        if (saved) {
            this.userEdges1 = saved.userEdges1 || [];
            this.userEdges2 = saved.userEdges2 || [];
            this.feedbackState1 = saved.feedbackState1 ?? null;
            this.feedbackState2 = saved.feedbackState2 ?? null;
            this.mistakeCount = saved.mistakeCount ?? 0;
            if (saved.feedbackState1 || saved.feedbackState2) {
                this.hasChecked = true;
            }
        }
    }

    private initGrid(): void {
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
            userEdges1: this.userEdges1,
            userEdges2: this.userEdges2,
            feedbackState1: this.feedbackState1,
            feedbackState2: this.feedbackState2,
            mistakeCount: this.mistakeCount
        });
    }

    makeEdgeId(a: number, b: number): string {
        return Math.min(a, b) + '-' + Math.max(a, b);
    }

    onDotClick(puzzle: 1 | 2, id: number): void {
        if (this.isNextUnlocked) return;

        const feedbackState = puzzle === 1 ? this.feedbackState1 : this.feedbackState2;
        if (feedbackState === 'correct') return;

        const edges = puzzle === 1 ? this.userEdges1 : this.userEdges2;
        const activeDot = puzzle === 1 ? this.activeDot1 : this.activeDot2;

        // Kontrol sonrası ilk tıklamada çizimi temizle
        if (this.hasChecked) {
            if (puzzle === 1) {
                this.userEdges1 = [];
                this.activeDot1 = id;
                this.feedbackState1 = null;
                this.dotPath1 = [{ dot: id, edges: [] }];
            } else {
                this.userEdges2 = [];
                this.activeDot2 = id;
                this.feedbackState2 = null;
                this.dotPath2 = [{ dot: id, edges: [] }];
            }
            this.hasChecked = false;
            this.persist();
            return;
        }

        const dotPath = puzzle === 1 ? this.dotPath1 : this.dotPath2;

        // Henüz başlangıç noktası seçilmedi → zinciri başlat
        if (activeDot === null) {
            dotPath.push({ dot: id, edges: [] });
            if (puzzle === 1) this.activeDot1 = id;
            else this.activeDot2 = id;
            return;
        }

        // Aktif noktanın kendisine basıldı → sadece seçimi kaldır (zinciri sıfırlama)
        if (activeDot === id) {
            if (puzzle === 1) this.activeDot1 = null;
            else this.activeDot2 = null;
            dotPath.length = 0;
            return;
        }

        // Bir önceki noktaya basıldı → son segmenti geri al
        if (dotPath.length >= 2 && dotPath[dotPath.length - 2].dot === id) {
            const lastStep = dotPath.pop()!;
            for (const e of lastStep.edges) {
                const idx = edges.indexOf(e);
                if (idx > -1) edges.splice(idx, 1);
            }
            const prevDot = dotPath[dotPath.length - 1].dot;
            if (puzzle === 1) {
                this.userEdges1 = [...edges];
                this.activeDot1 = prevDot;
            } else {
                this.userEdges2 = [...edges];
                this.activeDot2 = prevDot;
            }
            this.persist();
            return;
        }

        // Yeni noktaya çizim yap (yatay, dikey veya çapraz düz çizgi)
        const r1 = Math.floor(activeDot / this.GRID_SIZE);
        const c1 = activeDot % this.GRID_SIZE;
        const r2 = Math.floor(id / this.GRID_SIZE);
        const c2 = id % this.GRID_SIZE;
        const rDiff = r2 - r1;
        const cDiff = c2 - c1;
        const isStraight = r1 === r2 || c1 === c2 || Math.abs(rDiff) === Math.abs(cDiff);

        if (!isStraight) {
            // Geçersiz hedef → seçimi kaldır
            if (puzzle === 1) this.activeDot1 = null;
            else this.activeDot2 = null;
            dotPath.length = 0;
            return;
        }

        const steps = Math.max(Math.abs(rDiff), Math.abs(cDiff));
        const rStep = rDiff === 0 ? 0 : rDiff / Math.abs(rDiff);
        const cStep = cDiff === 0 ? 0 : cDiff / Math.abs(cDiff);

        const newEdges: string[] = [];
        let currentDot = activeDot;
        for (let i = 1; i <= steps; i++) {
            const nextDot = (r1 + rStep * i) * this.GRID_SIZE + (c1 + cStep * i);
            const edgeId = this.makeEdgeId(currentDot, nextDot);
            if (!edges.includes(edgeId)) {
                edges.push(edgeId);
                newEdges.push(edgeId);
            }
            currentDot = nextDot;
        }

        dotPath.push({ dot: id, edges: newEdges });

        if (puzzle === 1) {
            this.userEdges1 = [...edges];
            this.activeDot1 = id;
            this.feedbackState1 = null;
        } else {
            this.userEdges2 = [...edges];
            this.activeDot2 = id;
            this.feedbackState2 = null;
        }
        this.hasChecked = false;
        this.persist();
    }

    onDotHover(puzzle: 1 | 2, id: number | null): void {
        if (this.isNextUnlocked) return;
        if (puzzle === 1) this.hoverDot1 = id;
        else this.hoverDot2 = id;
    }

    getDotById(id: number): Point {
        return this.dots[id];
    }

    getParsedEdges(edges: string[]): { from: Point; to: Point }[] {
        return edges.map(e => {
            const parts = e.split('-');
            return {
                from: this.getDotById(parseInt(parts[0], 10)),
                to: this.getDotById(parseInt(parts[1], 10))
            };
        });
    }

    clearSelection(): void {
        this.userEdges1 = [];
        this.userEdges2 = [];
        this.activeDot1 = null;
        this.activeDot2 = null;
        this.feedbackState1 = null;
        this.feedbackState2 = null;
        this.hasChecked = false;
        this.mistakeCount = 0;
        this.dotPath1 = [];
        this.dotPath2 = [];
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    checkAnswer(): void {
        if (this.userEdges1.length === 0 && this.userEdges2.length === 0) {
            this.fb.showFeedback('error', 'Lütfen önce şekilleri çizin!');
            return;
        }
        if (this.userEdges1.length === 0 || this.userEdges2.length === 0) {
            this.fb.showFeedback('error', 'Lütfen her iki şekle de en az bir çizgi çizin!');
            return;
        }

        const isCorrect1 =
            this.userEdges1.length === this.target1.length &&
            this.userEdges1.every(e => this.target1.includes(e));
        const isCorrect2 =
            this.userEdges2.length === this.target2.length &&
            this.userEdges2.every(e => this.target2.includes(e));

        this.feedbackState1 = isCorrect1 ? 'correct' : (this.userEdges1.length > 0 ? 'wrong' : null);
        this.feedbackState2 = isCorrect2 ? 'correct' : (this.userEdges2.length > 0 ? 'wrong' : null);
        this.hasChecked = true;
        this.activeDot1 = null;
        this.activeDot2 = null;
        this.dotPath1 = [];
        this.dotPath2 = [];

        if (isCorrect1 && isCorrect2) {
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Tebrikler! Her iki şekli de doğru çizdiniz!');
        } else {
            this.mistakeCount++;
            this.hintService.registerError(ID);
            const msg = !isCorrect1 && !isCorrect2
                ? 'Her iki şekil de eşleşmiyor. Tekrar deneyin.'
                : !isCorrect1
                    ? '1. şekil tam eşleşmiyor. Kontrol edin.'
                    : '2. şekil tam eşleşmiyor. Kontrol edin.';
            this.fb.showFeedback('error', msg);
        }

        this.persist();
    }

    goPrev(): void {
        this.router.navigate(['/cat-position']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/bike-matching']);
    }
}
