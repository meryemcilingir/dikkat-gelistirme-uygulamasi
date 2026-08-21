import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';
import { FormsModule } from '@angular/forms';
import { ActivityService } from '../../core/services/activity.service';

export interface LetterCountOption {
  letter: string;
  count: number;
  userCount: number | null;
}

export interface LetterCountingV2State {
  options: LetterCountOption[];
  feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'letter-counting-v2';

@Component({
  selector: 'app-letter-counting-v2',
  standalone: true,
  imports: [CommonModule, FormsModule, ActionButtonsComponent, ActivityHeaderComponent, SharedFeedbackComponent],
  templateUrl: './letter-counting-v2.component.html',
  styleUrl: './letter-counting-v2.component.scss'
})
export class LetterCountingV2Component implements OnInit {

  // h, h, r, b, r, r, h, r -> h:3, r:4, b:1
  displayLetters: string[] = [];
  
  options: LetterCountOption[] = [
    { letter: 'h', count: 3, userCount: null },
    { letter: 'r', count: 4, userCount: null },
    { letter: 'b', count: 1, userCount: null },
  ];

  feedbackState: 'correct' | 'wrong' | null = null;
  isCompleted: boolean = false;
  checkAlwaysDisabled: boolean = false;

  constructor(
    private router: Router,
    private gs: GameStateService,
    private fb: FeedbackService,
    private hintService: HintService,
    private activityService: ActivityService
  ) {
    const pool = ['h', 'h', 'r', 'b', 'r', 'r', 'h', 'r'];
    this.displayLetters = pool.sort(() => Math.random() - 0.5);
  }

  get showHint(): boolean {
    return this.hintService.shouldShowHint(ID);
  }

  ngOnInit(): void {
    const saved = this.gs.getData<LetterCountingV2State>(ID);
    if (saved) {
      this.options.forEach((opt, i) => {
        if (saved.options[i]) opt.userCount = saved.options[i].userCount;
      });
      this.feedbackState = saved.feedbackState;
      if (this.feedbackState === 'correct') {
        this.isCompleted = true;
      }
    }
  }

  private persist(): void {
    this.gs.save(ID, {
      options: this.options,
      feedbackState: this.feedbackState
    });
  }

  onReset(): void {
    this.options.forEach(o => o.userCount = null);
    this.feedbackState = null;
    this.isCompleted = false;
    this.gs.clear(ID);
    this.hintService.resetErrors(ID);
    this.persist();
  }

  onCheck(): void {
    const allFilled = this.options.every(o => o.userCount !== null);
    if (!allFilled) {
      this.fb.showFeedback('error', 'Lütfen tüm kutucukları doldurun!');
      return;
    }

    const isAllCorrect = this.options.every(o => o.userCount === o.count);

    if (isAllCorrect) {
      this.feedbackState = 'correct';
      this.isCompleted = true;
      this.gs.markCompleted(ID);
      this.hintService.resetErrors(ID);
      this.fb.showFeedback('success', 'Tebrikler! Tüm harfleri doğru saydın! 📝');
    } else {
      this.feedbackState = 'wrong';
      this.hintService.registerError(ID);
      this.fb.showFeedback('error', 'Bazı sayılar yanlış. Tekrar saymayı dene.');
    }
    this.persist();
  }

  prev(): void {
    this.activityService.prev();
  }

  next(): void {
    if (this.isCompleted) {
      this.activityService.next();
    }
  }
}
