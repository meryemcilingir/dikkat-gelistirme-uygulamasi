import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

// 2×2 hücre: [sol-üst, sağ-üst, sol-alt, sağ-alt] — hepsi dolu
export type Shape = 'rect' | 'circle' | 'triangle' | 'dot';

export interface SymbolCard {
    id: string;
    cells: [Shape, Shape, Shape, Shape];
    isSelected: boolean;
    isPaired: boolean;
}

interface MatchLine {
    leftIndex: number;
    rightIndex: number;
    id: string;
}

interface SymbolGridMatchingState {
    leftCards: SymbolCard[];
    rightCards: SymbolCard[];
    matchLines: MatchLine[];
}

const ID = 'symbol-grid-matching';

@Component({
    selector: 'app-symbol-grid-matching',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './symbol-grid-matching.component.html',
    styleUrl: './symbol-grid-matching.component.scss'
})
export class SymbolGridMatchingComponent implements OnInit {

    readonly CONTAINER_WIDTH = 560;
    readonly CONTAINER_HEIGHT = 420;
    readonly CARD_SIZE = 120;
    readonly CARD_GAP = 14;
    readonly LEFT_ANCHOR_X = 178;
    readonly RIGHT_ANCHOR_X = 382;

    // Sol sütun — 3 kart, her birinde 4 farklı sembol dizilimi
    leftCards: SymbolCard[] = [
        { id: 'A', cells: ['dot', 'rect', 'circle', 'triangle'], isSelected: false, isPaired: false },
        { id: 'B', cells: ['circle', 'triangle', 'dot', 'rect'], isSelected: false, isPaired: false },
        { id: 'C', cells: ['triangle', 'dot', 'rect', 'circle'], isSelected: false, isPaired: false },
    ];

    // Sağ sütun — aynı kartlar farklı sırada
    rightCards: SymbolCard[] = [
        { id: 'C', cells: ['triangle', 'dot', 'rect', 'circle'], isSelected: false, isPaired: false },
        { id: 'A', cells: ['dot', 'rect', 'circle', 'triangle'], isSelected: false, isPaired: false },
        { id: 'B', cells: ['circle', 'triangle', 'dot', 'rect'], isSelected: false, isPaired: false },
    ];

    matchLines: MatchLine[] = [];
    selectedLeftIndex: number | null = null;

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) { }

    get isSubmitted(): boolean {
        return this.gs.isCompleted(ID);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<SymbolGridMatchingState>(ID);
        if (saved) {
            this.leftCards = saved.leftCards || this.leftCards;
            this.rightCards = saved.rightCards || this.rightCards;
            this.matchLines = saved.matchLines || [];
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            leftCards: this.leftCards,
            rightCards: this.rightCards,
            matchLines: this.matchLines,
        });
    }

    getItemCenterY(index: number): number {
        return index * (this.CARD_SIZE + this.CARD_GAP) + this.CARD_SIZE / 2;
    }

    selectLeft(index: number): void {
        if (this.isSubmitted) return;
        const card = this.leftCards[index];
        if (card.isPaired) return;
        if (this.selectedLeftIndex === index) {
            card.isSelected = false;
            this.selectedLeftIndex = null;
        } else {
            this.leftCards.forEach(c => c.isSelected = false);
            card.isSelected = true;
            this.selectedLeftIndex = index;
        }
    }

    /** Eşleşmeyi doğru/yanlış olduğuna bakmadan sessizce kaydeder — sonuç yalnızca Gönder'e basılınca belli olur. */
    selectRight(index: number): void {
        if (this.isSubmitted) return;
        if (this.selectedLeftIndex === null) return;
        const rightCard = this.rightCards[index];
        if (rightCard.isPaired) return;

        const leftCard = this.leftCards[this.selectedLeftIndex];
        const leftIndex = this.selectedLeftIndex;

        leftCard.isPaired = true;
        rightCard.isPaired = true;
        leftCard.isSelected = false;
        this.matchLines.push({ leftIndex, rightIndex: index, id: leftCard.id });
        this.selectedLeftIndex = null;
        this.persist();
    }

    checkAnswer(): void {
        if (this.matchLines.length === 0) {
            this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
            return;
        }
        if (this.matchLines.length < this.leftCards.length) {
            this.fb.showFeedback('error', 'Lütfen tüm kartları eşleştirin!');
            return;
        }

        const allCorrect = this.matchLines.every(
            l => this.leftCards[l.leftIndex].id === this.rightCards[l.rightIndex].id
        );

        if (allCorrect) {
            this.gs.markCompleted(ID);
            this.fb.showFeedback('success', 'Harika! Tüm sembolleri doğru eşleştirdin!');
        } else {
            this.hintService.registerError(ID);
        }
    }

    clearSelection(): void {
        this.leftCards.forEach(c => { c.isSelected = false; c.isPaired = false; });
        this.rightCards.forEach(c => { c.isSelected = false; c.isPaired = false; });
        this.matchLines = [];
        this.selectedLeftIndex = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    goPrev(): void {
        this.router.navigate(['/river-branches']);
    }

    goNext(): void {
        if (!this.isSubmitted) return;
        this.router.navigate(['/shape-match-find']);
    }
}
