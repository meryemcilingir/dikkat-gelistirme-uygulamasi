import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActivityService } from '../../core/services/activity.service';
import { ReviewModeService } from '../../core/services/review-mode.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface ExercisePair {
  id: number;
  targetGrid: boolean[][];
  userGrid: boolean[][];
  isShaking: boolean;
}

interface PinkGridState {
  exercises: ExercisePair[];
  isCompleted: boolean;
}

const ID = 'pink-grid';

@Component({
  selector: 'app-pink-grid',
  standalone: true,
  imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
  templateUrl: './pink-grid.component.html',
  styleUrl: './pink-grid.component.scss'
})
export class PinkGridComponent implements OnInit {

  exercises: ExercisePair[] = [];
  isChecking = false;

  readonly rowIndices = [0, 1, 2] as const;
  readonly colIndices = [0, 1, 2] as const;

  private gs = inject(GameStateService);
  private fb = inject(FeedbackService);
  private hintService = inject(HintService);
  private activityService = inject(ActivityService);
  reviewMode = inject(ReviewModeService);

  get showHints(): boolean {
    return this.hintService.shouldShowHint(ID);
  }

  get isNextUnlocked(): boolean {
    return this.gs.isCompleted(ID);
  }

  ngOnInit(): void {
    const saved = this.gs.getData<PinkGridState>(ID);
    if (saved && saved.exercises && saved.exercises.length > 0) {
      this.exercises = saved.exercises;
    } else {
      this.initExercises();
    }
  }

  private initExercises(): void {
    // 1.1 2.1 3.2
    const target1 = [
      [true, false, false],
      [true, false, false],
      [false, true, false]
    ];

    // 1.1 2.2 1.3
    const target2 = [
      [true, false, true],
      [false, true, false],
      [false, false, false]
    ];

    this.exercises = [
      { id: 1, targetGrid: target1, userGrid: this.createEmptyGrid(), isShaking: false },
      { id: 2, targetGrid: target2, userGrid: this.createEmptyGrid(), isShaking: false }
    ];
  }

  private createEmptyGrid(): boolean[][] {
    return Array.from({ length: 3 }, () => Array(3).fill(false));
  }

  persist(): void {
    this.gs.save(ID, {
      exercises: this.exercises,
      isCompleted: this.isNextUnlocked
    });
  }

  toggleCell(exIndex: number, row: number, col: number): void {
    if (this.isChecking || this.isNextUnlocked) return;

    this.exercises[exIndex].userGrid[row][col] = !this.exercises[exIndex].userGrid[row][col];
    this.persist();
  }

  checkAnswer(): void {
    if (!this.exercises.some(e => e.userGrid.some(row => row.some(cell => cell)))) {
      this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
      return;
    }
    const hasEmptyExercise = this.exercises.some(e => !e.userGrid.some(row => row.some(cell => cell)));
    if (hasEmptyExercise) {
      this.fb.showFeedback('error', 'Lütfen her iki şekilde de en az bir kare boyayın!');
      return;
    }

    let allCorrect = true;

    for (const ex of this.exercises) {
      let isExCorrect = true;
      for (const r of this.rowIndices) {
        for (const c of this.colIndices) {
          if (ex.targetGrid[r][c] !== ex.userGrid[r][c]) {
            isExCorrect = false;
            allCorrect = false;
            break;
          }
        }
      }

      if (!isExCorrect) {
        this.isChecking = true;
        ex.isShaking = true;
        setTimeout(() => {
          ex.isShaking = false;
          this.isChecking = false;
        }, 500);
      }
    }

    if (allCorrect) {
      this.gs.markCompleted(ID);
      this.hintService.resetErrors(ID);
      this.fb.showFeedback('success', 'Harika! Üstteki şeklin aynısını elde ettin.');
      this.persist();
    } else {
      this.hintService.registerError(ID);
      this.fb.showFeedback('error', 'Bazı kareler yanlış boyanmış. İpucunu inceleyip tekrar dene!');
    }
  }

  clearSelection(): void {
    this.exercises.forEach(ex => {
      ex.userGrid = this.createEmptyGrid();
      ex.isShaking = false;
    });
    this.gs.clear(ID);
    this.hintService.resetErrors(ID);
  }

  // Hint logic: User filled but target is empty
  isHintRemove(ex: ExercisePair, r: number, c: number): boolean {
    if (!this.showHints) return false;
    return ex.userGrid[r][c] && !ex.targetGrid[r][c];
  }

  // Hint logic: Target has it, but user missed it
  isHintAdd(ex: ExercisePair, r: number, c: number): boolean {
    if (!this.showHints) return false;
    return !ex.userGrid[r][c] && ex.targetGrid[r][c];
  }

  // Generic cell logic to simply add yellow global `.hint` border for wrong cells
  isCellWrong(ex: ExercisePair, r: number, c: number): boolean {
    if (!this.showHints) return false;
    return ex.userGrid[r][c] !== ex.targetGrid[r][c];
  }

  goPrev(): void {
    this.activityService.prev();
  }

  goNext(): void {
    if (!this.isNextUnlocked) return;
    this.activityService.next();
  }
}
