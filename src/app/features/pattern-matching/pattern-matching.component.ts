import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ReviewModeService } from '../../core/services/review-mode.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

// ─────────────────────────────────────────────────────────
const PUZZLE_PAGES: boolean[][][] = [
  [
    [true, false, false, false, false, false],
    [false, true, false, false, false, false],
    [true, false, false, false, true, false],
    [false, false, true, true, false, true],
    [false, false, false, false, false, true],
    [false, false, false, false, false, false],
  ],
];

interface PatternState {
  userGrid: boolean[][];
  feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'pattern';

@Component({
  selector: 'app-pattern-matching',
  standalone: true,
  imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
  templateUrl: './pattern-matching.component.html',
  styleUrl: './pattern-matching.component.scss',
})
export class PatternMatchingComponent implements OnInit {
  reviewMode = inject(ReviewModeService);

  constructor(
    private router: Router,
    private gs: GameStateService,
    private fb: FeedbackService,
    private hintService: HintService
  ) { }

  readonly currentPage = signal(0);
  readonly totalPages = PUZZLE_PAGES.length;
  readonly targetGrid = computed(() => PUZZLE_PAGES[this.currentPage()]);

  userGrid: boolean[][] = this.createEmptyGrid();
  feedbackState: 'correct' | 'wrong' | null = null;

  get showHints(): boolean {
    return this.hintService.shouldShowHint(ID);
  }

  get isNextUnlocked(): boolean {
    return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
  }

  readonly isPrevEnabled = false;

  // ── Lifecycle ─────────────────────────────────────────
  ngOnInit(): void {
    const saved = this.gs.getData<PatternState>(ID);
    if (saved) {
      this.userGrid = saved.userGrid.map(row => [...row]);
      this.feedbackState = saved.feedbackState;
    }
  }

  // ── Yardımcı ──────────────────────────────────────────
  private createEmptyGrid(): boolean[][] {
    return Array.from({ length: 6 }, () => Array(6).fill(false));
  }

  private persist(): void {
    this.gs.save(ID, {
      userGrid: this.userGrid,
      feedbackState: this.feedbackState
    });
  }

  // ── Etkileşim ─────────────────────────────────────────
  /** Hücreyi açar/kapar; oyun kilitliyse işlem yapmaz */
  toggleCell(row: number, col: number): void {
    if (this.gs.isCompleted(ID) && this.feedbackState === 'correct') return; // kilitli
    this.userGrid[row][col] = !this.userGrid[row][col];
    this.feedbackState = null;
    this.persist();
  }

  /** Izgarı ve ilerlemeyi sıfırlar */
  clearGrid(): void {
    this.userGrid = this.createEmptyGrid();
    this.feedbackState = null;
    this.gs.clear(ID);       // servisten de sil
    this.hintService.resetErrors(ID);
  }

  /** Deseni hedefle karşılaştırır; 2 hatadan sonra ipucu gösterir */
  checkPattern(): void {
    if (!this.userGrid.some(row => row.some(cell => cell))) {
      this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
      return;
    }

    const target = this.targetGrid();

    const isCorrect = target.every((row, r) =>
      row.every((cell, c) => cell === this.userGrid[r][c])
    );
    this.feedbackState = isCorrect ? 'correct' : 'wrong';
    if (isCorrect) {
      this.gs.markCompleted(ID);
      this.hintService.resetErrors(ID);
      this.fb.showFeedback('success', 'Tebrikler! Deseni mükemmel kopyaladın!');
    } else {
      this.hintService.registerError(ID);
      this.fb.showFeedback('error', 'Tekrar Denemelisin');
    }
    this.persist();
  }

  isHintRemove(r: number, c: number): boolean {
    if (!this.showHints) return false;
    return this.userGrid[r][c] && !this.targetGrid()[r][c]; // Fazladan boyanmış
  }

  isHintAdd(r: number, c: number): boolean {
    if (!this.showHints) return false;
    return !this.userGrid[r][c] && this.targetGrid()[r][c]; // Eksik boyanmış
  }

  // ── Navigasyon ────────────────────────────────────────
  goPrev(): void { /* İlk etkinlik – önceki sayfa yok */ }

  goNext(): void {
    if (!this.isNextUnlocked) return;
    const next = this.currentPage() + 1;
    if (next >= this.totalPages) {
      this.router.navigate(['/odd-direction']);
    } else {
      this.currentPage.set(next);
      this.resetSession();
    }
  }

  private resetSession(): void {
    this.userGrid = this.createEmptyGrid();
    this.feedbackState = null;
    this.hintService.resetErrors(ID);
  }

  readonly rowIndices = [0, 1, 2, 3, 4, 5] as const;
  readonly colIndices = [0, 1, 2, 3, 4, 5] as const;
}
