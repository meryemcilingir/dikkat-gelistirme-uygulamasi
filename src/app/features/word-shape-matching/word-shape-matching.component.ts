import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActivityService } from '../../core/services/activity.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';

export interface ShapeOption {
  id: number;
  items: string[];
  isCorrect: boolean;
}

export interface WordShapeMatchingState {
  selectedOptionId: number | null;
  feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'word-shape-matching';

@Component({
  selector: 'app-word-shape-matching',
  standalone: true,
  imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent, SharedFeedbackComponent],
  templateUrl: './word-shape-matching.component.html',
  styleUrl: './word-shape-matching.component.scss'
})
export class WordShapeMatchingComponent implements OnInit {
  
  targetWords = 'YILDIZ - AĞAÇ - GÜNEŞ';

  options: ShapeOption[] = [
    { id: 1, items: ['☀️', '⭐', '🌳'], isCorrect: false },
    { id: 2, items: ['🌳', '⭐', '☀️'], isCorrect: false },
    { id: 3, items: ['⭐', '🌳', '☀️'], isCorrect: true }
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
    const saved = this.gs.getData<WordShapeMatchingState>(ID);
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
    this.gs.clear(ID);
    this.hintService.resetErrors(ID);
    this.persist();
  }

  onCheck(): void {
    if (this.selectedOptionId === null) {
      this.fb.showFeedback('error', 'Lütfen bir dizi seçin!');
      return;
    }

    const selectedOption = this.options.find(o => o.id === this.selectedOptionId);
    
    if (selectedOption?.isCorrect) {
      this.feedbackState = 'correct';
      this.gs.markCompleted(ID);
      this.hintService.resetErrors(ID);
      this.fb.showFeedback('success', 'Harika! Doğru eşleşmeyi buldun!');
    } else {
      this.feedbackState = 'wrong';
      this.hintService.registerError(ID);
      this.fb.showFeedback('error', 'Yanlış sıra. Kelimelerin sırasına dikkat et!');
    }
    this.persist();
  }

  isHintCorrect(id: number): boolean {
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
