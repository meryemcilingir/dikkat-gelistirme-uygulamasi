import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActivityService } from '../../core/services/activity.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';

export interface GridCell {
  id: number;
  isRed: boolean;
}

export interface PatternTransferState {
  userGrid: boolean[];
  feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'pattern-transfer';

@Component({
  selector: 'app-pattern-transfer',
  standalone: true,
  imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent, SharedFeedbackComponent],
  templateUrl: './pattern-transfer.component.html',
  styleUrl: './pattern-transfer.component.scss'
})
export class PatternTransferComponent implements OnInit {
  
  // 3x3 target grid: top row red, bottom row red
  targetGrid: boolean[] = [
    true, true, true,
    false, false, false,
    true, true, true
  ];

  userGrid: boolean[] = Array(9).fill(false);

  feedbackState: 'correct' | 'wrong' | null = null;

  private gs = inject(GameStateService);
  private fb = inject(FeedbackService);
  private hintService = inject(HintService);
  private activityService = inject(ActivityService);

  get showHints(): boolean {
    return this.hintService.shouldShowHint(ID);
  }

  get isNextUnlocked(): boolean {
    return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
  }

  ngOnInit(): void {
    const saved = this.gs.getData<PatternTransferState>(ID);
    if (saved) {
      this.userGrid = [...saved.userGrid];
      this.feedbackState = saved.feedbackState;
    }
  }

  private persist(): void {
    this.gs.save(ID, {
      userGrid: [...this.userGrid],
      feedbackState: this.feedbackState
    });
  }

  toggleCell(index: number): void {
    if (this.gs.isCompleted(ID) && this.feedbackState === 'correct') return;
    this.userGrid[index] = !this.userGrid[index];
    this.feedbackState = null;
    this.persist();
  }

  onReset(): void {
    this.userGrid = Array(9).fill(false);
    this.feedbackState = null;
    this.gs.clear(ID);
    this.hintService.resetErrors(ID);
    this.persist();
  }

  onCheck(): void {
    let isCorrect = true;
    const hasAnySelection = this.userGrid.some(v => v);

    if (!hasAnySelection) {
      this.fb.showFeedback('error', 'Lütfen sağdaki tabloyu boyayın.');
      return;
    }

    for (let i = 0; i < 9; i++) {
      if (this.userGrid[i] !== this.targetGrid[i]) {
        isCorrect = false;
        break;
      }
    }

    if (isCorrect) {
      this.feedbackState = 'correct';
      this.gs.markCompleted(ID);
      this.hintService.resetErrors(ID);
      this.fb.showFeedback('success', 'Harika! Deseni aynen geçirdin!');
    } else {
      this.feedbackState = 'wrong';
      this.hintService.registerError(ID);
      this.fb.showFeedback('error', 'Bazı noktalar yanlış. Soldaki desene dikkatlice bak.');
    }
    this.persist();
  }

  isHintPulse(index: number): boolean {
    if (!this.showHints) return false;
    return this.targetGrid[index] !== this.userGrid[index];
  }

  prev(): void {
    this.activityService.prev();
  }

  next(): void {
    if (this.isNextUnlocked) {
      this.activityService.next();
    }
  }
}
