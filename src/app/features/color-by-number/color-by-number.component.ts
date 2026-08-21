import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActivityService } from '../../core/services/activity.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';

export interface PaletteColor {
  id: number;
  color: string;
}

export interface PaintCell {
  id: string; // e.g. "g1-0" for grid 1 cell 0
  targetColorId: number;
  userColorId: number | null;
}

export interface ColorByNumberState {
  cells: { id: string; userColorId: number | null }[];
  feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'color-by-number';

@Component({
  selector: 'app-color-by-number',
  standalone: true,
  imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent, SharedFeedbackComponent],
  templateUrl: './color-by-number.component.html',
  styleUrl: './color-by-number.component.scss'
})
export class ColorByNumberComponent implements OnInit {
  
  palette: PaletteColor[] = [
    { id: 1, color: '#e53935' }, // Red
    { id: 2, color: '#8bc34a' }, // Light Green
    { id: 3, color: '#03a9f4' }, // Light Blue
    { id: 4, color: '#ffeb3b' }, // Yellow
    { id: 5, color: '#f48fb1' }  // Pink
  ];

  selectedColorId: number | null = null;

  grid1: PaintCell[] = [
    { id: 'g1-0', targetColorId: 2, userColorId: null },
    { id: 'g1-1', targetColorId: 1, userColorId: null },
    { id: 'g1-2', targetColorId: 3, userColorId: null },
    { id: 'g1-3', targetColorId: 4, userColorId: null }
  ];

  grid2: PaintCell[] = [
    { id: 'g2-0', targetColorId: 5, userColorId: null },
    { id: 'g2-1', targetColorId: 1, userColorId: null },
    { id: 'g2-2', targetColorId: 2, userColorId: null },
    { id: 'g2-3', targetColorId: 3, userColorId: null }
  ];

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
    const saved = this.gs.getData<ColorByNumberState>(ID);
    if (saved) {
      saved.cells.forEach(sc => {
        const cell1 = this.grid1.find(c => c.id === sc.id);
        if (cell1) cell1.userColorId = sc.userColorId;
        const cell2 = this.grid2.find(c => c.id === sc.id);
        if (cell2) cell2.userColorId = sc.userColorId;
      });
      this.feedbackState = saved.feedbackState;
    }
  }

  private persist(): void {
    const allCells = [...this.grid1, ...this.grid2].map(c => ({ id: c.id, userColorId: c.userColorId }));
    this.gs.save(ID, {
      cells: allCells,
      feedbackState: this.feedbackState
    });
  }

  selectColor(id: number): void {
    if (this.gs.isCompleted(ID) && this.feedbackState === 'correct') return;
    this.selectedColorId = id;
  }

  paintCell(cell: PaintCell): void {
    if (this.gs.isCompleted(ID) && this.feedbackState === 'correct') return;
    if (this.selectedColorId !== null) {
      cell.userColorId = this.selectedColorId;
      this.feedbackState = null;
      this.persist();
    }
  }

  getColorHex(colorId: number | null): string {
    if (colorId === null) return 'transparent';
    return this.palette.find(p => p.id === colorId)?.color || 'transparent';
  }

  onReset(): void {
    this.selectedColorId = null;
    this.grid1.forEach(c => c.userColorId = null);
    this.grid2.forEach(c => c.userColorId = null);
    this.feedbackState = null;
    this.gs.clear(ID);
    this.hintService.resetErrors(ID);
    this.persist();
  }

  onCheck(): void {
    const allCells = [...this.grid1, ...this.grid2];
    const isFullyPainted = allCells.every(c => c.userColorId !== null);

    if (!isFullyPainted) {
      this.fb.showFeedback('error', 'Lütfen tüm kutuları boyayın!');
      return;
    }

    const isCorrect = allCells.every(c => c.userColorId === c.targetColorId);

    if (isCorrect) {
      this.feedbackState = 'correct';
      this.selectedColorId = null;
      this.gs.markCompleted(ID);
      this.hintService.resetErrors(ID);
      this.fb.showFeedback('success', 'Harika! Sayılara göre tüm kutuları doğru boyadın!');
    } else {
      this.feedbackState = 'wrong';
      this.hintService.registerError(ID);
      this.fb.showFeedback('error', 'Bazı kutuların renkleri yanlış. Sayılarla renkleri tekrar eşleştir.');
    }
    this.persist();
  }

  isHintPulse(cell: PaintCell): boolean {
    if (!this.showHints) return false;
    return cell.userColorId !== null && cell.userColorId !== cell.targetColorId;
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
