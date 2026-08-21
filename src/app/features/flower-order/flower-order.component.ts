import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface FlowerItem {
    id: number;
    image: string;
    correctOrder: number;   // 1 | 2 | 3
    userInput: string;
    isShaking: boolean;
}

interface FlowerOrderState {
    inputs: string[];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'flower-order';

@Component({
    selector: 'app-flower-order',
    standalone: true,
    imports: [CommonModule, FormsModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './flower-order.component.html',
    styleUrl: './flower-order.component.scss'
})
export class FlowerOrderComponent implements OnInit {

    // Görseller karışık sırada sunuluyor: cicek1 (küçük fide), cicek3 (tam çiçek), cicek2 (orta fide)
    items: FlowerItem[] = [
        { id: 0, image: 'assets/cicek1.png', correctOrder: 1, userInput: '', isShaking: false },
        { id: 1, image: 'assets/cicek3.png', correctOrder: 3, userInput: '', isShaking: false },
        { id: 2, image: 'assets/cicek2.png', correctOrder: 2, userInput: '', isShaking: false },
    ];

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
        const saved = this.gs.getData<FlowerOrderState>(ID);
        if (saved?.inputs) {
            saved.inputs.forEach((val, i) => {
                if (this.items[i]) this.items[i].userInput = val;
            });
            this.feedbackState = saved.feedbackState ?? null;
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            inputs: this.items.map(i => i.userInput),
            feedbackState: this.feedbackState,
        });
    }

    onInput(item: FlowerItem): void {
        // Sadece 1-3 arasına izin ver
        item.userInput = item.userInput.replace(/[^1-3]/g, '').slice(0, 1);
        this.feedbackState = null;
        this.persist();
    }

    checkAnswer(): void {
        const allFilled = this.items.every(i => i.userInput !== '');
        if (!allFilled) {
            this.fb.showFeedback('error', 'Lütfen tüm kutucukları doldurun.');
            return;
        }

        // Aynı rakam birden fazla kullanılmış mı?
        const vals = this.items.map(i => i.userInput);
        const unique = new Set(vals);
        if (unique.size !== vals.length) {
            this.fb.showFeedback('error', 'Her sayıyı yalnızca bir kez kullanabilirsin.');
            this.items.forEach(i => { i.isShaking = true; });
            setTimeout(() => this.items.forEach(i => { i.isShaking = false; }), 500);
            return;
        }

        let allCorrect = true;
        this.items.forEach(item => {
            if (Number(item.userInput) !== item.correctOrder) {
                allCorrect = false;
                item.isShaking = true;
                setTimeout(() => { item.isShaking = false; }, 500);
            }
        });

        if (allCorrect) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Harika! Oluş sırasını doğru buldun!');
        } else {
            this.feedbackState = 'wrong';
            this.hintService.registerError(ID);
            this.fb.showFeedback('error', 'Sıralama yanlış. Tekrar dene!');
        }
        this.persist();
    }

    clearSelection(): void {
        this.items.forEach(i => { i.userInput = ''; i.isShaking = false; });
        this.feedbackState = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    goPrev(): void {
        this.router.navigate(['/fruit-basket']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/symbol-color-match']);
    }
}
