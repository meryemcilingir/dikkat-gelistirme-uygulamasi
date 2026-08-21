import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityService } from '../../core/services/activity.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { GameStateService } from '../../core/services/game-state.service';
import { HintService } from '../../core/services/hint.service';
import { ReviewModeService } from '../../core/services/review-mode.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';

interface OrangeColoringState {
    orangeColors: { [key: string]: string };
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'orange-coloring';

@Component({
  selector: 'app-orange-coloring',
  standalone: true,
  imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent, SharedFeedbackComponent],
  templateUrl: './orange-coloring.component.html',
  styleUrl: './orange-coloring.component.scss'
})
export class OrangeColoringComponent implements OnInit {
  private activityService = inject(ActivityService);
  private feedbackService = inject(FeedbackService);
  private gameStateService = inject(GameStateService);
  private hintService = inject(HintService);
  reviewMode = inject(ReviewModeService);

  selectedColor: string = '';
  
  orangeColors: { [key: string]: string } = {
    body: '#ffffff',
    leaf: '#ffffff',
    stem: '#ffffff'
  };

  readonly targetColors: { [key: string]: string } = {
    body: '#FF9800', // Orange
    leaf: '#4CAF50', // Green
    stem: '#795548'  // Brown
  };

  palette = [
    { name: 'Turuncu', hex: '#FF9800' },
    { name: 'Yeşil', hex: '#4CAF50' },
    { name: 'Kahverengi', hex: '#795548' }
  ];

  feedbackState: 'correct' | 'wrong' | null = null;

  get isNextUnlocked(): boolean {
    return this.feedbackState === 'correct' || this.gameStateService.isCompleted(ID);
  }

  ngOnInit(): void {
    const saved = this.gameStateService.getData<OrangeColoringState>(ID);
    if (saved) {
      this.orangeColors = { ...saved.orangeColors };
      this.feedbackState = saved.feedbackState;
    }
  }

  private persist(): void {
    this.gameStateService.save(ID, {
      orangeColors: this.orangeColors,
      feedbackState: this.feedbackState
    });
  }

  selectPaletteColor(hex: string): void {
    this.selectedColor = hex;
  }

  paintPart(part: string): void {
    if (this.gameStateService.isCompleted(ID) && this.feedbackState === 'correct') return;
    if (!this.selectedColor) {
      this.feedbackService.showFeedback('error', 'Lütfen önce aşağıdan bir renk seçin!');
      return;
    }

    this.orangeColors[part] = this.selectedColor;
    this.feedbackState = null;
    this.persist();
  }

  onReset(): void {
    Object.keys(this.orangeColors).forEach(k => this.orangeColors[k] = '#ffffff');
    this.feedbackState = null;
    this.selectedColor = '';
    this.gameStateService.clear(ID);
    this.persist();
  }

  onCheck(): void {
    if (Object.keys(this.targetColors).some(key => this.orangeColors[key] === '#ffffff')) {
      this.feedbackService.showFeedback('error', 'Lütfen kontrol etmeden önce tüm bölümleri boyayın!');
      return;
    }

    const isCorrect = Object.keys(this.targetColors).every(
      key => this.orangeColors[key].toLowerCase() === this.targetColors[key].toLowerCase()
    );

    this.feedbackState = isCorrect ? 'correct' : 'wrong';

    if (isCorrect) {
      this.gameStateService.markCompleted(ID);
      this.feedbackService.showCorrect();
    } else {
      this.feedbackService.showWrong();
      this.hintService.registerError(ID);
    }
    this.persist();
  }

  prev(): void { this.activityService.prev(); }
  next(): void { this.activityService.next(); }
}
