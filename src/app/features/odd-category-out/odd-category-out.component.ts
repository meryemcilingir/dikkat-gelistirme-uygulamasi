import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface CategoryItem {
    id: number;
    name: string;
    emoji: string;
    isOdd: boolean; // true = kategoriye uymayan
}

interface CategoryQuestion {
    id: number;
    items: CategoryItem[];
    hint: string; // kategori ipucu
    selectedId: number | null;
}

interface SavedState {
    selections: (number | null)[];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'odd-category-out';

const QUESTIONS_DATA: Omit<CategoryQuestion, 'selectedId'>[] = [
    {
        id: 0,
        hint: '3 tanesi aynı grupta',
        items: [
            { id: 1, name: 'Köpek', emoji: '🐶', isOdd: false },
            { id: 2, name: 'Kedi', emoji: '🐱', isOdd: false },
            { id: 3, name: 'Araba', emoji: '🚗', isOdd: true },
            { id: 4, name: 'Tavşan', emoji: '🐰', isOdd: false },
        ],
    },
    {
        id: 1,
        hint: '3 tanesi aynı grupta',
        items: [
            { id: 5, name: 'Elma', emoji: '🍎', isOdd: false },
            { id: 6, name: 'Muz', emoji: '🍌', isOdd: false },
            { id: 7, name: 'Kalem', emoji: '✏️', isOdd: true },
            { id: 8, name: 'Üzüm', emoji: '🍇', isOdd: false },
        ],
    },
    {
        id: 2,
        hint: '3 tanesi aynı grupta',
        items: [
            { id: 9,  name: 'Uçak', emoji: '✈️', isOdd: false },
            { id: 10, name: 'Bisiklet', emoji: '🚲', isOdd: false },
            { id: 11, name: 'Gemi', emoji: '🚢', isOdd: false },
            { id: 12, name: 'Pizza', emoji: '🍕', isOdd: true },
        ],
    },
    {
        id: 3,
        hint: '3 tanesi aynı grupta',
        items: [
            { id: 13, name: 'Keman', emoji: '🎻', isOdd: false },
            { id: 14, name: 'Gitar', emoji: '🎸', isOdd: false },
            { id: 15, name: 'Sandalye', emoji: '🪑', isOdd: true },
            { id: 16, name: 'Davul', emoji: '🥁', isOdd: false },
        ],
    },
];


@Component({
    selector: 'app-odd-category-out',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './odd-category-out.component.html',
    styleUrl: './odd-category-out.component.scss',
})
export class OddCategoryOutComponent implements OnInit {
    questions: CategoryQuestion[] = this.createFresh();
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

    private createFresh(): CategoryQuestion[] {
        return QUESTIONS_DATA.map(q => ({ ...q, selectedId: null }));
    }

    private persist(): void {
        this.gs.save(ID, {
            selections: this.questions.map(q => q.selectedId),
            feedbackState: this.feedbackState,
        });
    }

    select(question: CategoryQuestion, item: CategoryItem): void {
        if (this.feedbackState === 'correct') return;
        question.selectedId = item.id;
        this.feedbackState = null;
        this.persist();
    }

    isSelected(question: CategoryQuestion, item: CategoryItem): boolean {
        return question.selectedId === item.id;
    }

    isWrong(question: CategoryQuestion, item: CategoryItem): boolean {
        return this.feedbackState === 'wrong'
            && question.selectedId === item.id
            && !item.isOdd;
    }

    isCorrect(question: CategoryQuestion, item: CategoryItem): boolean {
        return this.feedbackState === 'correct'
            && question.selectedId === item.id
            && item.isOdd;
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
            const selected = q.items.find(i => i.id === q.selectedId);
            return selected?.isOdd === true;
        });

        if (allCorrect) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Tebrikler! Kategoriye uymayanları doğru buldun! 🎉');
        } else {
            this.hintService.registerError(ID);
            this.feedbackState = 'wrong';

            if (this.showHint) {
                this.questions.forEach(q => {
                    const selected = q.items.find(i => i.id === q.selectedId);
                    if (selected && !selected.isOdd) q.selectedId = null;
                });
            }

            this.fb.showFeedback('error', 'Bazı yanıtlar yanlış, tekrar dene!');
        }
        this.persist();
    }

    goPrev(): void { this.router.navigate(['/missing-number']); }
    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/mirror-letter']);
    }
}
