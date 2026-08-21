import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityService } from '../../core/services/activity.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { GameStateService } from '../../core/services/game-state.service';
import { HintService } from '../../core/services/hint.service';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';

interface ApplianceItem {
  id: number;
  name: string;
  emoji: string;
  isElectric: boolean;
  selected: boolean;
}

const ID = 'electric-appliance-selection';

@Component({
  selector: 'app-electric-appliance-selection',
  standalone: true,
  imports: [CommonModule, ActivityHeaderComponent, ActionButtonsComponent, SharedFeedbackComponent],
  templateUrl: './electric-appliance-selection.component.html',
  styleUrl: './electric-appliance-selection.component.scss'
})
export class ElectricApplianceSelectionComponent implements OnInit {
  private activityService = inject(ActivityService);
  private feedbackService = inject(FeedbackService);
  private gameStateService = inject(GameStateService);
  private hintService = inject(HintService);

  isCompleted = false;
  checkAlwaysDisabled = false;

  items: ApplianceItem[] = [
    { id: 1, name: 'Halı', emoji: '🧶', isElectric: false, selected: false },
    { id: 2, name: 'Televizyon', emoji: '📺', isElectric: true, selected: false },
    { id: 3, name: 'Lamba', emoji: '💡', isElectric: true, selected: false },
    { id: 4, name: 'Dolap', emoji: '🚪', isElectric: false, selected: false },
    { id: 5, name: 'Koltuk', emoji: '🛋️', isElectric: false, selected: false },
    { id: 6, name: 'Laptop', emoji: '💻', isElectric: true, selected: false },
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

  toggleSelection(item: ApplianceItem): void {
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

    const selectedCorrectly = this.items.every(item => item.selected === item.isElectric);

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
