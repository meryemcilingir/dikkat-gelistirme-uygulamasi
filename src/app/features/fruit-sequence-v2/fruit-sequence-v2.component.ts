import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityService } from '../../core/services/activity.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { GameStateService } from '../../core/services/game-state.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';

interface FruitColumn {
  id: number;
  fruits: string[]; // Emojis: 🍉, 🍓, 🍌
  isCorrect: boolean; // Correct means "this is the rule breaker"
  isShaking?: boolean;
}

const ID = 'fruit-sequence-v2';

@Component({
  selector: 'app-fruit-sequence-v2',
  standalone: true,
  imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent, SharedFeedbackComponent],
  templateUrl: './fruit-sequence-v2.component.html',
  styleUrl: './fruit-sequence-v2.component.scss'
})
export class FruitSequenceV2Component implements OnInit {
  private activityService = inject(ActivityService);
  private feedbackService = inject(FeedbackService);
  private gameStateService = inject(GameStateService);
  private hintService = inject(HintService);

  isCompleted = false;
  checkAlwaysDisabled = false;
  selectedId: number | null = null;

  columns: FruitColumn[] = [
    { id: 1, fruits: ['🍉', '🍓', '🍌', '🍉', '🍓', '🍌', '🍉', '🍓', '🍌', '🍉'], isCorrect: false },
    { id: 2, fruits: ['🍉', '🍓', '🍌', '🍉', '🍓', '🍌', '🍉', '🍓', '🍌', '🍉'], isCorrect: false },
    { id: 3, fruits: ['🍉', '🍓', '🍌', '🍓', '🍉', '🍌', '🍉', '🍓', '🍌', '🍉'], isCorrect: true }, // Error at index 3,4 (Strawberry-Watermelon swapped)
    { id: 4, fruits: ['🍉', '🍓', '🍌', '🍉', '🍓', '🍌', '🍉', '🍓', '🍌', '🍉'], isCorrect: false },
    { id: 5, fruits: ['🍉', '🍓', '🍌', '🍉', '🍓', '🍌', '🍉', '🍓', '🍌', '🍉'], isCorrect: false }
  ];

  ngOnInit(): void {
    const saved = this.gameStateService.getData<any>(ID);
    if (saved) {
      this.selectedId = saved.selectedId;
      this.isCompleted = saved.isCompleted;
    }
  }

  selectColumn(id: number): void {
    if (this.isCompleted) return;
    this.selectedId = this.selectedId === id ? null : id;
    this.persist();
  }

  private persist(): void {
    this.gameStateService.save(ID, {
      selectedId: this.selectedId,
      isCompleted: this.isCompleted
    });
  }

  onReset(): void {
    this.isCompleted = false;
    this.selectedId = null;
    this.columns.forEach(c => c.isShaking = false);
    this.gameStateService.clear(ID);
  }

  onCheck(): void {
    if (this.selectedId === null) {
      this.feedbackService.showWrong();
      return;
    }

    const selected = this.columns.find(c => c.id === this.selectedId);
    if (selected?.isCorrect) {
      this.isCompleted = true;
      this.feedbackService.showCorrect();
      this.gameStateService.markCompleted(ID);
    } else {
      if (selected) {
        selected.isShaking = true;
        setTimeout(() => selected.isShaking = false, 500);
      }
      this.feedbackService.showWrong();
      this.hintService.registerError(ID);
    }
    this.persist();
  }

  prev(): void { this.activityService.prev(); }
  next(): void { this.activityService.next(); }
}
