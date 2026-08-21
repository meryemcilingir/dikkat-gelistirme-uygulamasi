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

interface GridCell {
  id: number;
  value: number | null;
  isEditable: boolean;
  userValue: number | null;
}

interface MissingNumberState {
  userValue: number | null;
  feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'missing-number-grid';

@Component({
  selector: 'app-missing-number-grid',
  standalone: true,
  imports: [CommonModule, FormsModule, ActionButtonsComponent, ActivityHeaderComponent, SharedFeedbackComponent],
  templateUrl: './missing-number-grid.component.html',
  styleUrl: './missing-number-grid.component.scss'
})
export class MissingNumberGridComponent implements OnInit {
  private gs = inject(GameStateService);
  private fb = inject(FeedbackService);
  private hintService = inject(HintService);
  private activityService = inject(ActivityService);

  grid: GridCell[] = [
    { id: 1, value: 1, isEditable: false, userValue: null },
    { id: 2, value: 2, isEditable: false, userValue: null },
    { id: 3, value: 3, isEditable: false, userValue: null },
    { id: 4, value: 4, isEditable: false, userValue: null },
    { id: 5, value: 5, isEditable: true,  userValue: null },
    { id: 6, value: 6, isEditable: false, userValue: null },
    { id: 7, value: 7, isEditable: false, userValue: null },
    { id: 8, value: 8, isEditable: false, userValue: null },
    { id: 9, value: 9, isEditable: false, userValue: null },
  ];

  feedbackState: 'correct' | 'wrong' | null = null;

  get editableCell(): GridCell {
    return this.grid.find(c => c.isEditable)!;
  }

  get showHint(): boolean {
    return this.hintService.shouldShowHint(ID);
  }

  get isNextUnlocked(): boolean {
    return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
  }

  ngOnInit(): void {
    const saved = this.gs.getData<MissingNumberState>(ID);
    if (saved) {
      this.editableCell.userValue = saved.userValue;
      this.feedbackState = saved.feedbackState;
    }
  }

  private persist(): void {
    this.gs.save(ID, {
      userValue: this.editableCell.userValue,
      feedbackState: this.feedbackState
    });
  }

  onCheck(): void {
    if (this.editableCell.userValue === null) {
      this.fb.showFeedback('error', 'Lütfen boş kutuya bir sayı yazın!');
      return;
    }

    if (this.editableCell.userValue === this.editableCell.value) {
      this.feedbackState = 'correct';
      this.gs.markCompleted(ID);
      this.hintService.resetErrors(ID);
      this.fb.showFeedback('success', 'Harika! Eksik sayıyı doğru buldun!');
    } else {
      this.feedbackState = 'wrong';
      this.hintService.registerError(ID);
      this.fb.showFeedback('error', 'Yanlış sayı. Tablodaki sıraya dikkat et!');
    }
    this.persist();
  }

  onReset(): void {
    this.editableCell.userValue = null;
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
