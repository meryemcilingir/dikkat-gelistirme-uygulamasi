import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ActivityService } from '../../core/services/activity.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { GameStateService } from '../../core/services/game-state.service';
import { HintService } from '../../core/services/hint.service';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';

interface SymbolCard {
  id: number;
  symbol: string;
  color: string;
  isPaired: boolean;
  isSelected: boolean;
  pairIndex: number | null;
}

interface CardPair {
  aId: number;
  bId: number;
}

// Öğrencinin oluşturduğu eşleşmeleri birbirinden ayırt etmek için döngüsel renk/rakam paleti
export const PAIR_BADGE_COLORS = ['#e91e63', '#3f51b5', '#00897b', '#f9a825', '#8e24aa', '#43a047'];

const ID = 'symbol-pair-matching';

@Component({
  selector: 'app-symbol-pair-matching',
  standalone: true,
  imports: [CommonModule, ActivityHeaderComponent, ActionButtonsComponent, SharedFeedbackComponent],
  templateUrl: './symbol-pair-matching.component.html',
  styleUrl: './symbol-pair-matching.component.scss'
})
export class SymbolPairMatchingComponent implements OnInit {
  private router = inject(Router);
  private activityService = inject(ActivityService);
  private feedbackService = inject(FeedbackService);
  private gameStateService = inject(GameStateService);
  private hintService = inject(HintService);

  cards: SymbolCard[] = [
    { id: 1, symbol: '■', color: '#10b981', isPaired: false, isSelected: false, pairIndex: null },
    { id: 2, symbol: '▲', color: '#3b82f6', isPaired: false, isSelected: false, pairIndex: null },
    { id: 3, symbol: '●', color: '#8b5cf6', isPaired: false, isSelected: false, pairIndex: null },
    { id: 4, symbol: '▲', color: '#3b82f6', isPaired: false, isSelected: false, pairIndex: null },
    { id: 5, symbol: '●', color: '#8b5cf6', isPaired: false, isSelected: false, pairIndex: null },
    { id: 6, symbol: '■', color: '#10b981', isPaired: false, isSelected: false, pairIndex: null },
  ];

  pairs: CardPair[] = [];
  selectedCardId: number | null = null;

  get isSubmitted(): boolean {
    return this.gameStateService.isCompleted(ID);
  }

  ngOnInit(): void {
    // Shuffle cards for variety
    this.cards = this.shuffle(this.cards);

    const savedData = this.gameStateService.getData<{ pairs: CardPair[] }>(ID);
    if (savedData?.pairs) {
      this.pairs = savedData.pairs;
      this.pairs.forEach((p, idx) => {
        const a = this.cards.find(c => c.id === p.aId);
        const b = this.cards.find(c => c.id === p.bId);
        if (a) { a.isPaired = true; a.pairIndex = idx; }
        if (b) { b.isPaired = true; b.pairIndex = idx; }
      });
    }
  }

  private shuffle(array: any[]) {
    return array.sort(() => Math.random() - 0.5);
  }

  private persist(): void {
    this.gameStateService.save(ID, { pairs: this.pairs });
  }

  /** Eşleşmeyi doğru/yanlış olduğuna bakmadan sessizce kaydeder — sonuç yalnızca Gönder'e basılınca belli olur. */
  selectCard(id: number): void {
    if (this.isSubmitted) return;
    const card = this.cards.find(c => c.id === id);
    if (!card || card.isPaired) return;

    if (this.selectedCardId === id) {
      card.isSelected = false;
      this.selectedCardId = null;
      return;
    }

    if (this.selectedCardId === null) {
      card.isSelected = true;
      this.selectedCardId = id;
    } else {
      const firstCard = this.cards.find(c => c.id === this.selectedCardId);
      if (!firstCard) return;

      const newIndex = this.pairs.length;
      firstCard.isPaired = true;
      firstCard.pairIndex = newIndex;
      card.isPaired = true;
      card.pairIndex = newIndex;
      firstCard.isSelected = false;
      card.isSelected = false;
      this.pairs.push({ aId: firstCard.id, bId: card.id });
      this.selectedCardId = null;
      this.persist();
    }
  }

  /** Eşleşen kartın rozet rengini döndürür — öğretmen incelemesinde hangi kartların eşleştiğini ayırt etmek için. */
  pairBadgeColor(card: SymbolCard): string {
    if (card.pairIndex === null) return '#94a3b8';
    return PAIR_BADGE_COLORS[card.pairIndex % PAIR_BADGE_COLORS.length];
  }

  checkAnswer(): void {
    if (this.pairs.length === 0) {
      this.feedbackService.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
      return;
    }
    if (this.pairs.length < this.cards.length / 2) {
      this.feedbackService.showFeedback('error', 'Lütfen tüm kartları eşleştirin!');
      return;
    }

    const allCorrect = this.pairs.every(p => {
      const a = this.cards.find(c => c.id === p.aId);
      const b = this.cards.find(c => c.id === p.bId);
      return !!a && !!b && a.symbol === b.symbol;
    });

    if (allCorrect) {
      this.gameStateService.markCompleted(ID);
      this.feedbackService.showCorrect();
    } else {
      this.hintService.registerError(ID);
    }
  }

  onReset(): void {
    this.cards.forEach(c => { c.isPaired = false; c.isSelected = false; c.pairIndex = null; });
    this.pairs = [];
    this.selectedCardId = null;
    this.cards = this.shuffle(this.cards);
    this.gameStateService.clear(ID);
    this.hintService.resetErrors(ID);
  }

  prev(): void { this.activityService.prev(); }
  next(): void { this.activityService.next(); }
}
