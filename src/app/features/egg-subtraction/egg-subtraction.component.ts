import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityService } from '../../core/services/activity.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { GameStateService } from '../../core/services/game-state.service';
import { HintService } from '../../core/services/hint.service';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';

const ID = 'egg-subtraction';

@Component({
  selector: 'app-egg-subtraction',
  standalone: true,
  imports: [CommonModule, ActivityHeaderComponent, ActionButtonsComponent, SharedFeedbackComponent],
  templateUrl: './egg-subtraction.component.html',
  styleUrl: './egg-subtraction.component.scss'
})
export class EggSubtractionComponent {
  private activityService = inject(ActivityService);
  private feedbackService = inject(FeedbackService);
  private gameStateService = inject(GameStateService);
  private hintService = inject(HintService);

  isCompleted = false;

  readonly totalEggs = 5;
  readonly brokenEggs = 2;
  readonly correctAnswer = 3; // 5 - 2 = 3

  readonly options = [1, 2, 3, 4];
  selectedAnswer: number | null = null;

  // Egg states: first 3 are whole, last 2 are broken
  readonly eggs = [
    { id: 1, broken: false },
    { id: 2, broken: false },
    { id: 3, broken: false },
    { id: 4, broken: true },
    { id: 5, broken: true },
  ];

  ngOnInit(): void {
    const saved = this.gameStateService.getData<any>(ID);
    if (saved) {
      this.selectedAnswer = saved.selectedAnswer ?? null;
      this.isCompleted = saved.isCompleted ?? false;
    }
  }

  selectOption(num: number): void {
    if (this.isCompleted) return;
    this.selectedAnswer = this.selectedAnswer === num ? null : num;
    this.persist();
  }

  onCheck(): void {
    if (this.selectedAnswer === null) {
      this.feedbackService.showWrong();
      return;
    }
    if (this.selectedAnswer === this.correctAnswer) {
      this.isCompleted = true;
      this.gameStateService.markCompleted(ID);
      this.feedbackService.showCorrect();
    } else {
      this.feedbackService.showWrong();
      this.hintService.registerError(ID);
    }
    this.persist();
  }

  onReset(): void {
    this.selectedAnswer = null;
    this.isCompleted = false;
    this.gameStateService.clear(ID);
  }

  prev(): void { this.activityService.prev(); }
  next(): void { this.activityService.next(); }

  private persist(): void {
    this.gameStateService.save(ID, {
      selectedAnswer: this.selectedAnswer,
      isCompleted: this.isCompleted
    });
  }
}
