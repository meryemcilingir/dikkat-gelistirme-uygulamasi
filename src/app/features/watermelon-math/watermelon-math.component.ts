import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityService } from '../../core/services/activity.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { GameStateService } from '../../core/services/game-state.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';

interface MathOption {
  value: number;
  isSelected: boolean;
}

const ID = 'watermelon-math';

@Component({
  selector: 'app-watermelon-math',
  standalone: true,
  imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent, SharedFeedbackComponent],
  templateUrl: './watermelon-math.component.html',
  styleUrl: './watermelon-math.component.scss'
})
export class WatermelonMathComponent implements OnInit {
  private activityService = inject(ActivityService);
  private feedbackService = inject(FeedbackService);
  private gameStateService = inject(GameStateService);
  private hintService = inject(HintService);

  isCompleted = false;
  checkAlwaysDisabled = false;
  selectedOption: number | null = null;
  
  options: MathOption[] = [
    { value: 6, isSelected: false },
    { value: 1, isSelected: false },
    { value: 3, isSelected: false },
    { value: 7, isSelected: false }
  ];

  ngOnInit(): void {
    const saved = this.gameStateService.getData<any>(ID);
    if (saved) {
      this.selectedOption = saved.selectedOption;
      this.isCompleted = saved.isCompleted;
      if (this.selectedOption !== null) {
        this.options.forEach(opt => opt.isSelected = opt.value === this.selectedOption);
      }
    }
  }

  selectOption(val: number): void {
    if (this.isCompleted) return;
    this.selectedOption = val;
    this.options.forEach(opt => opt.isSelected = opt.value === val);
    this.persist();
  }

  private persist(): void {
    this.gameStateService.save(ID, {
      selectedOption: this.selectedOption,
      isCompleted: this.isCompleted
    });
  }

  onReset(): void {
    this.selectedOption = null;
    this.isCompleted = false;
    this.options.forEach(opt => opt.isSelected = false);
    this.gameStateService.clear(ID);
  }

  onCheck(): void {
    if (this.selectedOption === null) {
      this.feedbackService.showWrong();
      return;
    }

    if (this.selectedOption === 6) {
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
