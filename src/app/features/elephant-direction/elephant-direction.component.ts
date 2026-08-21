import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';

interface ElephantItem { id: number; isFlipped: boolean; isShaking?: boolean; }

const GAME: ElephantItem[] = [
    { id: 0, isFlipped: false },
    { id: 1, isFlipped: false },
    { id: 2, isFlipped: true }, // ← correct answer
    { id: 3, isFlipped: false },
    { id: 4, isFlipped: false },
];

interface ElephantDirState {
    selectedId: number;
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'elephant-direction';

@Component({
    selector: 'app-elephant-direction',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent, SharedFeedbackComponent],
    templateUrl: './elephant-direction.component.html',
    styleUrl: './elephant-direction.component.scss',
})
export class ElephantDirectionComponent implements OnInit {
    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) { }

    readonly elephants = JSON.parse(JSON.stringify(GAME)); // Clone to avoid mutation of constant
    selectedId: number = -1;
    feedbackState: 'correct' | 'wrong' | null = null;

    get showHint(): boolean {
        return this.hintService.shouldShowHint(ID);
    }

    get isNextUnlocked(): boolean { return this.feedbackState === 'correct' || this.gs.isCompleted(ID); }
    get isLocked(): boolean { return this.feedbackState === 'correct'; }

    ngOnInit(): void {
        const saved = this.gs.getData<ElephantDirState>(ID);
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

    selectElephant(id: number): void {
        if (this.isLocked) return;
        this.selectedId = id;
        this.feedbackState = null;
        this.elephants.forEach((e: ElephantItem) => e.isShaking = false);
        this.persist();
    }

    checkAnswer(): void {
        if (this.selectedId === -1) {
            this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
            return;
        }

        const correct = GAME.find(e => e.isFlipped);
        const isCorrect = correct?.id === this.selectedId;
        this.feedbackState = isCorrect ? 'correct' : 'wrong';

        if (isCorrect) {
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Tebrikler! Doğru fili buldun!');
        } else {
            this.hintService.registerError(ID);

            const selectedElephant = this.elephants.find((e: ElephantItem) => e.id === this.selectedId);
            if (selectedElephant) {
                selectedElephant.isShaking = true;
                setTimeout(() => {
                    selectedElephant.isShaking = false;
                }, 500);
            }

            this.fb.showFeedback('error', 'Tekrar Denemelisin');
        }
        this.persist();
    }

    restartActivity(): void {
        this.selectedId = -1;
        this.feedbackState = null;
        this.elephants.forEach((e: ElephantItem) => e.isShaking = false);
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    goPrev(): void { this.router.navigate(['/letter-counting']); }
    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/symbol-addition']);
    }
}
