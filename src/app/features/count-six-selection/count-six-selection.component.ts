import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityService } from '../../core/services/activity.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { GameStateService } from '../../core/services/game-state.service';
import { HintService } from '../../core/services/hint.service';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';

interface CountItem {
  id: number;
  name: string;
  emoji: string;
  count: number;
  isCorrect: boolean;
}

const ID = 'count-six-selection';

@Component({
  selector: 'app-count-six-selection',
  standalone: true,
  imports: [CommonModule, ActivityHeaderComponent, ActionButtonsComponent, SharedFeedbackComponent],
  templateUrl: './count-six-selection.component.html',
  styleUrl: './count-six-selection.component.scss'
})
export class CountSixSelectionComponent implements OnInit {
  private activityService = inject(ActivityService);
  private feedbackService = inject(FeedbackService);
  private gameStateService = inject(GameStateService);
  private hintService = inject(HintService);

  isCompleted = false;
  checkAlwaysDisabled = false;

  items: CountItem[] = [
    { id: 1, name: 'Çiçekler', emoji: '🌹', count: 5, isCorrect: false },
    { id: 2, name: 'Yıldızlar', emoji: '⭐', count: 6, isCorrect: true },
    { id: 3, name: 'Gözlükler', emoji: '🕶️', count: 3, isCorrect: false },
    { id: 4, name: 'Muzlar', emoji: '🍌', count: 4, isCorrect: false },
  ];

  selectedId: number | null = null;

  ngOnInit(): void {
    const savedData = this.gameStateService.getData<any>(ID);
    if (savedData) {
      this.isCompleted = savedData.isCompleted;
      this.selectedId = savedData.selectedId;
    }
  }

  selectItem(id: number): void {
    if (this.isCompleted) return;
    this.selectedId = this.selectedId === id ? null : id;
    this.persist();
  }

  private persist(): void {
    this.gameStateService.save(ID, { isCompleted: this.isCompleted, selectedId: this.selectedId });
  }

  getRepeatArray(count: number): number[] {
    return Array(count).fill(0);
  }

  onReset(): void {
    this.isCompleted = false;
    this.selectedId = null;
    this.gameStateService.clear(ID);
  }

  onCheck(): void {
    if (this.selectedId === null) return;

    const selected = this.items.find(i => i.id === this.selectedId);
    if (selected?.isCorrect) {
      this.isCompleted = true;
      this.feedbackService.showCorrect();
      this.gameStateService.markCompleted(ID);
    } else {
      this.feedbackService.showWrong();
      this.hintService.registerError(ID);
    }
    this.persist();
  }

  prev(): void { this.activityService.prev(); }
  next(): void { this.activityService.next(); }
}
