import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface SymbolDef {
    char: string;
    color: string;
}

export interface SymbolBlock {
    id: number;
    patternId: number;
    cells: SymbolDef[];   // [TL, TR, BL, BR]
    isSelected: boolean;
    isPaired: boolean;
    pairIndex: number | null;
}

interface BlockPair {
    aId: number;
    bId: number;
}

// Öğrencinin oluşturduğu eşleşmeleri birbirinden ayırt etmek için döngüsel renk/rakam paleti
export const PAIR_BADGE_COLORS = ['#e91e63', '#3f51b5', '#00897b', '#f9a825', '#8e24aa', '#43a047'];

interface SymbolBlockMatchState {
    pairs: BlockPair[];
}

const ID = 'symbol-block-match';

// ── Sembol tanımları ─────────────────────────────────────
const SQ:   SymbolDef = { char: '■', color: '#4CAF50' };
const TRI:  SymbolDef = { char: '▲', color: '#00ACC1' };
const CIR:  SymbolDef = { char: '●', color: '#FF9800' };
const STAR: SymbolDef = { char: '★', color: '#FDD835' };
const HRT:  SymbolDef = { char: '♥', color: '#E91E63' };
const PLUS: SymbolDef = { char: '✚', color: '#455A64' };
const XMRK: SymbolDef = { char: '✕', color: '#455A64' };
const DOT:  SymbolDef = { char: '•', color: '#333333' };
const DIAM: SymbolDef = { char: '◆', color: '#7B1FA2' };
const DASH: SymbolDef = { char: '—', color: '#455A64' };

// 6 benzersiz desen [SolÜst, SağÜst, SolAlt, SağAlt]
// Kasıtlı olarak benzer tutuldu — dikkat gerektiriyor!
const PATTERNS: SymbolDef[][] = [
    [SQ,   PLUS, TRI,  DOT ],   // 0
    [SQ,   XMRK, DOT,  TRI ],   // 1
    [SQ,   DASH, STAR, TRI ],   // 2
    [SQ,   PLUS, DOT,  CIR ],   // 3
    [SQ,   XMRK, HRT,  TRI ],   // 4
    [DIAM, PLUS, STAR, CIR ],   // 5
];

@Component({
    selector: 'app-symbol-block-match',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './symbol-block-match.component.html',
    styleUrl: './symbol-block-match.component.scss'
})
export class SymbolBlockMatchComponent implements OnInit {

    blocks: SymbolBlock[] = [];
    selectedBlockId: number | null = null;
    pairs: BlockPair[] = [];

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) {}

    get isSubmitted(): boolean {
        return this.gs.isCompleted(ID);
    }

    get totalPairs(): number {
        return PATTERNS.length;
    }

    ngOnInit(): void {
        this.initBlocks();

        const saved = this.gs.getData<SymbolBlockMatchState>(ID);
        if (saved?.pairs) {
            this.pairs = saved.pairs;
            this.pairs.forEach((p, idx) => {
                const a = this.blocks.find(b => b.id === p.aId);
                const b = this.blocks.find(b => b.id === p.bId);
                if (a) { a.isPaired = true; a.pairIndex = idx; }
                if (b) { b.isPaired = true; b.pairIndex = idx; }
            });
        }
    }

    // ── Blokları oluştur ve karıştır ─────────────────────────
    private initBlocks(): void {
        const raw: SymbolBlock[] = [];
        PATTERNS.forEach((pattern, pid) => {
            for (let copy = 0; copy < 2; copy++) {
                raw.push({
                    id: pid * 2 + copy,
                    patternId: pid,
                    cells: [...pattern],
                    isSelected: false,
                    isPaired: false,
                    pairIndex: null,
                });
            }
        });
        this.blocks = this.deterministicShuffle(raw);
    }

    /** Sabit sıra — sayfa yenilendiğinde aynı düzen */
    private deterministicShuffle(arr: SymbolBlock[]): SymbolBlock[] {
        const result = [...arr];
        let seed = 73;
        const rng = (): number => {
            seed = (seed * 16807) % 2147483647;
            return seed / 2147483647;
        };
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }

    /** İki bloğu doğru/yanlış olduğuna bakmadan sessizce eşleştirir — sonuç yalnızca Gönder'e basılınca belli olur. */
    onBlockClick(block: SymbolBlock): void {
        if (this.isSubmitted) return;
        if (block.isPaired) return;

        if (this.selectedBlockId === null) {
            block.isSelected = true;
            this.selectedBlockId = block.id;
        } else if (this.selectedBlockId === block.id) {
            block.isSelected = false;
            this.selectedBlockId = null;
        } else {
            const first = this.blocks.find(b => b.id === this.selectedBlockId)!;
            const newIndex = this.pairs.length;
            first.isPaired = true;
            first.isSelected = false;
            first.pairIndex = newIndex;
            block.isPaired = true;
            block.pairIndex = newIndex;
            this.pairs.push({ aId: first.id, bId: block.id });
            this.selectedBlockId = null;
            this.persist();
        }
    }

    /** Eşleşen bloğun rozet rengini/rakamını döndürür — öğretmen incelemesinde hangi blokların eşleştiğini ayırt etmek için. */
    pairBadgeColor(block: SymbolBlock): string {
        if (block.pairIndex === null) return '#94a3b8';
        return PAIR_BADGE_COLORS[block.pairIndex % PAIR_BADGE_COLORS.length];
    }

    checkAnswer(): void {
        if (this.pairs.length === 0) {
            this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
            return;
        }
        if (this.pairs.length < this.totalPairs) {
            this.fb.showFeedback('error', 'Lütfen tüm blokları eşleştirin!');
            return;
        }

        const allCorrect = this.pairs.every(p => {
            const a = this.blocks.find(b => b.id === p.aId);
            const b = this.blocks.find(b => b.id === p.bId);
            return !!a && !!b && a.patternId === b.patternId;
        });

        if (allCorrect) {
            this.gs.markCompleted(ID);
            this.fb.showFeedback('success', 'Harika! Tüm eşleşmeleri buldun!');
        } else {
            this.hintService.registerError(ID);
        }
    }

    clearSelection(): void {
        this.blocks.forEach(b => {
            b.isSelected = false;
            b.isPaired = false;
            b.pairIndex = null;
        });
        this.selectedBlockId = null;
        this.pairs = [];
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    private persist(): void {
        this.gs.save(ID, { pairs: this.pairs });
    }

    goPrev(): void {
        this.router.navigate(['/object-addition']);
    }

    goNext(): void {
        if (!this.isSubmitted) return;
        this.router.navigate(['/shade-sorting-2']);
    }
}
