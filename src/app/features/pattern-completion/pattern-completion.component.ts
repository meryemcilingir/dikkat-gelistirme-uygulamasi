import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export type PatternShape = 'triangle' | 'square' | 'circle';

interface OptionItem {
    id: number;
    sequence: PatternShape[];
    isCorrect: boolean;
    isShaking?: boolean;
}

interface PatternCompletionState {
    selectedId: number | null;
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'pattern-completion';

@Component({
    selector: 'app-pattern-completion',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './pattern-completion.component.html',
    styleUrl: './pattern-completion.component.scss'
})
export class PatternCompletionComponent implements OnInit {

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) { }

    // Görüntüdeki örüntü: üçgen, kare, daire, daire, üçgen, ... devamı: daire, daire
    // Pattern: triangle, square, circle, circle, triangle → next: circle, circle
    readonly givenPattern: PatternShape[] = [
        'triangle', 'square', 'circle', 'circle', 'triangle'
    ];

    // Boş kısım: 2 şekil
    readonly missingCount = 2;

    // Seçenekler
    options: OptionItem[] = [
        { id: 1, sequence: ['circle', 'circle'], isCorrect: false },
        { id: 2, sequence: ['triangle', 'circle'], isCorrect: false },
        { id: 3, sequence: ['square', 'circle'], isCorrect: true },
        { id: 4, sequence: ['circle', 'triangle'], isCorrect: false },
    ];

    selectedId: number | null = null;
    feedbackState: 'correct' | 'wrong' | null = null;

    get showHint(): boolean {
        return this.hintService.shouldShowHint(ID);
    }

    get isNextUnlocked(): boolean {
        return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
    }

    get selectedSequence(): PatternShape[] | null {
        if (this.selectedId === null) return null;
        const opt = this.options.find(o => o.id === this.selectedId);
        return opt ? opt.sequence : null;
    }

    ngOnInit(): void {
        const saved = this.gs.getData<PatternCompletionState>(ID);
        if (saved) {
            this.selectedId = saved.selectedId;
            this.feedbackState = saved.feedbackState;
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            selectedId: this.selectedId,
            feedbackState: this.feedbackState
        });
    }

    selectOption(id: number): void {
        if (this.feedbackState === 'correct' || this.gs.isCompleted(ID)) return;

        if (this.selectedId === id) {
            this.selectedId = null;
        } else {
            this.selectedId = id;
        }

        this.feedbackState = null;
        this.persist();
    }

    clearSelection(): void {
        this.selectedId = null;
        this.feedbackState = null;
        this.options.forEach(o => {
            o.isShaking = false;
        });
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    checkAnswer(): void {
        if (this.selectedId === null) return;

        const selected = this.options.find(o => o.id === this.selectedId)!;

        if (selected.isCorrect) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Tebrikler! Doğru örüntüyü buldun!');
        } else {
            this.feedbackState = 'wrong';
            this.hintService.registerError(ID);

            this.selectedId = null;
            selected.isShaking = true;
            setTimeout(() => (selected.isShaking = false), 500);

            this.fb.showFeedback('error', 'Yanlış seçim, tekrar dene.');
        }
        this.persist();
    }

    goPrev(): void {
        this.router.navigate(['/cylinder-selection']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/shape-counting']);
    }
}
