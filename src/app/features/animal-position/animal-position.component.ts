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

interface AnimalPositionState {
    selectedId: number | null;
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'animal-position';

@Component({
    selector: 'app-animal-position',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './animal-position.component.html',
    styleUrl: './animal-position.component.scss',
})
export class AnimalPositionComponent implements OnInit {
    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) { }

    options: OptionItem[] = [
        { id: 1, name: 'Civciv', emoji: '🐥', isCorrect: false },
        { id: 2, name: 'Köpek', emoji: '🐶', isCorrect: false }, // Center referent
        { id: 3, name: 'Kedi', emoji: '🐱', isCorrect: true }, // The target: right of the dog
        { id: 4, name: 'Balık', emoji: '🐟', isCorrect: false },
        { id: 5, name: 'Fil', emoji: '🐘', isCorrect: false },
        { id: 6, name: 'Papağan', emoji: '🦜', isCorrect: false },
        { id: 7, name: 'Ördek', emoji: '🦆', isCorrect: false },
        { id: 8, name: 'Eşek', emoji: '🐴', isCorrect: false },
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
        const saved = this.gs.getData<AnimalPositionState>(ID);
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
            this.fb.showFeedback('success', 'Tebrikler! Doğru hayvanı buldun!');
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
        this.router.navigate(['/multi-condition-selection']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/pattern-2']);
    }
}
