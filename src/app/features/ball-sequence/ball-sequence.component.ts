import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface BallBox {
    id: number;
    count: number;
    balls: string[];
    isQuestion: boolean;
}

interface BallSequenceState {
    userInput: string;
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'ball-sequence';

@Component({
    selector: 'app-ball-sequence',
    standalone: true,
    imports: [CommonModule, FormsModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './ball-sequence.component.html',
    styleUrl: './ball-sequence.component.scss'
})
export class BallSequenceComponent implements OnInit {

    boxes: BallBox[] = [
        { id: 0, count: 3, balls: ['basketball','basketball','soccer'], isQuestion: false },
        { id: 1, count: 4, balls: ['basketball','soccer','basketball','soccer'], isQuestion: false },
        { id: 2, count: 5, balls: ['basketball','soccer','basketball','soccer','basketball'], isQuestion: false },
        { id: 3, count: 6, balls: ['basketball','volleyball','soccer','basketball','soccer','volleyball'], isQuestion: false },
        { id: 4, count: 7, balls: [], isQuestion: true },
        { id: 5, count: 8, balls: ['basketball','volleyball','soccer','basketball','soccer','volleyball','basketball','soccer'], isQuestion: false },
        { id: 6, count: 9, balls: ['basketball','soccer','volleyball','basketball','soccer','volleyball','basketball','soccer','volleyball'], isQuestion: false },
        { id: 7, count: 10, balls: ['basketball','soccer','volleyball','basketball','soccer','basketball','soccer','volleyball','basketball','soccer'], isQuestion: false },
    ];

    userInput = '';
    feedbackState: 'correct' | 'wrong' | null = null;
    isShaking = false;

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
        const saved = this.gs.getData<BallSequenceState>(ID);
        if (saved) {
            this.userInput = saved.userInput ?? '';
            this.feedbackState = saved.feedbackState ?? null;
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            userInput: this.userInput,
            feedbackState: this.feedbackState,
        });
    }

    onInput(): void {
        this.feedbackState = null;
        this.persist();
    }

    checkAnswer(): void {
        const val = String(this.userInput).trim();
        if (!val) {
            this.fb.showFeedback('error', 'Lütfen cevabını yaz.');
            return;
        }

        const num = parseInt(val, 10);
        if (num === 7) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Harika! Doğru cevap 7!');
        } else {
            this.feedbackState = 'wrong';
            this.isShaking = true;
            this.hintService.registerError(ID);
            this.fb.showFeedback('error', 'Yanlış cevap. Tekrar dene!');
            setTimeout(() => {
                this.isShaking = false;
                this.userInput = '';
                this.feedbackState = null;
            }, 600);
        }
        this.persist();
    }

    clearSelection(): void {
        this.userInput = '';
        this.feedbackState = null;
        this.isShaking = false;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    goPrev(): void {
        this.router.navigate(['/count-apples']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/snake-letter']);
    }
}
