import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActivityService } from '../../core/services/activity.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';

interface VeggieMap {
  id: number;
  emoji: string;
}

interface GridCell {
  id: number;
  vegId: number;
  emoji: string;
  userNumber: number | null;
}

interface VegGridState {
  userNumbers: (number | null)[];
  feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'veg-grid-transfer';

@Component({
  selector: 'app-veg-grid-transfer',
  standalone: true,
  imports: [CommonModule, FormsModule, ActionButtonsComponent, ActivityHeaderComponent, SharedFeedbackComponent],
  templateUrl: './veg-grid-transfer.component.html',
  styleUrl: './veg-grid-transfer.component.scss'
})
export class VegGridTransferComponent implements OnInit {
  private gs = inject(GameStateService);
  private fb = inject(FeedbackService);
  private hintService = inject(HintService);
  private activityService = inject(ActivityService);

  mappings: VeggieMap[] = [
    { id: 1, emoji: '🥕' }, // Carrot
    { id: 2, emoji: '🍆' }, // Eggplant
    { id: 3, emoji: '🌶️' }, // Pepper
    { id: 4, emoji: '🍌' }, // Banana
    { id: 5, emoji: '🌽' }  // Corn
  ];

  grid: GridCell[] = [
    { id: 1, vegId: 1, emoji: '🥕', userNumber: null },
    { id: 2, vegId: 4, emoji: '🍌', userNumber: null },
    { id: 3, vegId: 2, emoji: '🍆', userNumber: null },
    { id: 4, vegId: 3, emoji: '🌶️', userNumber: null },
    { id: 5, vegId: 1, emoji: '🥕', userNumber: null },
    { id: 6, vegId: 4, emoji: '🍌', userNumber: null },
    { id: 7, vegId: 5, emoji: '🌽', userNumber: null },
    { id: 8, vegId: 1, emoji: '🥕', userNumber: null },
    { id: 9, vegId: 5, emoji: '🌽', userNumber: null },
  ];

  feedbackState: 'correct' | 'wrong' | null = null;

  get showHint(): boolean {
    return this.hintService.shouldShowHint(ID);
  }

  get isNextUnlocked(): boolean {
    return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
  }

  ngOnInit(): void {
    const saved = this.gs.getData<VegGridState>(ID);
    if (saved) {
      this.grid.forEach((cell, i) => {
        cell.userNumber = saved.userNumbers[i];
      });
      this.feedbackState = saved.feedbackState;
    }
  }

  private persist(): void {
    this.gs.save(ID, {
      userNumbers: this.grid.map(c => c.userNumber),
      feedbackState: this.feedbackState
    });
  }

  onCheck(): void {
    const allAnswered = this.grid.every(c => c.userNumber !== null);
    if (!allAnswered) {
      this.fb.showFeedback('error', 'Lütfen sağdaki tablonun tüm kutularını doldurun!');
      return;
    }

    const allCorrect = this.grid.every(c => c.userNumber === c.vegId);
    this.feedbackState = allCorrect ? 'correct' : 'wrong';

    if (allCorrect) {
      this.gs.markCompleted(ID);
      this.hintService.resetErrors(ID);
      this.fb.showFeedback('success', 'Tebrikler! Sebzeleri doğru sayılarla eşleştirdin!');
    } else {
      this.hintService.registerError(ID);
      this.fb.showFeedback('error', 'Bazı numaralar yanlış. Yukarıdaki eşleştirmelere dikkat et!');
    }
    this.persist();
  }

  onReset(): void {
    this.grid.forEach(c => c.userNumber = null);
    this.feedbackState = null;
    this.gs.clear(ID);
    this.hintService.resetErrors(ID);
    this.persist();
  }

  prev(): void { this.activityService.prev(); }
  next(): void {
    if (this.isNextUnlocked) {
      this.activityService.next();
    }
  }
}
