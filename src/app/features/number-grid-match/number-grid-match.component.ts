import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface GridOption {
    id: number;
    cells: number[][];
    isCorrect: boolean;
    isSelected?: boolean;
    isShaking?: boolean;
}

interface NumberGridState {
    options: GridOption[];
    isCompleted: boolean;
}

const ID = 'number-grid-match';

@Component({
    selector: 'app-number-grid-match',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './number-grid-match.component.html',
    styleUrl: './number-grid-match.component.scss'
})
export class NumberGridMatchComponent implements OnInit {

    // Hedef: 3×3 rakam tablosu
    targetGrid: number[][] = [
        [7, 2, 5],
        [1, 8, 3],
        [6, 4, 9]
    ];

    options: GridOption[] = [
        {
            id: 1, isCorrect: false,
            cells: [[7, 2, 5], [1, 3, 8], [6, 4, 9]]   // 2. satırda 3 ve 8 yer değiştirmiş
        },
        {
            id: 2, isCorrect: false,
            cells: [[7, 2, 5], [1, 8, 3], [6, 9, 4]]   // 3. satırda 4 ve 9 yer değiştirmiş
        },
        {
            id: 3, isCorrect: true,
            cells: [[7, 2, 5], [1, 8, 3], [6, 4, 9]]   // DOĞRU
        },
        {
            id: 4, isCorrect: false,
            cells: [[2, 7, 5], [1, 8, 3], [6, 4, 9]]   // 1. satırda 7 ve 2 yer değiştirmiş
        },
        {
            id: 5, isCorrect: false,
            cells: [[7, 2, 5], [1, 8, 3], [4, 6, 9]]   // 3. satırda 6 ve 4 yer değiştirmiş
        }
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
        const saved = this.gs.getData<NumberGridState>(ID);
        if (saved?.options) {
            this.options = saved.options;
        }
    }

    persist(): void {
        this.gs.save(ID, { options: this.options, isCompleted: this.isNextUnlocked });
    }

    selectOption(id: number): void {
        if (this.isChecking || this.isNextUnlocked) return;
        this.options.forEach(opt => (opt.isSelected = false));
        const sel = this.options.find(opt => opt.id === id);
        if (sel) sel.isSelected = true;
        this.persist();
    }

    checkAnswer(): void {
        const sel = this.options.find(opt => opt.isSelected);
        if (!sel) {
            this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
            return;
        }
        if (sel.isCorrect) {
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Harika! Aynı tabloyu buldun!');
            this.persist();
        } else {
            this.isChecking = true;
            this.hintService.registerError(ID);
            sel.isShaking = true;
            this.persist();
            this.fb.showFeedback('error', 'Bu tablo farklı. Sayıları tek tek karşılaştır!');
            setTimeout(() => {
                sel.isShaking = false;
                sel.isSelected = false;
                this.isChecking = false;
            }, 500);
        }
    }

    clearSelection(): void {
        this.options.forEach(opt => { opt.isSelected = false; opt.isShaking = false; });
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    goPrev(): void { this.router.navigate(['/color-pattern-completion']); }
    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/digit-row-finder']);
    }
}
