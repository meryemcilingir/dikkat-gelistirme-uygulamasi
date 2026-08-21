import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityService } from '../../core/services/activity.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { GameStateService } from '../../core/services/game-state.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';

interface ProfessionOption {
  id: number;
  emoji: string;
  isCorrect: boolean;
  isShaking?: boolean;
}

const ID = 'doctor-suitability';

@Component({
  selector: 'app-doctor-suitability',
  standalone: true,
  imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent, SharedFeedbackComponent],
  templateUrl: './doctor-suitability.component.html',
  styleUrl: './doctor-suitability.component.scss'
})
export class DoctorSuitabilityComponent implements OnInit {
  private activityService = inject(ActivityService);
  private feedbackService = inject(FeedbackService);
  private gameStateService = inject(GameStateService);
  private hintService = inject(HintService);

  isCompleted = false;
  checkAlwaysDisabled = false;
  selectedId: number | null = null;

  options: ProfessionOption[] = [
    { id: 1, emoji: '📚', isCorrect: false },
    { id: 2, emoji: '🧰', isCorrect: false },
    { id: 3, emoji: '🎤', isCorrect: false },
    { id: 4, emoji: '🩺', isCorrect: true  },
    { id: 5, emoji: '⚽', isCorrect: false },
  ];

  ngOnInit(): void {
    const saved = this.gameStateService.getData<any>(ID);
    if (saved) {
      this.selectedId = saved.selectedId;
      this.isCompleted = saved.isCompleted;
    }
  }

  selectOption(id: number): void {
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
    this.selectedId = null;
    this.isCompleted = false;
    this.options.forEach(o => o.isShaking = false);
    this.gameStateService.clear(ID);
  }

  onCheck(): void {
    if (this.selectedId === null) {
      this.feedbackService.showWrong();
      return;
    }

    const selected = this.options.find(o => o.id === this.selectedId);
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
