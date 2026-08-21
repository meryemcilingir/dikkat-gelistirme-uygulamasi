import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface OptionItem {
    id: number;
    name: string;
    emoji: string;
    isCorrect: boolean;
    isShaking?: boolean;
}

interface LiquidSelectionState {
    selectedId: number | null;
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'liquid-selection';

@Component({
    selector: 'app-liquid-selection',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './liquid-selection.component.html',
    styleUrl: './liquid-selection.component.scss',
})
export class LiquidSelectionComponent implements OnInit {
    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) { }

    options: OptionItem[] = [
        { id: 1, name: 'Zeytin', emoji: '🫒', isCorrect: false },
        { id: 2, name: 'Süt', emoji: '🥛', isCorrect: true }, // The target: Süt (Milk)
        { id: 3, name: 'Elma', emoji: '🍎', isCorrect: false },
        { id: 4, name: 'Peynir', emoji: '🧀', isCorrect: false },
    ];

    selectedId: number | null = null;
    feedbackState: 'correct' | 'wrong' | null = null;

    get showHint(): boolean {
        return this.hintService.shouldShowHint(ID);
    }

    get isNextUnlocked(): boolean {
        return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<LiquidSelectionState>(ID);
        if (saved) {
            this.selectedId = saved.selectedId;
            this.feedbackState = saved.feedbackState;
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            selectedId: this.selectedId,
            feedbackState: this.feedbackState,
        });
    }

    selectOption(id: number): void {
        if (this.feedbackState === 'correct') return;
        this.selectedId = id;
        this.feedbackState = null;
        this.persist();
    }

    clearSelection(): void {
        this.selectedId = null;
        this.feedbackState = null;
        this.options.forEach((o) => (o.isShaking = false));
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    checkAnswer(): void {
        if (this.selectedId === null) {
            this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
            return;
        }

        if (this.selectedId === null) return;

        const selected = this.options.find((o) => o.id === this.selectedId)!;

        if (selected.isCorrect) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Tebrikler! Doğru maddeyi buldun!');
        } else {
            this.feedbackState = 'wrong';
            this.hintService.registerError(ID);
            this.selectedId = null; // Yanlış seçimi anında sil
            selected.isShaking = true;
            this.fb.showFeedback('error', 'Tekrar Denemelisin');
            setTimeout(() => (selected.isShaking = false), 500);
        }
        this.persist();
    }

    goPrev(): void {
        this.router.navigate(['/shape-coloring']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/longest-rope']);
    }
}
