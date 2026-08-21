import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityService } from '../../core/services/activity.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { GameStateService } from '../../core/services/game-state.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';

interface LetterOption {
  id: number;
  char: string;
  isSelected: boolean;
  isCorrect: boolean;
}

const ID = 'zebra-letters';

@Component({
  selector: 'app-zebra-letter-selection',
  standalone: true,
  imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent, SharedFeedbackComponent],
  templateUrl: './zebra-letter-selection.component.html',
  styleUrl: './zebra-letter-selection.component.scss'
})
export class ZebraLetterSelectionComponent implements OnInit {
  private activityService = inject(ActivityService);
  private feedbackService = inject(FeedbackService);
  private gameStateService = inject(GameStateService);
  private hintService = inject(HintService);

  isCompleted = false;
  checkAlwaysDisabled = false;

  options: LetterOption[] = [
    { id: 1, char: 'Z', isSelected: false, isCorrect: true },
    { id: 2, char: 'P', isSelected: false, isCorrect: false },
    { id: 3, char: 'S', isSelected: false, isCorrect: false },
    { id: 4, char: 'U', isSelected: false, isCorrect: false }
  ];

  ngOnInit(): void {
    const saved = this.gameStateService.getData<any>(ID);
    if (saved) {
      this.isCompleted = saved.isCompleted;
      if (saved.selectedIds) {
        this.options.forEach(opt => {
          opt.isSelected = saved.selectedIds.includes(opt.id);
        });
      }
    }
  }

  toggleSelection(id: number): void {
    if (this.isCompleted) return;
    const item = this.options.find(o => o.id === id);
    if (item) {
      item.isSelected = !item.isSelected;
      this.persist();
    }
  }

  private persist(): void {
    this.gameStateService.save(ID, {
      isCompleted: this.isCompleted,
      selectedIds: this.options.filter(o => o.isSelected).map(o => o.id)
    });
  }

  onReset(): void {
    this.isCompleted = false;
    this.options.forEach(o => o.isSelected = false);
    this.gameStateService.clear(ID);
  }

  onCheck(): void {
    const selectedOptions = this.options.filter(o => o.isSelected);
    if (selectedOptions.length === 0) {
      this.feedbackService.showWrong();
      return;
    }

    // Doğru seçimler: Sadece isCorrect: true olanlar işaretlenmeli, isCorrect: false olanlar işaretlenmemeli.
    const allCorrectMarked = this.options.every(o => o.isCorrect === o.isSelected);

    if (allCorrectMarked) {
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
