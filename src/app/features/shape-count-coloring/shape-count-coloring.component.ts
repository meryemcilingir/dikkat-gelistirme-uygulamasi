import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';

export interface ShapeRow {
  id: number;
  targetCount: number;
  emoji: string;
  filledEmoji: string;
  totalShapes: number;
  selectedCount: number;
  selectedMap: boolean[];
}

export interface ShapeCountColoringState {
  rows: { id: number; selectedMap: boolean[] }[];
  feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'shape-count-coloring';

@Component({
  selector: 'app-shape-count-coloring',
  standalone: true,
  imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent, SharedFeedbackComponent],
  templateUrl: './shape-count-coloring.component.html',
  styleUrl: './shape-count-coloring.component.scss'
})
export class ShapeCountColoringComponent implements OnInit {

  rows: ShapeRow[] = [
    { id: 1, targetCount: 6, emoji: '△', filledEmoji: '▲', totalShapes: 10, selectedCount: 0, selectedMap: Array(10).fill(false) },
    { id: 2, targetCount: 5, emoji: '✿', filledEmoji: '🌸', totalShapes: 10, selectedCount: 0, selectedMap: Array(10).fill(false) },
    { id: 3, targetCount: 4, emoji: '⚽',filledEmoji: '⚽', totalShapes: 10, selectedCount: 0, selectedMap: Array(10).fill(false) },
  ];

  feedbackState: 'correct' | 'wrong' | null = null;

  constructor(
    private router: Router,
    private gs: GameStateService,
    private fb: FeedbackService,
    private hintService: HintService
  ) {}

  get showHint(): boolean {
    return this.hintService.shouldShowHint(ID);
  }

  get isNextUnlocked(): boolean {
    return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
  }

  ngOnInit(): void {
    const saved = this.gs.getData<ShapeCountColoringState>(ID);
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

  clearSelection(): void {
    this.rows.forEach(r => {
      r.selectedMap = Array(r.totalShapes).fill(false);
      r.selectedCount = 0;
    });
    this.feedbackState = null;
    this.gs.clear(ID);
    this.hintService.resetErrors(ID);
  }

  checkAnswer(): void {
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

  goPrev(): void {
    this.router.navigate(['/pencil-matching-v2']);
  }

  goNext(): void {
    if (!this.isNextUnlocked) return;
    this.router.navigate(['/sport-matching']);
  }
}
