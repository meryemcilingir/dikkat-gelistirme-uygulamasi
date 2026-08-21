import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export type ShapeKind = 'circle' | 'star';
export type FillColor = 'purple' | 'orange';

interface ColorOption {
    id: number;
    colors: FillColor[];
    isCorrect: boolean;
    isShaking?: boolean;
}

interface NumberColorState {
    selectedId: number | null;
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'number-color-match';

@Component({
    selector: 'app-number-color-match',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './number-color-match.component.html',
    styleUrl: './number-color-match.component.scss'
})
export class NumberColorMatchComponent implements OnInit {

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) {}

    // Referans 3×3: daire ve yıldız dama deseni
    // Kural: Daire → mor, Yıldız → turuncu
    readonly referenceGrid: ShapeKind[] = [
        'circle', 'star',   'circle',
        'star',   'circle', 'star',
        'circle', 'star',   'circle'
    ];

    options: ColorOption[] = [
        {
            id: 1, isCorrect: true,
            colors: ['purple', 'orange', 'purple', 'orange', 'purple', 'orange', 'purple', 'orange', 'purple']
        },
        {
            id: 2, isCorrect: false,
            // Renkler tamamen ters
            colors: ['orange', 'purple', 'orange', 'purple', 'orange', 'purple', 'orange', 'purple', 'orange']
        },
        {
            id: 3, isCorrect: false,
            // İlk satırda hata: circle → orange (olmalı purple)
            colors: ['orange', 'orange', 'purple', 'orange', 'purple', 'orange', 'purple', 'orange', 'purple']
        }
    ];

    selectedId: number | null = null;
    feedbackState: 'correct' | 'wrong' | null = null;

    get showHint(): boolean { return this.hintService.shouldShowHint(ID); }
    get isNextUnlocked(): boolean {
        return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<NumberColorState>(ID);
        if (saved) {
            this.selectedId = saved.selectedId;
            this.feedbackState = saved.feedbackState;
        }
    }

    private persist(): void {
        this.gs.save(ID, { selectedId: this.selectedId, feedbackState: this.feedbackState });
    }

    selectOption(id: number): void {
        if (this.feedbackState === 'correct' || this.gs.isCompleted(ID)) return;
        this.selectedId = this.selectedId === id ? null : id;
        this.feedbackState = null;
        this.persist();
    }

    clearSelection(): void {
        this.selectedId = null;
        this.feedbackState = null;
        this.options.forEach(o => (o.isShaking = false));
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    checkAnswer(): void {
        if (this.selectedId === null) {
            this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
            return;
        }
        const selected = this.options.find(o => o.id === this.selectedId)!;
        if (selected.isCorrect) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Tebrikler! Doğru renk eşleştirmesini buldun!');
        } else {
            this.feedbackState = 'wrong';
            this.hintService.registerError(ID);
            selected.isShaking = true;
            setTimeout(() => (selected.isShaking = false), 500);
            this.fb.showFeedback('error', 'Yanlış! Daireleri mora, yıldızları turuncuya boyamalısın.');
        }
        this.persist();
    }

    goPrev(): void { this.router.navigate(['/digit-row-finder']); }
    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/symbol-sequence-match']);
    }
}
