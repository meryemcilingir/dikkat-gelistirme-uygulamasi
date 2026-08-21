import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityService } from '../../core/services/activity.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { GameStateService } from '../../core/services/game-state.service';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';

interface Activity {
  id: number;
  emoji: string;
  label: string;
}

const ID = 'favorite-activity';

@Component({
  selector: 'app-favorite-activity',
  standalone: true,
  imports: [CommonModule, ActivityHeaderComponent, ActionButtonsComponent, SharedFeedbackComponent],
  templateUrl: './favorite-activity.component.html',
  styleUrl: './favorite-activity.component.scss'
})
export class FavoriteActivityComponent {
  private activityService = inject(ActivityService);
  private feedbackService = inject(FeedbackService);
  private gameStateService = inject(GameStateService);

  isCompleted = false;
  selectedId: number | null = null;

  activities: Activity[] = [
    { id: 1, emoji: '⚽', label: 'Top oynama' },
    { id: 2, emoji: '🎨', label: 'Resim yapma' },
    { id: 3, emoji: '🏃', label: 'Koşma' },
  ];

  ngOnInit(): void {
    const saved = this.gameStateService.getData<any>(ID);
    if (saved) {
      this.selectedId = saved.selectedId ?? null;
      this.isCompleted = saved.isCompleted ?? false;
    }
  }

  selectActivity(id: number): void {
    if (this.isCompleted) return;
    this.selectedId = id;
    this.persist();
  }

  onCheck(): void {
    if (this.selectedId === null) {
      this.feedbackService.showWrong();
      return;
    }
    // All answers are correct!
    this.isCompleted = true;
    this.gameStateService.markCompleted(ID);
    this.feedbackService.showCorrect();
    this.persist();
  }

  onReset(): void {
    this.selectedId = null;
    this.isCompleted = false;
    this.gameStateService.clear(ID);
  }

  prev(): void { this.activityService.prev(); }
  next(): void { this.activityService.next(); }

  private persist(): void {
    this.gameStateService.save(ID, {
      selectedId: this.selectedId,
      isCompleted: this.isCompleted
    });
  }
}
