import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityService } from '../../core/services/activity.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { GameStateService } from '../../core/services/game-state.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';

interface BoxItem {
  id: number;
  fruits: string[];
  correctPairId: number;
  assignedPairId: number | null;
  side: 'left' | 'right';
}

const ID = 'fruit-group-matching';

// Öğrencinin oluşturduğu eşleşmeleri birbirinden ayırt etmek için döngüsel renk/rakam paleti
export const PAIR_BADGE_COLORS = ['#e91e63', '#3f51b5', '#00897b', '#f9a825', '#8e24aa', '#43a047'];

@Component({
  selector: 'app-fruit-group-matching',
  standalone: true,
  imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent, SharedFeedbackComponent],
  templateUrl: './fruit-group-matching.component.html',
  styleUrl: './fruit-group-matching.component.scss'
})
export class FruitGroupMatchingComponent implements OnInit {
  private activityService = inject(ActivityService);
  private feedbackService = inject(FeedbackService);
  private gameStateService = inject(GameStateService);
  private hintService = inject(HintService);

  isCompleted = false;
  checkAlwaysDisabled = false;

  leftBoxes: BoxItem[] = [
    { id: 1, fruits: ['🍉', '🍓', '🍌', '🍎'], correctPairId: 5, assignedPairId: null, side: 'left' },
    { id: 2, fruits: ['🍓', '🍌', '🍍', '🍇'], correctPairId: 6, assignedPairId: null, side: 'left' },
    { id: 3, fruits: ['🍉', '🍎', '🍍', '🍇'], correctPairId: 4, assignedPairId: null, side: 'left' }
  ];

  rightBoxes: BoxItem[] = [
    { id: 4, fruits: ['🍎', '🍇', '🍉', '🍍'], correctPairId: 3, assignedPairId: null, side: 'right' },
    { id: 5, fruits: ['🍌', '🍎', '🍉', '🍓'], correctPairId: 1, assignedPairId: null, side: 'right' },
    { id: 6, fruits: ['🍍', '🍇', '🍓', '🍌'], correctPairId: 2, assignedPairId: null, side: 'right' }
  ];

  selectedLeftId: number | null = null;
  selectedRightId: number | null = null;

  ngOnInit(): void {
    const saved = this.gameStateService.getData<any>(ID);
    if (saved) {
      this.isCompleted = saved.isCompleted;
      if (saved.assignments) {
        saved.assignments.forEach((a: any) => {
          const left = this.leftBoxes.find(b => b.id === a.leftId);
          const right = this.rightBoxes.find(b => b.id === a.rightId);
          if (left && right) {
            left.assignedPairId = right.id;
            right.assignedPairId = left.id;
          }
        });
      }
    }
  }

  selectLeft(id: number): void {
    if (this.isCompleted) return;
    this.selectedLeftId = this.selectedLeftId === id ? null : id;
    this.checkMatch();
  }

  selectRight(id: number): void {
    if (this.isCompleted) return;
    this.selectedRightId = this.selectedRightId === id ? null : id;
    this.checkMatch();
  }

  private checkMatch(): void {
    if (this.selectedLeftId !== null && this.selectedRightId !== null) {
      const left = this.leftBoxes.find(b => b.id === this.selectedLeftId);
      const right = this.rightBoxes.find(b => b.id === this.selectedRightId);

      if (left && right) {
        // Clear previous assignments for these items
        this.leftBoxes.forEach(b => { if (b.assignedPairId === this.selectedRightId) b.assignedPairId = null; });
        this.rightBoxes.forEach(b => { if (b.assignedPairId === this.selectedLeftId) b.assignedPairId = null; });

        left.assignedPairId = this.selectedRightId;
        right.assignedPairId = this.selectedLeftId;
      }

      this.selectedLeftId = null;
      this.selectedRightId = null;
      this.persist();
    }
  }

  private persist(): void {
    const assignments = this.leftBoxes
      .filter(b => b.assignedPairId !== null)
      .map(b => ({ leftId: b.id, rightId: b.assignedPairId }));

    this.gameStateService.save(ID, {
      isCompleted: this.isCompleted,
      assignments: assignments
    });
  }

  onReset(): void {
    this.isCompleted = false;
    this.leftBoxes.forEach(b => b.assignedPairId = null);
    this.rightBoxes.forEach(b => b.assignedPairId = null);
    this.selectedLeftId = null;
    this.selectedRightId = null;
    this.gameStateService.clear(ID);
  }

  onCheck(): void {
    const allMatched = this.leftBoxes.every(b => b.assignedPairId !== null);
    if (!allMatched) {
      this.feedbackService.showWrong();
      return;
    }

    const allCorrect = this.leftBoxes.every(b => b.assignedPairId === b.correctPairId);
    if (allCorrect) {
      this.isCompleted = true;
      this.feedbackService.showCorrect();
      this.gameStateService.markCompleted(ID);
    } else {
      this.feedbackService.showWrong();
      this.hintService.registerError(ID);
    }
    this.persist();
  }

  prev(): void { this.activityService.prev(); }
  next(): void { this.activityService.next(); }

  /** Eşleşen bir çift için rozet numarasını/rengini döndürür — öğretmen incelemesinde hangi grupların eşleştiğini ayırt etmek için. */
  leftBadgeNumber(box: BoxItem): number {
    return this.leftBoxes.indexOf(box) + 1;
  }

  rightBadgeNumber(box: BoxItem): number | null {
    if (box.assignedPairId === null) return null;
    const left = this.leftBoxes.find(b => b.id === box.assignedPairId);
    return left ? this.leftBoxes.indexOf(left) + 1 : null;
  }

  badgeColor(num: number): string {
    return PAIR_BADGE_COLORS[(num - 1) % PAIR_BADGE_COLORS.length];
  }
}
