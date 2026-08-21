import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface ColorItem {
    id: number;
    color: string;
    name: string;
}

interface SavedState {
    inputValue: string;
    targetColor: ColorItem;
    items: ColorItem[];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'count-given-color';

const FIXED_ITEMS: ColorItem[] = [
    { id: 0, color: '#ef5350', name: 'Kırmızı' }, { id: 1, color: '#42a5f5', name: 'Mavi' }, { id: 2, color: '#ef5350', name: 'Kırmızı' }, { id: 3, color: '#66bb6a', name: 'Yeşil' }, { id: 4, color: '#ffca28', name: 'Sarı' }, { id: 5, color: '#ef5350', name: 'Kırmızı' },
    { id: 6, color: '#42a5f5', name: 'Mavi' }, { id: 7, color: '#ef5350', name: 'Kırmızı' }, { id: 8, color: '#66bb6a', name: 'Yeşil' }, { id: 9, color: '#ef5350', name: 'Kırmızı' }, { id: 10, color: '#ab47bc', name: 'Mor' }, { id: 11, color: '#ef5350', name: 'Kırmızı' },
    { id: 12, color: '#ffa726', name: 'Turuncu' }, { id: 13, color: '#ef5350', name: 'Kırmızı' }, { id: 14, color: '#42a5f5', name: 'Mavi' }, { id: 15, color: '#66bb6a', name: 'Yeşil' }, { id: 16, color: '#ef5350', name: 'Kırmızı' }, { id: 17, color: '#ffca28', name: 'Sarı' },
    { id: 18, color: '#ef5350', name: 'Kırmızı' }, { id: 19, color: '#ab47bc', name: 'Mor' }, { id: 20, color: '#ffa726', name: 'Turuncu' }, { id: 21, color: '#ef5350', name: 'Kırmızı' }, { id: 22, color: '#42a5f5', name: 'Mavi' }, { id: 23, color: '#66bb6a', name: 'Yeşil' },
    { id: 24, color: '#ef5350', name: 'Kırmızı' }, { id: 25, color: '#ffca28', name: 'Sarı' }, { id: 26, color: '#ab47bc', name: 'Mor' }, { id: 27, color: '#ffa726', name: 'Turuncu' }, { id: 28, color: '#ef5350', name: 'Kırmızı' }, { id: 29, color: '#42a5f5', name: 'Mavi' },
    { id: 30, color: '#66bb6a', name: 'Yeşil' }, { id: 31, color: '#ef5350', name: 'Kırmızı' }, { id: 32, color: '#ffca28', name: 'Sarı' }, { id: 33, color: '#ab47bc', name: 'Mor' }, { id: 34, color: '#ffa726', name: 'Turuncu' }, { id: 35, color: '#ef5350', name: 'Kırmızı' }
];

const FIXED_TARGET: ColorItem = { id: 1, color: '#ef5350', name: 'Kırmızı' };

@Component({
    selector: 'app-count-given-color',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './count-given-color.component.html',
    styleUrl: './count-given-color.component.scss',
})
export class CountGivenColorComponent implements OnInit {
    items: ColorItem[] = [...FIXED_ITEMS];
    targetColor: ColorItem = FIXED_TARGET;
    inputValue: string = '';
    feedbackState: 'correct' | 'wrong' | null = null;
    correctCount: number = 14;

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService,
    ) { }

    get showHint(): boolean { return this.hintService.shouldShowHint(ID); }
    get isNextUnlocked(): boolean {
        return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<SavedState>(ID);
        if (saved) {
            this.inputValue = saved.inputValue;
            this.feedbackState = saved.feedbackState;
        }
    }

    private setupLevel(): void {
        // No-op for fixed version
    }

    private calculateCorrectCount(): void {
        // No-op for fixed version
    }

    private persist(): void {
        this.gs.save(ID, {
            inputValue: this.inputValue,
            targetColor: this.targetColor,
            items: this.items,
            feedbackState: this.feedbackState
        });
    }

    onInput(val: string): void {
        if (this.feedbackState === 'correct') return;
        this.inputValue = val.replace(/[^0-9]/g, '');
        this.feedbackState = null;
        this.persist();
    }

    clearAll(): void {
        this.inputValue = '';
        this.feedbackState = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    checkAnswers(): void {
        if (this.inputValue === '') {
            this.fb.showFeedback('error', 'Lütfen kutucuğa bir sayı yazın!');
            return;
        }

        const isCorrect = parseInt(this.inputValue) === this.correctCount;

        if (isCorrect) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', `Doğru! Tam ${this.correctCount} tane ${this.targetColor.name.toLowerCase()} kare var! ✨`);
        } else {
            this.hintService.registerError(ID);
            this.feedbackState = 'wrong';
            if (this.showHint) {
                // Show count as hint
                this.inputValue = this.correctCount.toString();
            }
            this.fb.showFeedback('error', 'Cevap hatalı, kareleri tekrar saymayı dene!');
        }
        this.persist();
    }

    goPrev(): void { this.router.navigate(['/same-word-find']); }
    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/star-difference']);
    }
}
