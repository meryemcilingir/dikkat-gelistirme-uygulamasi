import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActivityService } from '../../core/services/activity.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';

export interface GridOption {
  id: number;
  colors: string[]; // [top-left, top-right, bottom-left, bottom-right]
  isCorrect: boolean;
  isShaking?: boolean;
}

export interface RotateGridState {
  selectedOptionId: number | null;
  feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'rotate-grid';

@Component({
  selector: 'app-rotate-grid',
  standalone: true,
  imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent, SharedFeedbackComponent],
  templateUrl: './rotate-grid.component.html',
  styleUrl: './rotate-grid.component.scss'
})
export class RotateGridComponent implements OnInit {
  
  targetColors = ['#ffb74d', '#81c784', '#f06292', '#3f51b5']; // Orange, Green, Pink, Blue

  options: GridOption[] = [
    { id: 1, colors: ['#81c784', '#3f51b5', '#ffb74d', '#f06292'], isCorrect: true }, // Rotated CCW
    { id: 2, colors: ['#ffb74d', '#81c784', '#f06292', '#3f51b5'], isCorrect: false }, // Same as target
    { id: 3, colors: ['#3f51b5', '#f06292', '#81c784', '#ffb74d'], isCorrect: false }  // Rotated 180
  ];

  selectedOptionId: number | null = null;
  feedbackState: 'correct' | 'wrong' | null = null;

  private gs = inject(GameStateService);
  private fb = inject(FeedbackService);
  private hintService = inject(HintService);
  private activityService = inject(ActivityService);

  get showHints(): boolean {
    return this.hintService.shouldShowHint(ID);
  }

  get isNextUnlocked(): boolean {
    return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
  }

  ngOnInit(): void {
    const saved = this.gs.getData<RotateGridState>(ID);
    if (saved) {
      this.selectedOptionId = saved.selectedOptionId;
      this.feedbackState = saved.feedbackState;
    }
  }

  private persist(): void {
    this.gs.save(ID, {
      selectedOptionId: this.selectedOptionId,
      feedbackState: this.feedbackState
    });
  }

  selectOption(id: number): void {
    if (this.gs.isCompleted(ID) && this.feedbackState === 'correct') return;
    this.selectedOptionId = id;
    this.feedbackState = null;
    this.persist();
  }

  onReset(): void {
    this.selectedOptionId = null;
    this.feedbackState = null;
    this.options.forEach(o => o.isShaking = false);
    this.gs.clear(ID);
    this.hintService.resetErrors(ID);
    this.persist();
  }

  onCheck(): void {
    if (this.selectedOptionId === null) {
      this.fb.showFeedback('error', 'Lütfen bir seçenek işaretleyin!');
      return;
    }

    const selectedOption = this.options.find(o => o.id === this.selectedOptionId);
    
    if (selectedOption?.isCorrect) {
      this.feedbackState = 'correct';
      this.gs.markCompleted(ID);
      this.hintService.resetErrors(ID);
      this.fb.showFeedback('success', 'Harika! Kareyi sola doğru çevirdin!');
    } else {
      this.feedbackState = 'wrong';
      this.hintService.registerError(ID);

      if (selectedOption) {
        selectedOption.isShaking = true;
        setTimeout(() => selectedOption.isShaking = false, 500);
      }
      
      this.fb.showFeedback('error', 'Yanlış döndürdün. Sola doğru dönünce renkler nasıl yer değiştirir düşün.');
    }
    this.persist();
  }

  isHintPulse(id: number): boolean {
    if (!this.showHints) return false;
    const opt = this.options.find(o => o.id === id);
    return opt?.isCorrect === true;
  }

  prev(): void {
    this.activityService.prev();
  }

  next(): void {
    if (this.isNextUnlocked) {
      this.activityService.next();
    }
  }
}
