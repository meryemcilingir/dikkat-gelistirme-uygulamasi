import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActivityService } from '../../core/services/activity.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';

export interface LadybugState {
  selectedOptionId: number | null;
  feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'ladybug-spots';

@Component({
  selector: 'app-ladybug-spots',
  standalone: true,
  imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent, SharedFeedbackComponent],
  templateUrl: './ladybug-spots.component.html',
  styleUrl: './ladybug-spots.component.scss'
})
export class LadybugSpotsComponent implements OnInit {
  
  options = [
    { id: 1, text: '7', isCorrect: true, isShaking: false },
    { id: 2, text: '9', isCorrect: false, isShaking: false },
    { id: 3, text: '4', isCorrect: false, isShaking: false }
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
    const saved = this.gs.getData<LadybugState>(ID);
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
      this.fb.showFeedback('error', 'Lütfen bir sayı seçin!');
      return;
    }

    const selectedOption = this.options.find(o => o.id === this.selectedOptionId);
    
    if (selectedOption?.isCorrect) {
      this.feedbackState = 'correct';
      this.gs.markCompleted(ID);
      this.hintService.resetErrors(ID);
      this.fb.showFeedback('success', 'Harika! Uğur böceğinin beneklerini doğru saydın!');
    } else {
      this.feedbackState = 'wrong';
      this.hintService.registerError(ID);
      
      this.selectedOptionId = null;
      if (selectedOption) {
        selectedOption.isShaking = true;
        setTimeout(() => selectedOption.isShaking = false, 500);
      }
      
      this.fb.showFeedback('error', 'Yanlış saydın. Tekrar dene!');
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
