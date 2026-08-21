import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface ImageCard {
    id: number;
    scene: string[];   // array of emojis composing the "scene"
    isDifferent: boolean;
}

interface ImageRow {
    id: number;
    cards: ImageCard[];
    selectedId: number | null;
}

interface FindDifferentState {
    selections: (number | null)[];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'find-different';

@Component({
    selector: 'app-find-different',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './find-different.component.html',
    styleUrl: './find-different.component.scss'
})
export class FindDifferentComponent implements OnInit {
    rows: ImageRow[] = [
        {
            id: 1,
            cards: [
                { id: 1, scene: ['🌅', '🌳', '🏠'], isDifferent: false },
                { id: 2, scene: ['🌅', '🌲', '🏠'], isDifferent: true },
                { id: 3, scene: ['🌅', '🌳', '🏠'], isDifferent: false }
            ],
            selectedId: null
        },
        {
            id: 2,
            cards: [
                { id: 1, scene: ['🏔️', '🌸', '🦋'], isDifferent: false },
                { id: 2, scene: ['🏔️', '🌸', '🦋'], isDifferent: false },
                { id: 3, scene: ['🏔️', '🌺', '🦋'], isDifferent: true }
            ],
            selectedId: null
        }
    ];

    feedbackState: 'correct' | 'wrong' | null = null;

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) { }

    get showHints(): boolean {
        return this.hintService.shouldShowHint(ID);
    }

    get isNextUnlocked(): boolean {
        return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<FindDifferentState>(ID);
        if (saved) {
            saved.selections.forEach((sel, i) => {
                if (this.rows[i]) this.rows[i].selectedId = sel;
            });
            this.feedbackState = saved.feedbackState;
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            selections: this.rows.map(r => r.selectedId),
            feedbackState: this.feedbackState
        });
    }

    selectCard(rowIdx: number, cardId: number): void {
        if (this.gs.isCompleted(ID) && this.feedbackState === 'correct') return;
        const row = this.rows[rowIdx];
        row.selectedId = row.selectedId === cardId ? null : cardId;
        this.feedbackState = null;
        this.persist();
    }

    clearSelections(): void {
        this.rows.forEach(r => r.selectedId = null);
        this.feedbackState = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    checkAnswers(): void {
        const allSelected = this.rows.every(r => r.selectedId !== null);
        if (!allSelected) {
            this.fb.showFeedback('error', 'Lütfen her bloktan farklı olan görseli seçin.');
            return;
        }

        const isCorrect = this.rows.every(row => {
            const selectedCard = row.cards.find(c => c.id === row.selectedId);
            return selectedCard?.isDifferent === true;
        });

        this.feedbackState = isCorrect ? 'correct' : 'wrong';

        if (isCorrect) {
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Harika! Farklı görselleri doğru buldun!');
        } else {
            this.hintService.registerError(ID);
            this.fb.showFeedback('error', 'Bazı seçimler yanlış. Görselleri dikkatlice karşılaştır.');
        }
        this.persist();
    }

    isHintCorrect(rowIdx: number, cardId: number): boolean {
        if (!this.showHints) return false;
        const row = this.rows[rowIdx];
        const card = row.cards.find(c => c.id === cardId);
        return card?.isDifferent === true && row.selectedId !== cardId;
    }

    isHintWrong(rowIdx: number, cardId: number): boolean {
        if (!this.showHints) return false;
        const row = this.rows[rowIdx];
        const card = row.cards.find(c => c.id === cardId);
        return card?.isDifferent === false && row.selectedId === cardId;
    }

    goPrev(): void {
        this.router.navigate(['/elderly-people']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/cylinder-selection']);
    }
}
