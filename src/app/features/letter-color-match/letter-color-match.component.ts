import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface LetterCell {
    id: number;
    letter: string;
    color: string | null;
    isShaking?: boolean;
}

interface PaletteColor {
    name: string;
    value: string;
}

interface LetterColorMatchState {
    colors: (string | null)[];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'letter-color-match';

@Component({
    selector: 'app-letter-color-match',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './letter-color-match.component.html',
    styleUrl: './letter-color-match.component.scss'
})
export class LetterColorMatchComponent implements OnInit {

    cells: LetterCell[] = [
        { id: 0, letter: 'E', color: null },
        { id: 1, letter: 'a', color: null },
        { id: 2, letter: 'E', color: null },
        { id: 3, letter: 'k', color: null },
        { id: 4, letter: 'L', color: null },
        { id: 5, letter: 'k', color: null },
        { id: 6, letter: 'a', color: null },
        { id: 7, letter: 'L', color: null },
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
        const saved = this.gs.getData<LetterColorMatchState>(ID);
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

    /** Her renk en fazla 2 harfte kullanılabilir (harf grubu büyüklüğü) — aksi halde tıklama sessizce yok sayılır. */
    paintCell(cell: LetterCell): void {
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

    // Hücre "davetsiz misafir" mi?
    // Bu hücrenin rengini kullanan farklı-harfli hücre sayısı,
    // aynı-harfli (kendisi dahil) hücre sayısından >= ise → problemli.
    // Böylece grubun çoğunluğunu oluşturan hücreler parlamaz,
    // sadece gruba ters düşen/çakışan hücreler parlar.
    private isCellProblematic(cell: LetterCell): boolean {
        if (!cell.color) return true;
        const countSame = this.cells.filter(
            c => c.letter === cell.letter && c.color === cell.color
        ).length;
        const countOther = this.cells.filter(
            c => c.letter !== cell.letter && c.color === cell.color
        ).length;
        return countOther >= countSame;
    }

    isHint(cell: LetterCell): boolean {
        if (!this.showHint) return false;
        return this.isCellProblematic(cell);
    }

    checkAnswer(): void {
        if (!this.allPainted()) {
            this.fb.showFeedback('error', 'Lütfen tüm harfleri boyayın.');
            return;
        }

        // Her harf grubundaki renkler aynı olmalı
        const groupColors = new Map<string, string>();
        let groupsConsistent = true;
        for (const cell of this.cells) {
            const existing = groupColors.get(cell.letter);
            if (existing === undefined) {
                groupColors.set(cell.letter, cell.color!);
            } else if (existing !== cell.color) {
                groupsConsistent = false;
                break;
            }
        }

        // Farklı harf gruplarının renkleri farklı olmalı
        const distinct = new Set(groupColors.values()).size === groupColors.size;

        const isCorrect = groupsConsistent && distinct;

        if (isCorrect) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Harika! Eş harfleri doğru boyadın!');
        } else {
            this.feedbackState = 'wrong';
            this.hintService.registerError(ID);
            // Sadece gerçekten problemli hücreleri titret
            this.cells.forEach(cell => {
                if (this.isCellProblematic(cell)) {
                    cell.isShaking = true;
                    setTimeout(() => { cell.isShaking = false; }, 500);
                }
            });
            this.fb.showFeedback('error', 'Bazı harflerin rengi yanlış. Tekrar dene!');
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
        this.router.navigate(['/snake-letter']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/fruit-subtraction']);
    }
}
