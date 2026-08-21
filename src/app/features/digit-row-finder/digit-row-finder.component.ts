import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface DigitRow {
    id: number;
    digits: number[];
    colorHex: string;
    isCorrect: boolean;
    isSelected: boolean;
    isShaking: boolean;
}

interface DigitRowState {
    rows: DigitRow[];
}

const ID = 'digit-row-finder';

// Standart: 4 1 4 1 4 1 4 1 4 1 4 1
// Farklı (id=4): 4 1 4 1 4 1 4 4 4 1 4 1 (indeks 7'de 1→4)
const STD: number[] = [4, 1, 4, 1, 4, 1, 4, 1, 4, 1, 4, 1];
const DIF: number[] = [4, 1, 4, 1, 4, 1, 4, 4, 4, 1, 4, 1];

@Component({
    selector: 'app-digit-row-finder',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './digit-row-finder.component.html',
    styleUrl: './digit-row-finder.component.scss'
})
export class DigitRowFinderComponent implements OnInit {

    rows: DigitRow[] = [
        { id: 1, colorHex: '#e53935', isCorrect: false, isSelected: false, isShaking: false, digits: [...STD] },
        { id: 2, colorHex: '#8e24aa', isCorrect: false, isSelected: false, isShaking: false, digits: [...STD] },
        { id: 3, colorHex: '#0288d1', isCorrect: false, isSelected: false, isShaking: false, digits: [...STD] },
        { id: 4, colorHex: '#2e7d32', isCorrect: true,  isSelected: false, isShaking: false, digits: [...DIF] },
        { id: 5, colorHex: '#f57c00', isCorrect: false, isSelected: false, isShaking: false, digits: [...STD] },
        { id: 6, colorHex: '#37474f', isCorrect: false, isSelected: false, isShaking: false, digits: [...STD] },
    ];

    isChecking = false;

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) {}

    get showHint(): boolean { return this.hintService.shouldShowHint(ID); }
    get isNextUnlocked(): boolean { return this.gs.isCompleted(ID); }

    ngOnInit(): void {
        const saved = this.gs.getData<DigitRowState>(ID);
        if (saved?.rows) this.rows = saved.rows;
    }

    persist(): void {
        this.gs.save(ID, { rows: this.rows });
    }

    selectRow(id: number): void {
        if (this.isChecking || this.isNextUnlocked) return;
        this.rows.forEach(r => (r.isSelected = false));
        const sel = this.rows.find(r => r.id === id);
        if (sel) sel.isSelected = true;
        this.persist();
    }

    checkAnswer(): void {
        const sel = this.rows.find(r => r.isSelected);
        if (!sel) {
            this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
            return;
        }
        if (sel.isCorrect) {
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Harika! Farklı olan sırayı doğru buldun!');
            this.persist();
        } else {
            this.isChecking = true;
            this.hintService.registerError(ID);
            sel.isShaking = true;
            this.persist();
            sel.isSelected = false;
            this.fb.showFeedback('error', 'Bu sıra diğerleriyle aynı. Dikkatli bak!');
            setTimeout(() => {
                sel.isShaking = false;
                this.isChecking = false;
            }, 500);
        }
    }

    clearSelection(): void {
        this.rows.forEach(r => { r.isSelected = false; r.isShaking = false; });
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    goPrev(): void { this.router.navigate(['/number-grid-match']); }
    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/number-color-match']);
    }
}
