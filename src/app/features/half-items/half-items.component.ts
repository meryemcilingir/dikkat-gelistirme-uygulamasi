import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityService } from '../../core/services/activity.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { GameStateService } from '../../core/services/game-state.service';
import { HintService } from '../../core/services/hint.service';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';

interface FoodItem {
  id: number;
  emoji: string;
  label: string;
  isHalf: boolean;
  isSelected: boolean;
}

const ID = 'half-items';

@Component({
  selector: 'app-half-items',
  standalone: true,
  imports: [CommonModule, ActivityHeaderComponent, ActionButtonsComponent, SharedFeedbackComponent],
  templateUrl: './half-items.component.html',
  styleUrl: './half-items.component.scss'
})
export class HalfItemsComponent {
  private activityService = inject(ActivityService);
  private feedbackService = inject(FeedbackService);
  private gameStateService = inject(GameStateService);
  private hintService = inject(HintService);

  isCompleted = false;

  items: FoodItem[] = [
    { id: 1, emoji: '🍎', label: 'Elma', isHalf: false, isSelected: false },
    { id: 2, emoji: '🍞', label: 'Ekmek', isHalf: true, isSelected: false },
    { id: 3, emoji: '🍅', label: 'Domates', isHalf: false, isSelected: false },
    { id: 4, emoji: '🍌', label: 'Muz', isHalf: true, isSelected: false },
    { id: 5, emoji: '🍕', label: 'Pizza', isHalf: true, isSelected: false },
  ];

  ngOnInit(): void {
    const saved = this.gameStateService.getData<any>(ID);
    if (saved) {
      this.items.forEach((item, i) => item.isSelected = saved.selections?.[i] ?? false);
      this.isCompleted = saved.isCompleted ?? false;
    }
  }

  toggleItem(id: number): void {
    if (this.isCompleted) return;
    const item = this.items.find(i => i.id === id);
    if (item) item.isSelected = !item.isSelected;
    this.persist();
  }

  onCheck(): void {
    const anySelected = this.items.some(i => i.isSelected);
    if (!anySelected) {
      this.feedbackService.showWrong();
      return;
    }
    const allCorrect = this.items.every(i => i.isSelected === i.isHalf);
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
    this.items.forEach(i => i.isSelected = false);
    this.isCompleted = false;
    this.gameStateService.clear(ID);
  }

  prev(): void { this.activityService.prev(); }
  next(): void { this.activityService.next(); }

  private persist(): void {
    this.gameStateService.save(ID, {
      selections: this.items.map(i => i.isSelected),
      isCompleted: this.isCompleted
    });
  }
}
