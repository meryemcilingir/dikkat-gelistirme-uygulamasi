import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface PatternCell {
    isMirrored: boolean;
}

export interface PatternOption {
    id: number;
    rows: PatternCell[][];
    isCorrect: boolean;
    isSelected?: boolean;
    isShaking?: boolean;
}

interface IdenticalPatternState {
    options: PatternOption[];
    isCompleted: boolean;
}

const ID = 'identical-pattern';

@Component({
    selector: 'app-identical-pattern',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './identical-pattern.component.html',
    styleUrl: './identical-pattern.component.scss'
})
export class IdenticalPatternComponent implements OnInit {

    // The correct pattern matching the image
    targetRows: PatternCell[][] = [
        [{ isMirrored: false }, { isMirrored: false }, { isMirrored: false }], // S S S
        [{ isMirrored: true }, { isMirrored: true }, { isMirrored: true }], // Z Z Z
        [{ isMirrored: false }, { isMirrored: false }, { isMirrored: false }], // S S S
        [{ isMirrored: true }, { isMirrored: true }, { isMirrored: true }]  // Z Z Z
    ];

    options: PatternOption[] = [
        {
            id: 1,
            isCorrect: false,
            rows: [
                [{ isMirrored: false }, { isMirrored: false }, { isMirrored: false }],
                [{ isMirrored: true }, { isMirrored: true }, { isMirrored: true }],
                [{ isMirrored: false }, { isMirrored: false }, { isMirrored: false }],
                [{ isMirrored: true }, { isMirrored: false }, { isMirrored: true }]  // 1 error here
            ]
        },
        {
            id: 2,
            isCorrect: false,
            rows: [
                [{ isMirrored: false }, { isMirrored: false }, { isMirrored: true }], // 1 error here
                [{ isMirrored: true }, { isMirrored: true }, { isMirrored: true }],
                [{ isMirrored: false }, { isMirrored: false }, { isMirrored: false }],
                [{ isMirrored: true }, { isMirrored: true }, { isMirrored: true }]
            ]
        },
        {
            id: 3,
            isCorrect: true, // DOĞRU SEÇENEK
            rows: [
                [{ isMirrored: false }, { isMirrored: false }, { isMirrored: false }], // S S S
                [{ isMirrored: true }, { isMirrored: true }, { isMirrored: true }], // Z Z Z
                [{ isMirrored: false }, { isMirrored: false }, { isMirrored: false }], // S S S
                [{ isMirrored: true }, { isMirrored: true }, { isMirrored: true }]  // Z Z Z
            ]
        },
        {
            id: 4,
            isCorrect: false,
            rows: [
                [{ isMirrored: false }, { isMirrored: false }, { isMirrored: false }],
                [{ isMirrored: true }, { isMirrored: true }, { isMirrored: true }],
                [{ isMirrored: true }, { isMirrored: true }, { isMirrored: true }], // Error row
                [{ isMirrored: true }, { isMirrored: true }, { isMirrored: true }]
            ]
        },
        {
            id: 5,
            isCorrect: false,
            rows: [
                [{ isMirrored: true }, { isMirrored: true }, { isMirrored: false }], // Error row
                [{ isMirrored: true }, { isMirrored: true }, { isMirrored: true }],
                [{ isMirrored: false }, { isMirrored: true }, { isMirrored: false }], // Error row
                [{ isMirrored: true }, { isMirrored: true }, { isMirrored: true }]
            ]
        }
    ];

    isChecking = false;

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) { }

    get showHint(): boolean {
        return this.hintService.shouldShowHint(ID);
    }

    get isNextUnlocked(): boolean {
        return this.gs.isCompleted(ID);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<IdenticalPatternState>(ID);
        if (saved && saved.options) {
            this.options = saved.options;
        }
    }

    persist(): void {
        this.gs.save(ID, {
            options: this.options,
            isCompleted: this.isNextUnlocked
        });
    }

    selectOption(id: number): void {
        if (this.isChecking || this.isNextUnlocked) return;

        this.options.forEach(opt => opt.isSelected = false);
        const selected = this.options.find(opt => opt.id === id);
        if (selected) {
            selected.isSelected = true;
        }
        this.persist();
    }

    checkAnswer(): void {
        const selectedOpt = this.options.find(opt => opt.isSelected);

        if (!selectedOpt) {
            this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
            return;
        }

        if (selectedOpt.isCorrect) {
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Harika! Örneğin aynısını buldunuz.');
            this.persist();
        } else {
            this.isChecking = true;
            this.hintService.registerError(ID);
            selectedOpt.isShaking = true;
            this.persist();
            this.fb.showFeedback('error', 'Bu doğru örnek değil. Farklı birine tekrar bakmalısın.');

            setTimeout(() => {
                selectedOpt.isShaking = false;
                selectedOpt.isSelected = false; // reset selection after shake
                this.isChecking = false;
            }, 500);
        }
    }

    clearSelection(): void {
        this.options.forEach(opt => {
            opt.isSelected = false;
            opt.isShaking = false;
        });
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    goPrev(): void {
        this.router.navigate(['/letter-sequence']); // Previous page placeholder
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/match-size']);
    }
}
