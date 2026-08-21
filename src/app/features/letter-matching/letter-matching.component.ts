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
    text: string;
    isCorrect: boolean;
    isShaking?: boolean;
}

interface LetterMatchingState {
    selectedId: number | null;
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'letter-matching';

@Component({
    selector: 'app-letter-matching',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './letter-matching.component.html',
    styleUrl: './letter-matching.component.scss'
})
export class LetterMatchingComponent implements OnInit {

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) { }

    readonly targetWord = 'PRRPD';

    options: OptionItem[] = [
        { id: 1, text: 'PRRRP', isCorrect: false },
        { id: 2, text: 'PPRRD', isCorrect: false },
        { id: 3, text: 'RRPPD', isCorrect: false },
        { id: 4, text: 'PRRPD', isCorrect: true },
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
        const saved = this.gs.getData<LetterMatchingState>(ID);
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

        // Radio button logic: only one item can be selected, changes selection if another clicked
        if (this.selectedId === id) {
            this.selectedId = null; // Toggle off if clicked again
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
            this.fb.showFeedback('success', 'Tebrikler! Doğru harf dizisini buldun!');
        } else {
            this.feedbackState = 'wrong';
            this.hintService.registerError(ID);

            // Unselect and shake the wrongly selected option
            this.selectedId = null;
            selected.isShaking = true;
            setTimeout(() => (selected.isShaking = false), 500);

            this.fb.showFeedback('error', 'Tekrar Denemelisin');
        }
        this.persist();
    }

    goPrev(): void {
        this.router.navigate(['/longest-rope']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/shape-pattern']);
    }
}
