import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityService } from '../../core/services/activity.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { GameStateService } from '../../core/services/game-state.service';
import { HintService } from '../../core/services/hint.service';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';

interface CountTask {
  id: number;
  sourceEmoji: string;
  sourceLabel: string;
  sourceCount: number;
  targetEmoji: string;
  targetLabel: string;
  options: number[];
  selectedAnswer: number | null;
}

const ID = 'count-draw-match';

@Component({
  selector: 'app-count-draw-match',
  standalone: true,
  imports: [CommonModule, ActivityHeaderComponent, ActionButtonsComponent, SharedFeedbackComponent],
  templateUrl: './count-draw-match.component.html',
  styleUrl: './count-draw-match.component.scss'
})
export class CountDrawMatchComponent {
  private activityService = inject(ActivityService);
  private feedbackService = inject(FeedbackService);
  private gameStateService = inject(GameStateService);
  private hintService = inject(HintService);

  isCompleted = false;

  tasks: CountTask[] = [
    {
      id: 1,
      sourceEmoji: '🍎', sourceLabel: 'Elma', sourceCount: 5,
      targetEmoji: '🍌', targetLabel: 'Muz',
      options: [3, 4, 5, 6],
      selectedAnswer: null
    },
    {
      id: 2,
      sourceEmoji: '🔺', sourceLabel: 'Üçgen', sourceCount: 4,
      targetEmoji: '🟦', targetLabel: 'Kare',
      options: [3, 4, 5, 6],
      selectedAnswer: null
    },
  ];

  ngOnInit(): void {
    const saved = this.gameStateService.getData<any>(ID);
    if (saved) {
      this.tasks.forEach((t, i) => t.selectedAnswer = saved.selections?.[i] ?? null);
      this.isCompleted = saved.isCompleted ?? false;
    }
  }

  selectOption(taskIdx: number, num: number): void {
    if (this.isCompleted) return;
    const task = this.tasks[taskIdx];
    task.selectedAnswer = task.selectedAnswer === num ? null : num;
    this.persist();
  }

  onCheck(): void {
    const allSelected = this.tasks.every(t => t.selectedAnswer !== null);
    if (!allSelected) {
      this.feedbackService.showWrong();
      return;
    }
    const allCorrect = this.tasks.every(t => t.selectedAnswer === t.sourceCount);
    if (allCorrect) {
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
    this.tasks.forEach(t => t.selectedAnswer = null);
    this.isCompleted = false;
    this.gameStateService.clear(ID);
  }

  getArray(n: number): number[] { return Array.from({ length: n }, (_, i) => i); }

  prev(): void { this.activityService.prev(); }
  next(): void { this.activityService.next(); }

  private persist(): void {
    this.gameStateService.save(ID, {
      selections: this.tasks.map(t => t.selectedAnswer),
      isCompleted: this.isCompleted
    });
  }
}
