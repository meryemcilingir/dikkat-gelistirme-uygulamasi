import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface FruitOption {
    id: number;
    emoji: string;
    inBasket: boolean;
    isSelected: boolean;
    isShaking: boolean;
}

export interface BasketFruit {
    emoji: string;
    // sepet içindeki konum (%)
    top: number;
    left: number;
    rotate: number;
    size: number;
}

interface FruitBasketState {
    selected: number[];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'fruit-basket';

@Component({
    selector: 'app-fruit-basket',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './fruit-basket.component.html',
    styleUrl: './fruit-basket.component.scss'
})
export class FruitBasketComponent implements OnInit {

    // Sepetin içindeki meyveler (referans)
    basketFruits: BasketFruit[] = [
        { emoji: '🍎', top: 52, left: 32, rotate: -8,  size: 52 },
        { emoji: '🍇', top: 30, left: 57, rotate: 6,   size: 50 },
        { emoji: '🍓', top: 58, left: 63, rotate: -4,  size: 46 },
    ];

    // Alttaki seçenekler (bazıları sepette yok)
    options: FruitOption[] = [
        { id: 0, emoji: '🍎', inBasket: true,  isSelected: false, isShaking: false },
        { id: 1, emoji: '🍌', inBasket: false, isSelected: false, isShaking: false },
        { id: 2, emoji: '🍇', inBasket: true,  isSelected: false, isShaking: false },
        { id: 3, emoji: '🍍', inBasket: false, isSelected: false, isShaking: false },
        { id: 4, emoji: '🍓', inBasket: true,  isSelected: false, isShaking: false },
        { id: 5, emoji: '🍊', inBasket: false, isSelected: false, isShaking: false },
        { id: 6, emoji: '🍉', inBasket: false, isSelected: false, isShaking: false },
        { id: 7, emoji: '🥝', inBasket: false, isSelected: false, isShaking: false },
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
        const saved = this.gs.getData<FruitBasketState>(ID);
        if (saved?.selected) {
            const sel = new Set(saved.selected);
            this.options.forEach(o => { o.isSelected = sel.has(o.id); });
            this.feedbackState = saved.feedbackState ?? null;
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            selected: this.options.filter(o => o.isSelected).map(o => o.id),
            feedbackState: this.feedbackState,
        });
    }

    // İpucu: henüz seçilmemiş doğru meyveler vurgulansın
    isHintOption(opt: FruitOption): boolean {
        if (!this.showHint) return false;
        return opt.inBasket && !opt.isSelected;
    }

    toggleOption(opt: FruitOption): void {
        if (this.isNextUnlocked) return;
        opt.isSelected = !opt.isSelected;
        this.feedbackState = null;
        this.persist();
    }

    checkAnswer(): void {
        const anySelected = this.options.some(o => o.isSelected);
        if (!anySelected) {
            this.fb.showFeedback('error', 'Lütfen en az bir meyve seç.');
            return;
        }

        let allCorrect = true;
        this.options.forEach(o => {
            const wrong = (o.isSelected && !o.inBasket) || (!o.isSelected && o.inBasket);
            if (wrong) {
                allCorrect = false;
                if (o.isSelected && !o.inBasket) {
                    o.isShaking = true;
                    setTimeout(() => { o.isShaking = false; }, 500);
                }
            }
        });

        if (allCorrect) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Harika! Tüm doğru meyveleri buldun!');
        } else {
            this.feedbackState = 'wrong';
            this.hintService.registerError(ID);
            this.fb.showFeedback('error', 'Bazı seçimler yanlış. Tabaktaki meyvelere tekrar bak!');
        }
        this.persist();
    }

    clearSelection(): void {
        this.options.forEach(o => { o.isSelected = false; o.isShaking = false; });
        this.feedbackState = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    goPrev(): void {
        this.router.navigate(['/profession-matching']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/flower-order']);
    }
}
