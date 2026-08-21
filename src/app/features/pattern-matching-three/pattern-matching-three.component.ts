import { Component, OnInit, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityService } from '../../core/services/activity.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { GameStateService } from '../../core/services/game-state.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';

const PUZZLE_PAGES: boolean[][][] = [
  [
    [false, false, false, false, false, false],
    [false, true,  false, false, true,  false], // (2,2) ve (2,5) -> indexed: [1][1], [1][4]
    [false, false, true,  true,  false, false], // (3,3) ve (3,4) -> indexed: [2][2], [2][3]
    [false, false, false, false, false, false],
    [false, false, false, false, true,  false], // (5,5) -> indexed: [4][4]
    [false, false, false, false, false, false],
  ],
];

interface PatternState {
  userGrid: boolean[][];
  feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'pattern-3';

@Component({
  selector: 'app-pattern-matching-three',
  standalone: true,
  imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent, SharedFeedbackComponent],
  templateUrl: './pattern-matching-three.component.html',
  styleUrl: './pattern-matching-three.component.scss',
})
export class PatternMatchingThreeComponent implements OnInit {
  private activityService = inject(ActivityService);
  private feedbackService = inject(FeedbackService);
  private hintService = inject(HintService);
  private gameStateService = inject(GameStateService);

  readonly currentPage = signal(0);
  readonly totalPages = PUZZLE_PAGES.length;
  readonly targetGrid = computed(() => PUZZLE_PAGES[this.currentPage()]);

  userGrid: boolean[][] = this.createEmptyGrid();
  feedbackState: 'correct' | 'wrong' | null = null;
  isCompleted = false;
  checkAlwaysDisabled = false;

  get showHints(): boolean {
    return this.hintService.shouldShowHint(ID);
  }

  // ── Lifecycle ─────────────────────────────────────────
  ngOnInit(): void {
    const saved = this.gameStateService.getData<PatternState>(ID);
    if (saved) {
      this.userGrid = saved.userGrid.map(row => [...row]);
      this.feedbackState = saved.feedbackState;
      this.isCompleted = this.feedbackState === 'correct';
    }
  }

  // ── Yardımcı ──────────────────────────────────────────
  private createEmptyGrid(): boolean[][] {
    return Array.from({ length: 6 }, () => Array(6).fill(false));
  }

  private persist(): void {
    this.gameStateService.save(ID, {
      userGrid: this.userGrid,
      feedbackState: this.feedbackState
    });
  }

  // ── Etkileşim ─────────────────────────────────────────
  toggleCell(row: number, col: number): void {
    if (this.isCompleted) return;
    this.userGrid[row][col] = !this.userGrid[row][col];
    this.feedbackState = null;
    this.persist();
  }

  onReset(): void {
    this.userGrid = this.createEmptyGrid();
    this.feedbackState = null;
    this.isCompleted = false;
    this.gameStateService.clear(ID);
    this.hintService.resetErrors(ID);
  }

  onCheck(): void {
    if (!this.userGrid.some(row => row.some(cell => cell))) {
      this.feedbackService.showWrong();
      return;
    }

    const target = this.targetGrid();

    const isCorrect = target.every((row, r) =>
      row.every((cell, c) => cell === this.userGrid[r][c])
    );

    this.feedbackState = isCorrect ? 'correct' : 'wrong';
    if (isCorrect) {
      this.isCompleted = true;
      this.gameStateService.markCompleted(ID);
      this.hintService.resetErrors(ID);
      this.feedbackService.showCorrect();
    } else {
      this.hintService.registerError(ID);
      this.feedbackService.showWrong();
    }
    this.persist();
  }

  isHintRemove(r: number, c: number): boolean {
    if (!this.showHints) return false;
    return this.userGrid[r][c] && !this.targetGrid()[r][c];
  }

  isHintAdd(r: number, c: number): boolean {
    if (!this.showHints) return false;
    return !this.userGrid[r][c] && this.targetGrid()[r][c];
  }

  prev(): void { this.activityService.prev(); }
  next(): void { this.activityService.next(); }

  readonly rowIndices = [0, 1, 2, 3, 4, 5] as const;
  readonly colIndices = [0, 1, 2, 3, 4, 5] as const;
}
