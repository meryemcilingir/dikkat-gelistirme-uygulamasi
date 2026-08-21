import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface ShapeOption {
    id: number;
    variant: string;
    isCorrect: boolean;
    isShaking?: boolean;
}

export interface ShapeColumn {
    colId: number;
    ref: string;          // referans şekil variant adı
    options: ShapeOption[];
    selectedId: number | null;
}

interface ShapeMatchFindState {
    selections: (number | null)[];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'shape-match-find';

@Component({
    selector: 'app-shape-match-find',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './shape-match-find.component.html',
    styleUrl: './shape-match-find.component.scss'
})
export class ShapeMatchFindComponent implements OnInit {

    columns: ShapeColumn[] = [
        {
            colId: 0,
            ref: 'pac-circle',
            options: [
                { id: 0, variant: 'pac-circle-vert',  isCorrect: false },
                { id: 1, variant: 'pac-circle-left',  isCorrect: false },
                { id: 2, variant: 'pac-circle',       isCorrect: true  },
                { id: 3, variant: 'big-triangle',     isCorrect: false },
            ],
            selectedId: null,
        },
        {
            colId: 1,
            ref: 'green-x-square',
            options: [
                { id: 4, variant: 'green-x-square',   isCorrect: true  },
                { id: 5, variant: 'green-z',           isCorrect: false },
                { id: 6, variant: 'green-bowtie',      isCorrect: false },
                { id: 7, variant: 'green-bowtie-2',    isCorrect: false },
            ],
            selectedId: null,
        },
        {
            colId: 2,
            ref: 'purple-hex-x',
            options: [
                { id: 8,  variant: 'purple-hex',       isCorrect: false },
                { id: 9,  variant: 'purple-hex-x',     isCorrect: true  },
                { id: 10, variant: 'purple-cube',       isCorrect: false },
                { id: 11, variant: 'purple-cube-2',     isCorrect: false },
            ],
            selectedId: null,
        },
        {
            colId: 3,
            ref: 'watermelon',
            options: [
                { id: 12, variant: 'watermelon-orange', isCorrect: false },
                { id: 13, variant: 'watermelon',        isCorrect: true  },
                { id: 14, variant: 'watermelon-tall',    isCorrect: false },
                { id: 15, variant: 'watermelon-rect',    isCorrect: false },
            ],
            selectedId: null,
        },
        {
            colId: 4,
            ref: 'dark-circle-green',
            options: [
                { id: 16, variant: 'dark-circle-plain',   isCorrect: false },
                { id: 17, variant: 'dark-circle-big',      isCorrect: false },
                { id: 18, variant: 'dark-circle-pedestal', isCorrect: false },
                { id: 19, variant: 'dark-circle-green',    isCorrect: true  },
            ],
            selectedId: null,
        },
    ];

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

    get allSelected(): boolean {
        return this.columns.every(c => c.selectedId !== null);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<ShapeMatchFindState>(ID);
        if (saved) {
            saved.selections.forEach((sel, i) => {
                if (this.columns[i]) this.columns[i].selectedId = sel;
            });
            this.feedbackState = saved.feedbackState ?? null;
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            selections: this.columns.map(c => c.selectedId),
            feedbackState: this.feedbackState,
        });
    }

    selectOption(col: ShapeColumn, optId: number): void {
        if (this.isNextUnlocked) return;
        col.selectedId = col.selectedId === optId ? null : optId;
        this.feedbackState = null;
        this.persist();
    }

    checkAnswer(): void {
        if (this.columns.every(c => c.selectedId === null)) {
            this.fb.showFeedback('error', 'Lütfen her sütundan bir şekil seçin.');
            return;
        }
        if (!this.allSelected) {
            this.fb.showFeedback('error', 'Lütfen her sütundan bir şekil seçin.');
            return;
        }

        const isCorrect = this.columns.every(col => {
            const opt = col.options.find(o => o.id === col.selectedId);
            return opt?.isCorrect;
        });

        this.feedbackState = isCorrect ? 'correct' : 'wrong';

        if (isCorrect) {
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Harika! Tüm şekillerin eşini doğru buldun!');
        } else {
            this.hintService.registerError(ID);
        }
        this.persist();
    }

    clearSelection(): void {
        this.columns.forEach(c => {
            c.selectedId = null;
            c.options.forEach(o => o.isShaking = false);
        });
        this.feedbackState = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    isHint(col: ShapeColumn, opt: ShapeOption): boolean {
        return this.showHint && opt.isCorrect && col.selectedId !== opt.id;
    }

    goPrev(): void {
        this.router.navigate(['/symbol-grid-matching']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/count-apples']);
    }
}
