import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityService } from '../../core/services/activity.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { GameStateService } from '../../core/services/game-state.service';
import { HintService } from '../../core/services/hint.service';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';

interface ObjectGroup {
  id: number;
  emoji: string;
  count: number;
  options: number[];
  selectedOption: number | null;
}

const ID = 'object-count-selection';

@Component({
  selector: 'app-object-count-selection',
  standalone: true,
  imports: [CommonModule, ActivityHeaderComponent, ActionButtonsComponent, SharedFeedbackComponent],
  templateUrl: './object-count-selection.component.html',
  styleUrl: './object-count-selection.component.scss'
})
export class ObjectCountSelectionComponent {
  private activityService = inject(ActivityService);
  private feedbackService = inject(FeedbackService);
  private gameStateService = inject(GameStateService);
  private hintService = inject(HintService);

  isCompleted = false;

  groups: ObjectGroup[] = [
    { id: 1, emoji: '🌺', count: 5, options: [5, 6, 7, 8], selectedOption: null },
    { id: 2, emoji: '⚽', count: 6, options: [5, 6, 7, 8], selectedOption: null },
    { id: 3, emoji: '💜', count: 4, options: [3, 4, 5, 6], selectedOption: null },
  ];

  ngOnInit(): void {
    const saved = this.gameStateService.getData<any>(ID);
    if (saved) {
      this.groups.forEach((g, i) => g.selectedOption = saved.selections?.[i] ?? null);
      this.isCompleted = saved.isCompleted ?? false;
    }
  }

  selectNumber(groupIdx: number, num: number): void {
    if (this.isCompleted) return;
    const group = this.groups[groupIdx];
    group.selectedOption = group.selectedOption === num ? null : num;
    this.persist();
  }

  onCheck(): void {
    const allSelected = this.groups.every(g => g.selectedOption !== null);
    if (!allSelected) {
      this.feedbackService.showWrong();
      return;
    }
    const allCorrect = this.groups.every(g => g.selectedOption === g.count);
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
    this.groups.forEach(g => g.selectedOption = null);
    this.isCompleted = false;
    this.gameStateService.clear(ID);
  }

  getArray(n: number): number[] { return Array.from({ length: n }, (_, i) => i); }

  prev(): void { this.activityService.prev(); }
  next(): void { this.activityService.next(); }

  private persist(): void {
    this.gameStateService.save(ID, {
      selections: this.groups.map(g => g.selectedOption),
      isCompleted: this.isCompleted
    });
  }
}
