import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityService } from '../../core/services/activity.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { GameStateService } from '../../core/services/game-state.service';
import { HintService } from '../../core/services/hint.service';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';

interface SelectionItem {
  id: number;
  name: string;
  emoji: string;
  isCorrect: boolean;
  selected: boolean;
}

const ID = 'rectangle-selection';

@Component({
  selector: 'app-rectangle-selection',
  standalone: true,
  imports: [CommonModule, ActivityHeaderComponent, ActionButtonsComponent, SharedFeedbackComponent],
  templateUrl: './rectangle-selection.component.html',
  styleUrl: './rectangle-selection.component.scss'
})
export class RectangleSelectionComponent implements OnInit {
  private activityService = inject(ActivityService);
  private feedbackService = inject(FeedbackService);
  private gameStateService = inject(GameStateService);
  private hintService = inject(HintService);

  isCompleted = false;
  checkAlwaysDisabled = false;

  items: SelectionItem[] = [
    { id: 1, name: 'Bayrak', emoji: '🚩', isCorrect: false, selected: false },
    { id: 2, name: 'Uyarı Levhası', emoji: '⚠️', isCorrect: false, selected: false },
    { id: 3, name: 'Küp', emoji: '🧊', isCorrect: false, selected: false },
    { id: 4, name: 'Monitör / TV', emoji: '🖥️', isCorrect: true, selected: false },
    { id: 5, name: 'Top', emoji: '⚽', isCorrect: false, selected: false },
    { id: 6, name: 'Yastık', emoji: '⬜', isCorrect: true, selected: false },
    { id: 7, name: 'Kitap', emoji: '📖', isCorrect: true, selected: false },
  ];

  ngOnInit(): void {
    const savedData = this.gameStateService.getData<any>(ID);
    if (savedData) {
      this.isCompleted = savedData.isCompleted;
      if (savedData.selectedIds) {
        this.items.forEach(item => {
          item.selected = savedData.selectedIds.includes(item.id);
        });
      }
    }
  }

  toggleSelection(item: SelectionItem): void {
    if (this.isCompleted) return;
    item.selected = !item.selected;
    this.persist();
  }

  private persist(): void {
    this.gameStateService.save(ID, {
      isCompleted: this.isCompleted,
      selectedIds: this.items.filter(i => i.selected).map(i => i.id)
    });
  }

  onReset(): void {
    this.isCompleted = false;
    this.items.forEach(item => item.selected = false);
    this.gameStateService.clear(ID);
  }

  onCheck(): void {
    if (!this.items.some(item => item.selected)) {
      this.feedbackService.showWrong();
      return;
    }

    const selectedCorrectly = this.items.every(item => item.selected === item.isCorrect);

    if (selectedCorrectly) {
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
