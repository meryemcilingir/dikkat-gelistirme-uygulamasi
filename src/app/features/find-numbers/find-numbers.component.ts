import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface NumberCell {
  id: number;
  value: number;
  isShaking?: boolean;
}

interface FindNumbersState {
  selectedIds: number[];
  isCompleted: boolean;
}

const ID = 'find-numbers';

@Component({
  selector: 'app-find-numbers',
  standalone: true,
  imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
  templateUrl: './find-numbers.component.html',
  styleUrl: './find-numbers.component.scss'
})
export class FindNumbersComponent implements OnInit {

  grid: NumberCell[] = [];
  selectedIds: number[] = [];
  isChecking = false;

  private totalNines = 8;
  private gridSize = 42; // 6x7 grid

  constructor(
    private router: Router,
    private gs: GameStateService,
    private fb: FeedbackService,
    private hintService: HintService
  ) {
    this.generateGrid();
  }

  get showHints(): boolean {
    return this.hintService.shouldShowHint(ID);
  }

  get isNextUnlocked(): boolean {
    return this.gs.isCompleted(ID);
  }

  private generateGrid(): void {
    const fixedGrid = [
      5, 1, 7, 6, 0, 9, 8,
      2, 3, 4, 9, 0, 3, 2,
      1, 9, 5, 6, 8, 7, 9,
      2, 0, 7, 9, 0, 2, 3,
      6, 9, 6, 8, 4, 9, 5,
      3, 4, 7, 5, 6, 9, 4
    ];

    this.grid = fixedGrid.map((val, index) => ({
      id: index,
      value: val,
      isShaking: false
    }));
  }

  ngOnInit(): void {
    const saved = this.gs.getData<FindNumbersState>(ID);
    if (saved && saved.selectedIds) {
      this.selectedIds = [...saved.selectedIds];
    }
  }

  persist(): void {
    this.gs.save(ID, {
      selectedIds: this.selectedIds,
      isCompleted: this.isNextUnlocked
    });
  }

  isSelected(id: number): boolean {
    return this.selectedIds.includes(id);
  }

  toggleSelection(id: number): void {
    if (this.isChecking || this.isNextUnlocked) return;

    const index = this.selectedIds.indexOf(id);

    // Toggle on/off freely
    if (index > -1) {
      this.selectedIds.splice(index, 1);
    } else {
      if (this.selectedIds.length >= this.totalNines) {
        this.fb.showFeedback('error', `En fazla ${this.totalNines} rakam seçebilirsin!`);
        return;
      }
      this.selectedIds.push(id);
    }

    this.persist();
  }

  checkAnswer(): void {
    if (this.selectedIds.length === 0) {
      this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
      return;
    }

    if (this.selectedIds.length === 0) {
      this.hintService.registerError(ID);
      this.fb.showFeedback('error', 'Lütfen bulduğunuz 9 rakamlarını seçin.');
      return;
    }

    const selectedCells = this.grid.filter(cell => this.selectedIds.includes(cell.id));

    // Identify mistakes (cells that are NOT 9)
    const mistakes = selectedCells.filter(cell => cell.value !== 9);

    // Count how many correct 9s are selected
    const correctCount = selectedCells.length - mistakes.length;

    if (mistakes.length > 0) {
      // User selected something other than 9
      this.isChecking = true;
      this.hintService.registerError(ID);

      // Shake the wrong selections
      mistakes.forEach(cell => cell.isShaking = true);
      this.fb.showFeedback('error', 'Bazı seçimlerin hatalı, sadece 9\'ları boyamalısın!');

      setTimeout(() => {
        // Stop shaking and AUTO DESELECT only the wrong ones
        mistakes.forEach(cell => {
          cell.isShaking = false;
          this.selectedIds = this.selectedIds.filter(id => id !== cell.id);
        });

        this.isChecking = false;
        this.persist();
      }, 500);

    } else if (correctCount < this.totalNines) {
      // User only selected 9s, but missed some
      this.hintService.registerError(ID);
      this.fb.showFeedback('error', `Eksik seçim yaptın, tüm 9'ları bulmalısın! (Bulunan: ${correctCount}/${this.totalNines})`);
    } else {
      // User found all 8 '9's and nothing else
      this.gs.markCompleted(ID);
      this.hintService.resetErrors(ID);
      this.fb.showFeedback('success', 'Harika! Bütün 9 rakamlarını buldun.');
      this.persist();
    }
  }

  clearSelection(): void {
    this.selectedIds = [];
    this.grid.forEach(cell => cell.isShaking = false);
    this.gs.clear(ID);
    this.hintService.resetErrors(ID);
  }

  isHint(cell: NumberCell): boolean {
    if (!this.showHints) return false;
    // Highlight correct items (value === 9) that are NOT currently selected
    return cell.value === 9 && !this.selectedIds.includes(cell.id);
  }

  goPrev(): void {
    this.router.navigate(['/find-same-symbols']);
  }

  goNext(): void {
    if (!this.isNextUnlocked) return;
    this.router.navigate(['/find-reversed-e']);
  }
}
