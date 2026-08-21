import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export type SymbolKey = 'star' | 'circle' | 'triangle' | 'diamond';

export interface SymbolCell {
    id: number;
    symbol: SymbolKey;
    color: string | null;
    isShaking?: boolean;
}

interface PaletteColor {
    name: string;
    value: string;
}

interface SymbolColorMatchState {
    colors: (string | null)[];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'symbol-color-match';

@Component({
    selector: 'app-symbol-color-match',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './symbol-color-match.component.html',
    styleUrl: './symbol-color-match.component.scss'
})
export class SymbolColorMatchComponent implements OnInit {

    // 4 sembol tipi, her birinden 2 tane — 4×2 grid
    cells: SymbolCell[] = [
        { id: 0, symbol: 'star',     color: null },
        { id: 1, symbol: 'circle',   color: null },
        { id: 2, symbol: 'star',     color: null },
        { id: 3, symbol: 'triangle', color: null },
        { id: 4, symbol: 'diamond',  color: null },
        { id: 5, symbol: 'triangle', color: null },
        { id: 6, symbol: 'circle',   color: null },
        { id: 7, symbol: 'diamond',  color: null },
    ];

    palette: PaletteColor[] = [
        { name: 'kırmızı', value: '#e74c3c' },
        { name: 'mavi',    value: '#3498db' },
        { name: 'yeşil',   value: '#27ae60' },
        { name: 'sarı',    value: '#f1c40f' },
    ];

    selectedColor: string | null = null;
    feedbackState: 'correct' | 'wrong' | null = null;

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) {}

    get showHint(): boolean {
        return this.hintService.shouldShowHint(ID);
    }

    get isNextUnlocked(): boolean {
        return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<SymbolColorMatchState>(ID);
        if (saved?.colors) {
            saved.colors.forEach((c, i) => {
                if (this.cells[i]) this.cells[i].color = c;
            });
            this.feedbackState = saved.feedbackState ?? null;
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            colors: this.cells.map(c => c.color),
            feedbackState: this.feedbackState,
        });
    }

    selectColor(value: string): void {
        if (this.isNextUnlocked) return;
        this.selectedColor = this.selectedColor === value ? null : value;
    }

    /** Her renk en fazla 2 sembolde kullanılabilir (sembol grubu büyüklüğü) — aksi halde tıklama sessizce yok sayılır. */
    paintCell(cell: SymbolCell): void {
        if (this.isNextUnlocked) return;
        if (!this.selectedColor) {
            this.fb.showFeedback('error', 'Önce bir renk seçin.');
            return;
        }
        if (cell.color === this.selectedColor) {
            cell.color = null;
        } else {
            const usageCount = this.cells.filter(c => c.id !== cell.id && c.color === this.selectedColor).length;
            if (usageCount >= 2) return;
            cell.color = this.selectedColor;
        }
        this.feedbackState = null;
        this.persist();
    }

    private allPainted(): boolean {
        return this.cells.every(c => c.color !== null);
    }

    private isCellProblematic(cell: SymbolCell): boolean {
        if (!cell.color) return true;
        const countSame = this.cells.filter(
            c => c.symbol === cell.symbol && c.color === cell.color
        ).length;
        const countOther = this.cells.filter(
            c => c.symbol !== cell.symbol && c.color === cell.color
        ).length;
        return countOther >= countSame;
    }

    isHint(cell: SymbolCell): boolean {
        if (!this.showHint) return false;
        return this.isCellProblematic(cell);
    }

    checkAnswer(): void {
        if (!this.allPainted()) {
            this.fb.showFeedback('error', 'Lütfen tüm sembolleri boyayın.');
            return;
        }

        const groupColors = new Map<string, string>();
        let groupsConsistent = true;
        for (const cell of this.cells) {
            const existing = groupColors.get(cell.symbol);
            if (existing === undefined) {
                groupColors.set(cell.symbol, cell.color!);
            } else if (existing !== cell.color) {
                groupsConsistent = false;
                break;
            }
        }

        const distinct = new Set(groupColors.values()).size === groupColors.size;
        const isCorrect = groupsConsistent && distinct;

        if (isCorrect) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Harika! Eş sembolleri doğru boyadın!');
        } else {
            this.feedbackState = 'wrong';
            this.hintService.registerError(ID);
            this.cells.forEach(cell => {
                if (this.isCellProblematic(cell)) {
                    cell.isShaking = true;
                    setTimeout(() => { cell.isShaking = false; }, 500);
                }
            });
            this.fb.showFeedback('error', 'Bazı sembollerin rengi yanlış. Tekrar dene!');
        }
        this.persist();
    }

    clearSelection(): void {
        this.cells.forEach(c => {
            c.color = null;
            c.isShaking = false;
        });
        this.selectedColor = null;
        this.feedbackState = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    goPrev(): void {
        this.router.navigate(['/flower-order']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/object-addition']);
    }
}
