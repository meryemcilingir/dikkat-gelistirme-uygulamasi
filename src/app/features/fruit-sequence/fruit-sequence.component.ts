import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface FruitBox {
    id: number;
    fruits: string[];
    isQuestion: boolean;
}

interface FruitSequenceState {
    userInput: string;
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'fruit-sequence';
const CORRECT_ANSWER = 5;

@Component({
    selector: 'app-fruit-sequence',
    standalone: true,
    imports: [CommonModule, FormsModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './fruit-sequence.component.html',
    styleUrl: './fruit-sequence.component.scss'
})
export class FruitSequenceComponent implements OnInit {

    // 8 kutu: 1,2,3,4,?,6,7,8 meyve → cevap 5
    boxes: FruitBox[] = [
        { id: 0, fruits: ['apple'], isQuestion: false },
        { id: 1, fruits: ['apple', 'banana'], isQuestion: false },
        { id: 2, fruits: ['apple', 'banana', 'cherry'], isQuestion: false },
        { id: 3, fruits: ['apple', 'banana', 'cherry', 'apple'], isQuestion: false },
        { id: 4, fruits: [], isQuestion: true },
        { id: 5, fruits: ['apple', 'banana', 'cherry', 'apple', 'banana', 'cherry'], isQuestion: false },
        { id: 6, fruits: ['apple', 'banana', 'cherry', 'apple', 'banana', 'cherry', 'apple'], isQuestion: false },
        { id: 7, fruits: ['apple', 'banana', 'cherry', 'apple', 'banana', 'cherry', 'apple', 'banana'], isQuestion: false },
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

    get showHint(): boolean { return this.hintService.shouldShowHint(ID); }
    get isNextUnlocked(): boolean {
        return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<FruitSequenceState>(ID);
        if (saved) {
            this.userInput = saved.userInput ?? '';
            this.feedbackState = saved.feedbackState ?? null;
        }
    }

    private persist(): void {
        this.gs.save(ID, { userInput: this.userInput, feedbackState: this.feedbackState });
    }

    onInput(): void {
        this.feedbackState = null;
        this.persist();
    }

    checkAnswer(): void {
        const val = this.userInput.trim();
        if (!val) {
            this.fb.showFeedback('error', 'Lütfen cevabını yaz.');
            return;
        }
        if (parseInt(val, 10) === CORRECT_ANSWER) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', `Harika! Doğru cevap ${CORRECT_ANSWER}!`);
        } else {
            this.feedbackState = 'wrong';
            this.isShaking = true;
            this.hintService.registerError(ID);
            this.fb.showFeedback('error', 'Yanlış cevap. Kutuları tekrar say!');
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

    goPrev(): void { this.router.navigate(['/star-difference']); }
    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/arrow-grid-copy']);
    }
}
