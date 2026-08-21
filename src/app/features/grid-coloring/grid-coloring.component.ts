import { Component, OnInit, inject } from '@angular/core';
import { ReviewModeService } from '../../core/services/review-mode.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface ExercisePair {
  id: number;
  targetGrid: boolean[][];
  userGrid: boolean[][];
  isShaking: boolean;
}

interface GridColoringState {
  exercises: ExercisePair[];
  isCompleted: boolean;
}

const ID = 'grid-coloring';

@Component({
  selector: 'app-grid-coloring',
  standalone: true,
  imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
  templateUrl: './grid-coloring.component.html',
  styleUrl: './grid-coloring.component.scss'
})
export class GridColoringComponent implements OnInit {
  reviewMode = inject(ReviewModeService);

  exercises: ExercisePair[] = [];
  isChecking = false;

  readonly rowIndices = [0, 1, 2] as const;
  readonly colIndices = [0, 1, 2] as const;

  constructor(
    private router: Router,
    private gs: GameStateService,
    private fb: FeedbackService,
    private hintService: HintService
  ) { }

  get showHints(): boolean {
    return this.hintService.shouldShowHint(ID);
  }

  get isNextUnlocked(): boolean {
    return this.gs.isCompleted(ID);
  }

  ngOnInit(): void {
    const saved = this.gs.getData<GridColoringState>(ID);
    if (saved && saved.exercises && saved.exercises.length > 0) {
      this.exercises = saved.exercises;
    } else {
      this.initExercises();
    }
  }

  private initExercises(): void {
    const target1 = [
      [true, false, false],
      [false, true, false],
      [true, false, false]
    ];

    const target2 = [
      [false, false, false],
      [false, true, false],
      [true, false, true]
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
      this.fb.showFeedback('error', 'Bazı kareler yalnış boyanmış. İpucunu inceleyip tekrar dene!');
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
    this.router.navigate(['/match-size']);
  }

  goNext(): void {
    if (!this.isNextUnlocked) return;
    this.router.navigate(['/find-same-symbols']);
  }
}
