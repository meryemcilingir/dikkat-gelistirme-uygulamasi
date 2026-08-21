import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface ContainerPair {
    id: number;
    left: { emoji: string; label: string; isCorrect: boolean };
    right: { emoji: string; label: string; isCorrect: boolean };
    selected: 'left' | 'right' | null;
}

interface WaterCapacityState {
    selections: ('left' | 'right' | null)[];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'water-capacity';

@Component({
    selector: 'app-water-capacity',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './water-capacity.component.html',
    styleUrl: './water-capacity.component.scss'
})
export class WaterCapacityComponent implements OnInit {
    pairs: ContainerPair[] = [
        {
            id: 1,
            left: { emoji: '🪣', label: 'Kova', isCorrect: true },
            right: { emoji: '🥤', label: 'Bardak', isCorrect: false },
            selected: null
        },
        {
            id: 2,
            left: { emoji: '🍲', label: 'Kase', isCorrect: true },
            right: { emoji: '🥛', label: 'Su Bardağı', isCorrect: false },
            selected: null
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
        const saved = this.gs.getData<WaterCapacityState>(ID);
        if (saved) {
            saved.selections.forEach((sel, i) => {
                if (this.pairs[i]) this.pairs[i].selected = sel;
            });
            this.feedbackState = saved.feedbackState;
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            selections: this.pairs.map(p => p.selected),
            feedbackState: this.feedbackState
        });
    }

    selectItem(pairIndex: number, side: 'left' | 'right'): void {
        if (this.gs.isCompleted(ID) && this.feedbackState === 'correct') return;
        this.pairs[pairIndex].selected = this.pairs[pairIndex].selected === side ? null : side;
        this.feedbackState = null;
        this.persist();
    }

    clearSelections(): void {
        this.pairs.forEach(p => p.selected = null);
        this.feedbackState = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    checkAnswers(): void {
        const allSelected = this.pairs.every(p => p.selected !== null);
        if (!allSelected) {
            this.fb.showFeedback('error', 'Lütfen her satırdan bir eşya seçin.');
            return;
        }

        const isCorrect = this.pairs.every(p => {
            if (p.selected === 'left') return p.left.isCorrect;
            if (p.selected === 'right') return p.right.isCorrect;
            return false;
        });

        this.feedbackState = isCorrect ? 'correct' : 'wrong';

        if (isCorrect) {
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Harika! Daha çok su alan eşyaları doğru buldun!');
        } else {
            this.hintService.registerError(ID);
            this.fb.showFeedback('error', 'Bazı seçimler yanlış, tekrar düşünelim.');
        }
        this.persist();
    }

    isHintCorrect(pairIndex: number, side: 'left' | 'right'): boolean {
        if (!this.showHints) return false;
        const pair = this.pairs[pairIndex];
        const item = side === 'left' ? pair.left : pair.right;
        return item.isCorrect && pair.selected !== side;
    }

    isHintWrong(pairIndex: number, side: 'left' | 'right'): boolean {
        if (!this.showHints) return false;
        const pair = this.pairs[pairIndex];
        const item = side === 'left' ? pair.left : pair.right;
        return !item.isCorrect && pair.selected === side;
    }

    goPrev(): void {
        this.router.navigate(['/incorrect-numbers']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/fruit-size-ranking']);
    }
}
