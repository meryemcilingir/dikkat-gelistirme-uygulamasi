import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface LetterMatchItem {
    id: number;
    name: string;
    emoji: string;
    isCorrect: boolean;
    isSelected: boolean;
    isShaking: boolean;
}

export interface LetterMatchQuestion {
    id: number;
    letter: string;
    items: LetterMatchItem[];
    color: string;
}

interface SavedState {
    selections: { [questionId: number]: number[] };
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'first-letter-match';

const QUESTIONS_DATA: Omit<LetterMatchQuestion, 'items'>[] = [
    { id: 0, letter: 'E', color: '#ef5350' },
    { id: 1, letter: 'A', color: '#42a5f5' },
    { id: 2, letter: 'K', color: '#66bb6a' },
];

const ITEMS_DATA: { [qId: number]: Omit<LetterMatchItem, 'isSelected' | 'isShaking'>[] } = {
    0: [
        { id: 1, name: 'Elma', emoji: '🍎', isCorrect: true },
        { id: 3, name: 'Araba', emoji: '🚗', isCorrect: false },
        { id: 2, name: 'Ev', emoji: '🏠', isCorrect: true },
        { id: 4, name: 'Köpek', emoji: '🐶', isCorrect: false },
    ],
    1: [
        { id: 7, name: 'Gözlük', emoji: '👓', isCorrect: false },
        { id: 5, name: 'At', emoji: '🐴', isCorrect: true },
        { id: 8, name: 'Çiçek', emoji: '🌸', isCorrect: false },
        { id: 6, name: 'Arı', emoji: '🐝', isCorrect: true },
    ],
    2: [
        { id: 11, name: 'Balık', emoji: '🐟', isCorrect: false },
        { id: 12, name: 'Muz', emoji: '🍌', isCorrect: false },
        { id: 9, name: 'Kedi', emoji: '🐱', isCorrect: true },
        { id: 10, name: 'Kuş', emoji: '🐦', isCorrect: true },
    ]
};


@Component({
    selector: 'app-first-letter-match',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './first-letter-match.component.html',
    styleUrl: './first-letter-match.component.scss',
})
export class FirstLetterMatchComponent implements OnInit {
    questions: LetterMatchQuestion[] = this.createFreshQuestions();
    feedbackState: 'correct' | 'wrong' | null = null;

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService,
    ) {}

    get showHint(): boolean {
        return this.hintService.shouldShowHint(ID);
    }

    get isNextUnlocked(): boolean {
        return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<SavedState>(ID);
        if (saved) {
            this.feedbackState = saved.feedbackState;
            Object.keys(saved.selections).forEach(qId => {
                const question = this.questions.find(q => q.id === +qId);
                if (question) {
                    const selectedIds = saved.selections[+qId];
                    question.items.forEach(item => {
                        item.isSelected = selectedIds.includes(item.id);
                    });
                }
            });
        }
    }

    private createFreshQuestions(): LetterMatchQuestion[] {
        return QUESTIONS_DATA.map(q => ({
            ...q,
            items: ITEMS_DATA[q.id].map(item => ({ ...item, isSelected: false, isShaking: false }))
        }));
    }

    private persist(): void {
        const selections: { [key: number]: number[] } = {};
        this.questions.forEach(q => {
            selections[q.id] = q.items.filter(i => i.isSelected).map(i => i.id);
        });
        this.gs.save(ID, { selections, feedbackState: this.feedbackState });
    }

    toggleItem(question: LetterMatchQuestion, item: LetterMatchItem): void {
        if (this.feedbackState === 'correct') return;
        item.isSelected = !item.isSelected;
        this.feedbackState = null;
        this.persist();
    }

    clearAll(): void {
        this.questions = this.createFreshQuestions();
        this.feedbackState = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    checkAnswers(): void {
        const allAttempted = this.questions.every(q => q.items.some(i => i.isSelected));
        if (!allAttempted) {
            this.fb.showFeedback('error', 'Lütfen önce seçimlerinizi yapın!');
            return;
        }

        let allCorrect = true;
        this.questions.forEach(q => {
            q.items.forEach(i => {
                // Her doğru seçilmeli, hiçbir yanlış seçilmemeli
                if ((i.isCorrect && !i.isSelected) || (!i.isCorrect && i.isSelected)) {
                    allCorrect = false;
                }
            });
        });

        if (allCorrect) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Harika! Harflerle başlayan nesneleri doğru buldun! 🍎🏠');
        } else {
            this.hintService.registerError(ID);
            this.feedbackState = 'wrong';

            this.questions.forEach(q => {
                q.items.forEach(i => {
                    if (i.isSelected && !i.isCorrect) {
                        i.isShaking = true;
                        setTimeout(() => {
                            i.isShaking = false;
                            i.isSelected = false;
                            this.persist();
                        }, 600);
                    }
                });
            });

            this.fb.showFeedback('error', 'Bazı seçimlerin yanlış veya eksik, tekrar dene!');
        }
        this.persist();
    }

    goPrev(): void { this.router.navigate(['/letter-count']); }
    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/count-difference']);
    }
}
