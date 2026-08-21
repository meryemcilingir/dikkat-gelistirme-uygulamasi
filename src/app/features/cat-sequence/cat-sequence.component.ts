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

interface CatMapping {
  id: number;
  emoji: string;
}

interface CatSequenceItem {
  id: number;
  catId: number;
  emoji: string;
  userNumber: number | null;
}

interface CatSequenceState {
  userNumbers: (number | null)[];
  feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'cat-sequence';

@Component({
  selector: 'app-cat-sequence',
  standalone: true,
  imports: [CommonModule, FormsModule, ActionButtonsComponent, ActivityHeaderComponent, SharedFeedbackComponent],
  templateUrl: './cat-sequence.component.html',
  styleUrl: './cat-sequence.component.scss'
})
export class CatSequenceComponent implements OnInit {
  private gs = inject(GameStateService);
  private fb = inject(FeedbackService);
  private hintService = inject(HintService);
  private activityService = inject(ActivityService);

  mappings: CatMapping[] = [
    { id: 1, emoji: '🐱' },
    { id: 2, emoji: '😻' },
    { id: 3, emoji: '😽' },
    { id: 4, emoji: '😿' }
  ];

  sequence: CatSequenceItem[] = [
    { id: 1, catId: 3, emoji: '😽', userNumber: null },
    { id: 2, catId: 2, emoji: '😻', userNumber: null },
    { id: 3, catId: 4, emoji: '😿', userNumber: null },
    { id: 4, catId: 1, emoji: '🐱', userNumber: null }
  ];

  feedbackState: 'correct' | 'wrong' | null = null;

  get showHint(): boolean {
    return this.hintService.shouldShowHint(ID);
  }

  get isNextUnlocked(): boolean {
    return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
  }

  ngOnInit(): void {
    const saved = this.gs.getData<CatSequenceState>(ID);
    if (saved) {
      this.sequence.forEach((item, i) => {
        item.userNumber = saved.userNumbers[i];
      });
      this.feedbackState = saved.feedbackState;
    }
  }

  private persist(): void {
    this.gs.save(ID, {
      userNumbers: this.sequence.map(s => s.userNumber),
      feedbackState: this.feedbackState
    });
  }

  onCheck(): void {
    const allAnswered = this.sequence.every(s => s.userNumber !== null);
    if (!allAnswered) {
      this.fb.showFeedback('error', 'Lütfen tüm kutulara numara yazın!');
      return;
    }

    const allCorrect = this.sequence.every(s => s.userNumber === s.catId);
    this.feedbackState = allCorrect ? 'correct' : 'wrong';

    if (allCorrect) {
      this.gs.markCompleted(ID);
      this.hintService.resetErrors(ID);
      this.fb.showFeedback('success', 'Harika! Kedilerle sayıları doğru eşleştirdin!');
    } else {
      this.hintService.registerError(ID);
      this.fb.showFeedback('error', 'Bazı numaralar yanlış. Yukarıdaki eşleştirmelere dikkat et!');
    }
    this.persist();
  }

  onReset(): void {
    this.sequence.forEach(s => s.userNumber = null);
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
