import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface LetterCell {
  id: number;
  isReversed: boolean;
  color: string;
  isShaking?: boolean;
}

interface FindReversedState {
  selectedIds: number[];
}

const ID = 'find-reversed-e';

@Component({
  selector: 'app-find-reversed-e',
  standalone: true,
  imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
  templateUrl: './find-reversed-e.component.html',
  styleUrl: './find-reversed-e.component.scss'
})
export class FindReversedEComponent implements OnInit {

  grid: LetterCell[] = [];
  selectedIds: number[] = [];
  isChecking = false;

  private totalReversed = 12;
  private totalCells = 60; // 6 rows, 10 columns
  private rowColors = [
    '#e74c3c', // Row 1 Red
    '#8e44ad', // Row 2 Purple
    '#16a085', // Row 3 Teal
    '#f39c12', // Row 4 Orange
    '#2c3e50', // Row 5 Black/Dark Blue
    '#27ae60'  // Row 6 Green
  ];

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
    this.grid = Array.from({ length: this.totalCells }).map((_, i) => {
      const rowIndex = Math.floor(i / 10);
      return {
        id: i,
        isReversed: false,
        color: this.rowColors[rowIndex],
        isShaking: false
      };
    });

    // Randomly place exactly 12 reversed 'e's
    let placed = 0;
    while (placed < this.totalReversed) {
      const randIdx = Math.floor(Math.random() * this.totalCells);
      if (!this.grid[randIdx].isReversed) {
        this.grid[randIdx].isReversed = true;
        placed++;
      }
    }
  }

  ngOnInit(): void {
    const saved = this.gs.getData<FindReversedState>(ID);
    if (saved && saved.selectedIds) {
      this.selectedIds = [...saved.selectedIds];
    }
  }

  persist(): void {
    this.gs.save(ID, {
      selectedIds: this.selectedIds
    });
  }

  isSelected(id: number): boolean {
    return this.selectedIds.includes(id);
  }

  toggleSelection(id: number): void {
    if (this.isChecking || this.isNextUnlocked) return;

    const index = this.selectedIds.indexOf(id);

    if (index > -1) {
      this.selectedIds.splice(index, 1);
    } else {
      if (this.selectedIds.length >= this.totalReversed) {
        this.fb.showFeedback('error', `En fazla ${this.totalReversed} harf seçebilirsin!`);
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
      this.fb.showFeedback('error', 'Lütfen bulduğunuz ters "e" harflerini seçin.');
      return;
    }

    const selectedCells = this.grid.filter(cell => this.selectedIds.includes(cell.id));
    const mistakes = selectedCells.filter(cell => !cell.isReversed);
    const correctCount = selectedCells.length - mistakes.length;

    if (mistakes.length > 0) {
      this.isChecking = true;
      this.hintService.registerError(ID);

      // Shake the wrong selections
      mistakes.forEach(cell => cell.isShaking = true);
      this.fb.showFeedback('error', 'Bazı seçimlerin hatalı, sadece ters olanları işaretlemelisin!');

      setTimeout(() => {
        // Stop shaking and AUTO DESELECT only the wrong ones
        mistakes.forEach(cell => {
          cell.isShaking = false;
          this.selectedIds = this.selectedIds.filter(id => id !== cell.id);
        });

        this.isChecking = false;
        this.persist();
      }, 500);

    } else if (correctCount < this.totalReversed) {
      this.hintService.registerError(ID);
      this.fb.showFeedback('error', `Eksik seçim yaptın, tüm ters 'e' harflerini bulmalısın! (Bulunan: ${correctCount}/${this.totalReversed})`);
    } else {
      this.gs.markCompleted(ID);
      this.hintService.resetErrors(ID);
      this.fb.showFeedback('success', 'Harika! Bütün ters e harflerini buldun.');
      this.persist();
    }
  }

  clearSelection(): void {
    this.selectedIds = [];
    this.grid.forEach(cell => cell.isShaking = false);
    this.gs.clear(ID);
    this.hintService.resetErrors(ID);
  }

  isHint(cell: LetterCell): boolean {
    if (!this.showHints) return false;
    return cell.isReversed && !this.selectedIds.includes(cell.id);
  }

  goPrev(): void {
    this.router.navigate(['/find-numbers']);
  }

  goNext(): void {
    if (!this.isNextUnlocked) return;
    this.router.navigate(['/count-and-add']);
  }
}
