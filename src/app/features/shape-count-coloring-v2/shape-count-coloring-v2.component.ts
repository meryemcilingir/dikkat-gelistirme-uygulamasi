import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActivityService } from '../../core/services/activity.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';

export interface ShapeRowV2 {
  id: number;
  targetCount: number;
  totalShapes: number;
  selectedCount: number;
  selectedMap: boolean[];
}

export interface ShapeCountColoringV2State {
  rows: { id: number; selectedMap: boolean[] }[];
  feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'shape-count-coloring-v2';

@Component({
  selector: 'app-shape-count-coloring-v2',
  standalone: true,
  imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent, SharedFeedbackComponent],
  templateUrl: './shape-count-coloring-v2.component.html',
  styleUrl: './shape-count-coloring-v2.component.scss'
})
export class ShapeCountColoringV2Component implements OnInit {

  rows: ShapeRowV2[] = [
    { id: 1, targetCount: 3, totalShapes: 10, selectedCount: 0, selectedMap: Array(10).fill(false) },
    { id: 2, targetCount: 2, totalShapes: 10, selectedCount: 0, selectedMap: Array(10).fill(false) },
    { id: 3, targetCount: 8, totalShapes: 10, selectedCount: 0, selectedMap: Array(10).fill(false) },
  ];

  feedbackState: 'correct' | 'wrong' | null = null;
  checkAlwaysDisabled = false;

  private gs = inject(GameStateService);
  private fb = inject(FeedbackService);
  private hintService = inject(HintService);
  private activityService = inject(ActivityService);

  get showHint(): boolean {
    return this.hintService.shouldShowHint(ID);
  }

  get isNextUnlocked(): boolean {
    return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
  }

  ngOnInit(): void {
    const saved = this.gs.getData<ShapeCountColoringV2State>(ID);
    if (saved) {
      saved.rows.forEach(sr => {
        const row = this.rows.find(r => r.id === sr.id);
        if (row) {
          row.selectedMap = [...sr.selectedMap];
          row.selectedCount = sr.selectedMap.filter(Boolean).length;
        }
      });
      this.feedbackState = saved.feedbackState;
    }
  }

  private persist(): void {
    this.gs.save(ID, {
      rows: this.rows.map(r => ({ id: r.id, selectedMap: [...r.selectedMap] })),
      feedbackState: this.feedbackState
    });
  }

  toggleShape(rowIdx: number, shapeIdx: number): void {
    if (this.feedbackState === 'correct') return;
    const row = this.rows[rowIdx];
    row.selectedMap[shapeIdx] = !row.selectedMap[shapeIdx];
    row.selectedCount = row.selectedMap.filter(Boolean).length;
    this.feedbackState = null;
    this.persist();
  }

  onReset(): void {
    this.rows.forEach(r => {
      r.selectedMap = Array(r.totalShapes).fill(false);
      r.selectedCount = 0;
    });
    this.feedbackState = null;
    this.gs.clear(ID);
    this.hintService.resetErrors(ID);
  }

  onCheck(): void {
    const allAttempted = this.rows.every(r => r.selectedCount > 0);
    if (!allAttempted) {
      this.fb.showFeedback('error', 'Lütfen her satırda hedef sayı kadar şekli boyayın!');
      return;
    }

    const allCorrect = this.rows.every(r => r.selectedCount === r.targetCount);

    if (allCorrect) {
      this.feedbackState = 'correct';
      this.gs.markCompleted(ID);
      this.hintService.resetErrors(ID);
      this.fb.showFeedback('success', 'Tebrikler! Her sayı kadar şekli doğru boyadın! 🎨');
    } else {
      this.feedbackState = 'wrong';
      this.hintService.registerError(ID);
      const wrongRow = this.rows.find(r => r.selectedCount !== r.targetCount);
      if (wrongRow) {
        this.fb.showFeedback('error', `${wrongRow.targetCount} tane boyaman gerekiyor ama ${wrongRow.selectedCount} tane boyadın. Tekrar dene!`);
      }
    }
    this.persist();
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
