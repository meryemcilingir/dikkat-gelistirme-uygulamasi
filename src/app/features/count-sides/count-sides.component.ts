import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface ShapeSideQuestion {
    id: number;
    shapeType: 'triangle' | 'square' | 'pentagon' | 'hexagon';
    correctSides: number;
    selectedSides: number | null;
    color: string;
}

interface SavedState {
    selections: (number | null)[];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'count-sides';

const DATA: Omit<ShapeSideQuestion, 'selectedSides'>[] = [
    { id: 0, shapeType: 'triangle', correctSides: 3, color: '#ff7043' },
    { id: 1, shapeType: 'pentagon', correctSides: 5, color: '#5c6bc0' },
    { id: 2, shapeType: 'hexagon', correctSides: 6, color: '#26a69a' }
];

@Component({
    selector: 'app-count-sides',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './count-sides.component.html',
    styleUrl: './count-sides.component.scss',
})
export class CountSidesComponent implements OnInit {
    questions: ShapeSideQuestion[] = this.createFresh();
    feedbackState: 'correct' | 'wrong' | null = null;
    options = [3, 4, 5, 6, 7, 8];

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
                if (this.questions[i]) this.questions[i].selectedSides = sel;
            });
        }
    }

    private createFresh(): ShapeSideQuestion[] {
        return DATA.map(d => ({ ...d, selectedSides: null }));
    }

    private persist(): void {
        this.gs.save(ID, {
            selections: this.questions.map(q => q.selectedSides),
            feedbackState: this.feedbackState
        });
    }

    select(q: ShapeSideQuestion, val: number): void {
        if (this.feedbackState === 'correct') return;
        q.selectedSides = q.selectedSides === val ? null : val;
        this.feedbackState = null;
        this.persist();
    }

    clearAll(): void {
        this.questions = this.createFresh();
        this.feedbackState = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    checkAnswers(): void {
        const allAnswered = this.questions.every(q => q.selectedSides !== null);
        if (!allAnswered) {
            this.fb.showFeedback('error', 'Lütfen tüm şekillerin kenar sayısını işaretleyin!');
            return;
        }

        const allCorrect = this.questions.every(q => q.selectedSides === q.correctSides);

        if (allCorrect) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Harika! Bütün şekillerin kenarlarını doğru saydın! 📐');
        } else {
            this.hintService.registerError(ID);
            this.feedbackState = 'wrong';

            if (this.showHint) {
                this.questions.forEach(q => {
                    if (q.selectedSides !== q.correctSides) q.selectedSides = null;
                });
            }

            this.fb.showFeedback('error', 'Bazı cevaplar hatalı, kenarları tekrar saymayı dene!');
        }
        this.persist();
    }

    goPrev(): void { this.router.navigate(['/rotate-shape']); }
    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/sort-by-size']);
    }
}
