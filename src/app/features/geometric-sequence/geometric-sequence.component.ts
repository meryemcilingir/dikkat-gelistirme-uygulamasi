import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActivityService } from '../../core/services/activity.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';

export interface ShapeItem {
  id: string;
  char: string;
  colorClass: string;
}

export interface SequenceOption {
  id: number;
  items: ShapeItem[];
  isCorrect: boolean;
}

export interface GeometricSequenceState {
  selectedOptionId: number | null;
  feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'geometric-sequence';

@Component({
  selector: 'app-geometric-sequence',
  standalone: true,
  imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent, SharedFeedbackComponent],
  templateUrl: './geometric-sequence.component.html',
  styleUrl: './geometric-sequence.component.scss'
})
export class GeometricSequenceComponent implements OnInit {

  // Target Sequence: Triangle, Square, Circle, Plus, Cross, Minus
  targetSequence: ShapeItem[] = [
    { id: 'tri', char: '▲', colorClass: 'orange-color' },
    { id: 'sq', char: '■', colorClass: 'black-color' },
    { id: 'cir', char: '●', colorClass: 'blue-color' },
    { id: 'plus', char: '+', colorClass: 'black-color' },
    { id: 'cross', char: '×', colorClass: 'purple-color' },
    { id: 'minus', char: '-', colorClass: 'green-color' }
  ];

  options: SequenceOption[] = [
    {
      id: 1,
      isCorrect: false,
      items: [
        { id: 'tri', char: '▲', colorClass: 'orange-color' },
        { id: 'sq', char: '■', colorClass: 'black-color' },
        { id: 'cir', char: '●', colorClass: 'blue-color' },
        { id: 'cross', char: '×', colorClass: 'purple-color' },
        { id: 'plus', char: '+', colorClass: 'black-color' },
        { id: 'minus', char: '-', colorClass: 'green-color' }
      ]
    },
    {
      id: 2,
      isCorrect: false,
      items: [
        { id: 'tri', char: '▲', colorClass: 'orange-color' },
        { id: 'sq', char: '■', colorClass: 'black-color' },
        { id: 'cir', char: '●', colorClass: 'blue-color' },
        { id: 'plus', char: '+', colorClass: 'black-color' },
        { id: 'cross', char: '×', colorClass: 'purple-color' },
        { id: 'plus', char: '+', colorClass: 'black-color' }
      ]
    },
    {
      id: 3,
      isCorrect: false,
      items: [
        { id: 'tri', char: '▲', colorClass: 'orange-color' },
        { id: 'cir', char: '●', colorClass: 'blue-color' },
        { id: 'sq', char: '■', colorClass: 'black-color' },
        { id: 'plus', char: '+', colorClass: 'black-color' },
        { id: 'cross', char: '×', colorClass: 'purple-color' },
        { id: 'minus', char: '-', colorClass: 'green-color' }
      ]
    },
    {
      id: 4,
      isCorrect: true,
      items: [
        { id: 'tri', char: '▲', colorClass: 'orange-color' },
        { id: 'sq', char: '■', colorClass: 'black-color' },
        { id: 'cir', char: '●', colorClass: 'blue-color' },
        { id: 'plus', char: '+', colorClass: 'black-color' },
        { id: 'cross', char: '×', colorClass: 'purple-color' },
        { id: 'minus', char: '-', colorClass: 'green-color' }
      ]
    }
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
    const saved = this.gs.getData<GeometricSequenceState>(ID);
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
      this.fb.showFeedback('success', 'Harika! Doğru geometrik sırayı buldun!');
    } else {
      this.feedbackState = 'wrong';
      this.hintService.registerError(ID);
      this.fb.showFeedback('error', 'Yanlış sıra. Şekillerin yerlerine dikkatlice bak!');
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
