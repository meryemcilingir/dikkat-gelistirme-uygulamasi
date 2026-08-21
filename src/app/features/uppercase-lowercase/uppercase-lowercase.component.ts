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

export interface LetterFrame {
  id: number;
  upper1: string;
  lower1: string;
  userLower1: string;
  upper2: string;
  lower2: string;
  userLower2: string;
}

export interface UppercaseLowercaseState {
  frames: { id: number; userLower1: string; userLower2: string }[];
  feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'uppercase-lowercase';

@Component({
  selector: 'app-uppercase-lowercase',
  standalone: true,
  imports: [CommonModule, FormsModule, ActionButtonsComponent, ActivityHeaderComponent, SharedFeedbackComponent],
  templateUrl: './uppercase-lowercase.component.html',
  styleUrl: './uppercase-lowercase.component.scss'
})
export class UppercaseLowercaseComponent implements OnInit {
  frames: LetterFrame[] = [
    { id: 1, upper1: 'E', lower1: 'e', userLower1: '', upper2: 'A', lower2: 'a', userLower2: '' },
    { id: 2, upper1: 'F', lower1: 'f', userLower1: '', upper2: 'K', lower2: 'k', userLower2: '' }
  ];

  feedbackState: 'correct' | 'wrong' | null = null;
  checkAlwaysDisabled = false;

  private gs = inject(GameStateService);
  private fb = inject(FeedbackService);
  private hintService = inject(HintService);
  private activityService = inject(ActivityService);

  get showHint(): boolean {
    return this.hintService.shouldShowHint(ID);
  }

  get isNextUnlocked(): boolean {
    return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
  }

  ngOnInit(): void {
    const saved = this.gs.getData<UppercaseLowercaseState>(ID);
    if (saved) {
      saved.frames.forEach(sf => {
        const frame = this.frames.find(f => f.id === sf.id);
        if (frame) {
          frame.userLower1 = sf.userLower1;
          frame.userLower2 = sf.userLower2;
        }
      });
      this.feedbackState = saved.feedbackState;
    }
  }

  private persist(): void {
    this.gs.save(ID, {
      frames: this.frames.map(f => ({ id: f.id, userLower1: f.userLower1, userLower2: f.userLower2 })),
      feedbackState: this.feedbackState
    });
  }

  onReset(): void {
    this.frames.forEach(f => {
      f.userLower1 = '';
      f.userLower2 = '';
    });
    this.feedbackState = null;
    this.gs.clear(ID);
    this.hintService.resetErrors(ID);
    this.persist();
  }

  onCheck(): void {
    const allFilled = this.frames.every(f => f.userLower1.trim() !== '' && f.userLower2.trim() !== '');
    if (!allFilled) {
      this.fb.showFeedback('error', 'Lütfen tüm küçük harfleri yazın.');
      return;
    }

    const allCorrect = this.frames.every(
      f => f.userLower1.trim() === f.lower1 && f.userLower2.trim() === f.lower2
    );

    if (allCorrect) {
      this.feedbackState = 'correct';
      this.gs.markCompleted(ID);
      this.hintService.resetErrors(ID);
      this.fb.showFeedback('success', 'Tebrikler! Büyük ve küçük harfleri doğru eşleştirdin!');
    } else {
      this.feedbackState = 'wrong';
      this.hintService.registerError(ID);
      this.fb.showFeedback('error', 'Bazı harfler yanlış. Büyük harfe tam uyan küçük harfi yazmalısın.');
    }
    this.persist();
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
