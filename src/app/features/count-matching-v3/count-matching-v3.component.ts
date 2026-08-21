import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityService } from '../../core/services/activity.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { GameStateService } from '../../core/services/game-state.service';
import { HintService } from '../../core/services/hint.service';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';

interface Group {
  id: number;
  count: number;
  emoji: string;
  type: 'left' | 'right';
  isSelected: boolean;
  isPaired: boolean;
  pairIndex: number | null;
}

interface GroupPair {
  leftId: number;
  rightId: number;
}

// Öğrencinin oluşturduğu eşleşmeleri birbirinden ayırt etmek için döngüsel renk/rakam paleti
export const PAIR_BADGE_COLORS = ['#e91e63', '#3f51b5', '#00897b', '#f9a825', '#8e24aa', '#43a047'];

const ID = 'count-matching-v3';

@Component({
  selector: 'app-count-matching-v3',
  standalone: true,
  imports: [CommonModule, ActivityHeaderComponent, ActionButtonsComponent, SharedFeedbackComponent],
  templateUrl: './count-matching-v3.component.html',
  styleUrl: './count-matching-v3.component.scss'
})
export class CountMatchingV3Component implements OnInit {
  private activityService = inject(ActivityService);
  private feedbackService = inject(FeedbackService);
  private gameStateService = inject(GameStateService);
  private hintService = inject(HintService);

  // Left groups: watermelons with different counts
  leftGroups: Group[] = [
    { id: 1, count: 3, emoji: '🍉', type: 'left', isSelected: false, isPaired: false, pairIndex: null },
    { id: 2, count: 5, emoji: '🍉', type: 'left', isSelected: false, isPaired: false, pairIndex: null },
    { id: 3, count: 4, emoji: '🍉', type: 'left', isSelected: false, isPaired: false, pairIndex: null },
    { id: 4, count: 2, emoji: '🍉', type: 'left', isSelected: false, isPaired: false, pairIndex: null },
  ];

  // Right groups: strawberries with matching counts (different order)
  rightGroups: Group[] = [
    { id: 5, count: 5, emoji: '🍓', type: 'right', isSelected: false, isPaired: false, pairIndex: null },
    { id: 6, count: 2, emoji: '🍓', type: 'right', isSelected: false, isPaired: false, pairIndex: null },
    { id: 7, count: 4, emoji: '🍓', type: 'right', isSelected: false, isPaired: false, pairIndex: null },
    { id: 8, count: 3, emoji: '🍓', type: 'right', isSelected: false, isPaired: false, pairIndex: null },
  ];

  pairs: GroupPair[] = [];
  selectedLeftId: number | null = null;
  selectedRightId: number | null = null;

  get isCompleted(): boolean {
    return this.gameStateService.isCompleted(ID);
  }

  ngOnInit(): void {
    const saved = this.gameStateService.getData<{ pairs: GroupPair[] }>(ID);
    if (saved?.pairs) {
      this.pairs = saved.pairs;
      this.pairs.forEach((p, idx) => {
        const l = this.leftGroups.find(g => g.id === p.leftId);
        const r = this.rightGroups.find(g => g.id === p.rightId);
        if (l) { l.isPaired = true; l.pairIndex = idx; }
        if (r) { r.isPaired = true; r.pairIndex = idx; }
      });
    }
  }

  selectLeft(id: number): void {
    if (this.isCompleted) return;
    const group = this.leftGroups.find(g => g.id === id);
    if (group?.isPaired) return;
    this.selectedLeftId = this.selectedLeftId === id ? null : id;
    this.tryFormPair();
  }

  selectRight(id: number): void {
    if (this.isCompleted) return;
    const group = this.rightGroups.find(g => g.id === id);
    if (group?.isPaired) return;
    this.selectedRightId = this.selectedRightId === id ? null : id;
    this.tryFormPair();
  }

  /** Eşleşmeyi doğru/yanlış olduğuna bakmadan sessizce kaydeder — sonuç yalnızca Gönder'e basılınca belli olur. */
  private tryFormPair(): void {
    if (this.selectedLeftId === null || this.selectedRightId === null) return;
    const left = this.leftGroups.find(g => g.id === this.selectedLeftId);
    const right = this.rightGroups.find(g => g.id === this.selectedRightId);
    if (!left || !right) return;

    const newIndex = this.pairs.length;
    left.isPaired = true;
    left.pairIndex = newIndex;
    right.isPaired = true;
    right.pairIndex = newIndex;
    this.pairs.push({ leftId: left.id, rightId: right.id });
    this.selectedLeftId = null;
    this.selectedRightId = null;
    this.persist();
  }

  /** Eşleşen grubun rozet rengini döndürür — öğretmen incelemesinde hangi grupların eşleştiğini ayırt etmek için. */
  pairBadgeColor(group: Group): string {
    if (group.pairIndex === null) return '#94a3b8';
    return PAIR_BADGE_COLORS[group.pairIndex % PAIR_BADGE_COLORS.length];
  }

  onReset(): void {
    this.leftGroups.forEach(g => { g.isPaired = false; g.isSelected = false; g.pairIndex = null; });
    this.rightGroups.forEach(g => { g.isPaired = false; g.isSelected = false; g.pairIndex = null; });
    this.pairs = [];
    this.selectedLeftId = null;
    this.selectedRightId = null;
    this.gameStateService.clear(ID);
    this.hintService.resetErrors(ID);
  }

  onCheck(): void {
    if (this.pairs.length === 0) {
      this.feedbackService.showWrong();
      return;
    }
    if (this.pairs.length < this.leftGroups.length) {
      this.feedbackService.showWrong();
      return;
    }

    const allCorrect = this.pairs.every(p => {
      const l = this.leftGroups.find(g => g.id === p.leftId);
      const r = this.rightGroups.find(g => g.id === p.rightId);
      return !!l && !!r && l.count === r.count;
    });

    if (allCorrect) {
      this.feedbackService.showCorrect();
      this.gameStateService.markCompleted(ID);
    } else {
      this.feedbackService.showWrong();
      this.hintService.registerError(ID);
    }
  }

  private persist(): void {
    this.gameStateService.save(ID, { pairs: this.pairs });
  }

  prev(): void { this.activityService.prev(); }
  next(): void { this.activityService.next(); }

  getArray(count: number): any[] {
    return new Array(count);
  }
}
