import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface ShapeOption {
    id: number;
    label: string;
    shape: 'triangle' | 'square' | 'circle' | 'rectangle';
    isCorrect: boolean;
    isShaking?: boolean;
}

interface IceCreamShapeState {
    selectedId: number | null;
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'ice-cream-shape';

@Component({
    selector: 'app-ice-cream-shape',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './ice-cream-shape.component.html',
    styleUrl: './ice-cream-shape.component.scss'
})
export class IceCreamShapeComponent implements OnInit {

    options: ShapeOption[] = [
        { id: 1, label: 'Üçgen', shape: 'triangle', isCorrect: true },
        { id: 2, label: 'Kare', shape: 'square', isCorrect: false },
        { id: 3, label: 'Daire', shape: 'circle', isCorrect: false },
        { id: 4, label: 'Dikdörtgen', shape: 'rectangle', isCorrect: false },
    ];

    selectedId: number | null = null;
    feedbackState: 'correct' | 'wrong' | null = null;

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) { }

    get showHint(): boolean {
        return this.hintService.shouldShowHint(ID);
    }

    get isNextUnlocked(): boolean {
        return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<IceCreamShapeState>(ID);
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
        if (this.feedbackState === 'correct') return;
        this.selectedId = id;
        this.feedbackState = null;
        this.persist();
    }

    clearSelection(): void {
        this.selectedId = null;
        this.feedbackState = null;
        this.options.forEach(o => o.isShaking = false);
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
            this.fb.showFeedback('success', 'Tebrikler! Dondurma külahı üçgene benziyor!');
        } else {
            this.feedbackState = 'wrong';
            this.hintService.registerError(ID);
            selected.isShaking = true;
            setTimeout(() => (selected.isShaking = false), 500);
            this.fb.showFeedback('error', 'Tekrar dene. Külahın şekline dikkat et.');
        }
        this.persist();
    }

    goPrev(): void {
        this.router.navigate(['/letter-grid']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/most-colorful-ball']);
    }
}
