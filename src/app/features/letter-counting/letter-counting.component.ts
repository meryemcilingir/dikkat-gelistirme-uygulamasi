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

export interface LetterCountOption {
  letter: string;
  count: number;
  userCount: number | null;
}

export interface LetterCountingState {
  options: LetterCountOption[];
  feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'letter-counting';

@Component({
  selector: 'app-letter-counting',
  standalone: true,
  imports: [CommonModule, FormsModule, ActionButtonsComponent, ActivityHeaderComponent, SharedFeedbackComponent],
  templateUrl: './letter-counting.component.html',
  styleUrl: './letter-counting.component.scss'
})
export class LetterCountingComponent implements OnInit {

  // As per request: 8 letters total, 3 distinct letters
  randomLetters: string[] = ['a', 'a', 'n', 'n', 'e', 'e', 'e', 't']; // Wait, user example: aarrvvv (7 letters?)
  // User said: "rastgele sayı sayısı 8 tane olsun ve sadece 3 harf tekrarlansın"
  // Let's use: A, N, E. Total 8.
  // Example: A:2, N:3, E:3
  displayLetters: string[] = [];
  
  options: LetterCountOption[] = [
    { letter: 'a', count: 2, userCount: null },
    { letter: 'n', count: 3, userCount: null },
    { letter: 'e', count: 3, userCount: null },
  ];

  feedbackState: 'correct' | 'wrong' | null = null;
  isCompleted: boolean = false;
  checkAlwaysDisabled: boolean = false;

  constructor(
    private router: Router,
    private gs: GameStateService,
    private fb: FeedbackService,
    private hintService: HintService
  ) {
    // Shuffling display letters
    const pool = ['a', 'a', 'n', 'n', 'n', 'e', 'e', 'e'];
    this.displayLetters = pool.sort(() => Math.random() - 0.5);
  }

  get showHint(): boolean {
    return this.hintService.shouldShowHint(ID);
  }

  ngOnInit(): void {
    const saved = this.gs.getData<LetterCountingState>(ID);
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
    this.router.navigate(['/sport-matching']);
  }

  next(): void {
    if (this.isCompleted) {
      this.router.navigate(['/elephant-direction']);
    }
  }
}
