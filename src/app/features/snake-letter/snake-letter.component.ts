import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface LetterOption {
    id: number;
    letter: string;
    color: string;      // letter color
    bgColor: string;    // circle background
    isCorrect: boolean;
    isShaking?: boolean;
}

interface SnakeLetterState {
    selectedId: number | null;
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'snake-letter';

@Component({
    selector: 'app-snake-letter',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './snake-letter.component.html',
    styleUrl: './snake-letter.component.scss'
})
export class SnakeLetterComponent implements OnInit {

    options: LetterOption[] = [
        { id: 0, letter: 'S', color: '#e85c3a', bgColor: '#fff2b8', isCorrect: true  },
        { id: 1, letter: 'F', color: '#5e3d99', bgColor: '#d8c4e8', isCorrect: false },
        { id: 2, letter: 'T', color: '#3d6b2e', bgColor: '#c8a882', isCorrect: false },
        { id: 3, letter: 'A', color: '#5e3d99', bgColor: '#b8d8a8', isCorrect: false },
    ];

    selectedId: number | null = null;
    feedbackState: 'correct' | 'wrong' | null = null;

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) {}

    get showHint(): boolean {
        return this.hintService.shouldShowHint(ID);
    }

    get isNextUnlocked(): boolean {
        return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<SnakeLetterState>(ID);
        if (saved) {
            this.selectedId = saved.selectedId ?? null;
            this.feedbackState = saved.feedbackState ?? null;
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            selectedId: this.selectedId,
            feedbackState: this.feedbackState,
        });
    }

    onSelect(id: number): void {
        if (this.isNextUnlocked) return;
        this.selectedId = this.selectedId === id ? null : id;
        this.feedbackState = null;
        this.persist();
    }

    isHint(opt: LetterOption): boolean {
        return this.showHint && opt.isCorrect && this.selectedId !== opt.id;
    }

    checkAnswer(): void {
        if (this.selectedId === null) {
            this.fb.showFeedback('error', 'Lütfen bir sembol seçin.');
            return;
        }

        const selected = this.options.find(o => o.id === this.selectedId);
        if (selected?.isCorrect) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Harika! Doğru sembolü buldun!');
        } else {
            this.feedbackState = 'wrong';
            this.hintService.registerError(ID);
            if (selected) {
                selected.isShaking = true;
                setTimeout(() => {
                    if (selected) selected.isShaking = false;
                    this.selectedId = null;
                }, 500);
            }
            this.fb.showFeedback('error', 'Yanlış seçim. Dikkatli bak!');
        }
        this.persist();
    }

    clearSelection(): void {
        this.selectedId = null;
        this.feedbackState = null;
        this.options.forEach(o => o.isShaking = false);
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    goPrev(): void {
        this.router.navigate(['/ball-sequence']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/letter-color-match']);
    }
}
