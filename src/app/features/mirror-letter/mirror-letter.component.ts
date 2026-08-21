import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

// transform tipi: 'normal' | 'mirror-x' | 'mirror-y' | 'rotate-180'
export type LetterTransform = 'normal' | 'mirror-x' | 'mirror-y' | 'rotate-180';

export interface MirrorOption {
    id: number;
    transform: LetterTransform;
    isCorrect: boolean; // true = 'normal' (yani aynının kendisi)
}

export interface MirrorQuestion {
    id: number;
    letter: string;       // Gösterilecek referans harf
    color: string;
    options: MirrorOption[];
    selectedId: number | null;
}

interface SavedState {
    selections: (number | null)[];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'mirror-letter';

// Her soru: harf + renk. Seçenekler sabit şemada: normal, mirror-x, mirror-y, rotate-180
const QUESTIONS_DATA: Pick<MirrorQuestion, 'id' | 'letter' | 'color'>[] = [
    { id: 0, letter: 'b', color: '#5c6bc0' },
    { id: 1, letter: 'p', color: '#ef5350' },
    { id: 2, letter: 'd', color: '#26a69a' },
    { id: 3, letter: 'q', color: '#f9a825' },
];

// Her soru için seçenek düzeni — hangi pozisyonda 'normal' (doğru) olduğu değişiyor
const OPTION_LAYOUTS: { transform: LetterTransform; isCorrect: boolean }[][] = [
    [
        { transform: 'mirror-x',   isCorrect: false },
        { transform: 'normal',     isCorrect: true  },
        { transform: 'rotate-180', isCorrect: false },
        { transform: 'mirror-y',   isCorrect: false },
    ],
    [
        { transform: 'normal',     isCorrect: true  },
        { transform: 'mirror-y',   isCorrect: false },
        { transform: 'mirror-x',   isCorrect: false },
        { transform: 'rotate-180', isCorrect: false },
    ],
    [
        { transform: 'rotate-180', isCorrect: false },
        { transform: 'mirror-y',   isCorrect: false },
        { transform: 'normal',     isCorrect: true  },
        { transform: 'mirror-x',   isCorrect: false },
    ],
    [
        { transform: 'mirror-y',   isCorrect: false },
        { transform: 'rotate-180', isCorrect: false },
        { transform: 'mirror-x',   isCorrect: false },
        { transform: 'normal',     isCorrect: true  },
    ],
    [
        { transform: 'mirror-x',   isCorrect: false },
        { transform: 'rotate-180', isCorrect: false },
        { transform: 'mirror-y',   isCorrect: false },
        { transform: 'normal',     isCorrect: true  },
    ],
    [
        { transform: 'normal',     isCorrect: true  },
        { transform: 'mirror-x',   isCorrect: false },
        { transform: 'rotate-180', isCorrect: false },
        { transform: 'mirror-y',   isCorrect: false },
    ],
];

function transformToCSS(t: LetterTransform): string {
    switch (t) {
        case 'mirror-x':   return 'scaleX(-1)';
        case 'mirror-y':   return 'scaleY(-1)';
        case 'rotate-180': return 'rotate(180deg)';
        default:           return 'none';
    }
}

@Component({
    selector: 'app-mirror-letter',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './mirror-letter.component.html',
    styleUrl: './mirror-letter.component.scss',
})
export class MirrorLetterComponent implements OnInit {
    questions: MirrorQuestion[] = this.createFresh();
    feedbackState: 'correct' | 'wrong' | null = null;

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService,
    ) {}

    get showHint(): boolean { return this.hintService.shouldShowHint(ID); }
    get isNextUnlocked(): boolean {
        return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<SavedState>(ID);
        if (saved) {
            this.feedbackState = saved.feedbackState;
            saved.selections.forEach((sel, i) => {
                if (this.questions[i]) this.questions[i].selectedId = sel;
            });
        }
    }

    private createFresh(): MirrorQuestion[] {
        return QUESTIONS_DATA.map((qd, qi) => ({
            ...qd,
            selectedId: null,
            options: OPTION_LAYOUTS[qi % OPTION_LAYOUTS.length].map((opt, oi) => ({
                id: qi * 10 + oi,
                ...opt,
            })),
        }));
    }

    private persist(): void {
        this.gs.save(ID, {
            selections: this.questions.map(q => q.selectedId),
            feedbackState: this.feedbackState,
        });
    }

    getTransform(t: LetterTransform): string {
        return transformToCSS(t);
    }

    select(question: MirrorQuestion, option: MirrorOption): void {
        if (this.feedbackState === 'correct') return;
        question.selectedId = option.id;
        this.feedbackState = null;
        this.persist();
    }

    isSelected(q: MirrorQuestion, opt: MirrorOption): boolean {
        return q.selectedId === opt.id;
    }

    isCorrectState(q: MirrorQuestion, opt: MirrorOption): boolean {
        return this.feedbackState === 'correct' && q.selectedId === opt.id && opt.isCorrect;
    }

    isWrongState(q: MirrorQuestion, opt: MirrorOption): boolean {
        return this.feedbackState === 'wrong' && q.selectedId === opt.id && !opt.isCorrect;
    }

    clearAll(): void {
        this.questions = this.createFresh();
        this.feedbackState = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    checkAnswers(): void {
        const allSelected = this.questions.every(q => q.selectedId !== null);
        if (!allSelected) {
            this.fb.showFeedback('error', 'Lütfen önce bir seçim yapın!');
            return;
        }

        const allCorrect = this.questions.every(q => {
            const opt = q.options.find(o => o.id === q.selectedId);
            return opt?.isCorrect === true;
        });

        if (allCorrect) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Tebrikler! Harflerin aynısını doğru buldun! 🎉');
        } else {
            this.hintService.registerError(ID);
            this.feedbackState = 'wrong';

            if (this.showHint) {
                this.questions.forEach(q => {
                    const opt = q.options.find(o => o.id === q.selectedId);
                    if (opt && !opt.isCorrect) q.selectedId = null;
                });
            }

            this.fb.showFeedback('error', 'Bazı yanıtlar yanlış, tekrar dene!');
        }
        this.persist();
    }

    goPrev(): void { this.router.navigate(['/odd-category-out']); }
    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/letter-count']);
    }
}
