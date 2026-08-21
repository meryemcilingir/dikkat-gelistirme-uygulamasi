import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface SymbolOption {
  id: number;
  letter: string;
  cssClass: string; // for rotation/scaling
  isCorrect: boolean;
  isShaking?: boolean;
}

interface FindSameSymbolsState {
  selectedIds: number[];
  isCompleted: boolean;
}

const ID = 'find-same-symbols';

@Component({
  selector: 'app-find-same-symbols',
  standalone: true,
  imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
  templateUrl: './find-same-symbols.component.html',
  styleUrl: './find-same-symbols.component.scss'
})
export class FindSameSymbolsComponent implements OnInit {

  options: SymbolOption[] = [
    { id: 1, letter: 'B', cssClass: 'normal', isCorrect: true },
    { id: 2, letter: 'B', cssClass: 'rotate-90', isCorrect: false },
    { id: 3, letter: 'D', cssClass: 'normal', isCorrect: false },
    { id: 4, letter: 'B', cssClass: 'flip-x', isCorrect: false },
    { id: 5, letter: 'D', cssClass: 'flip-x', isCorrect: false },
    { id: 6, letter: 'B', cssClass: 'rotate-180', isCorrect: false },
    { id: 7, letter: 'B', cssClass: 'normal', isCorrect: true },
    { id: 8, letter: 'D', cssClass: 'rotate-90', isCorrect: false }
  ];

  selectedIds: number[] = [];
  isChecking = false;

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
    const saved = this.gs.getData<FindSameSymbolsState>(ID);
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

    // If it's already selected, unselect it
    if (index > -1) {
      this.selectedIds.splice(index, 1);
      this.persist();
      return;
    }

    // It is not selected, try to select
    // Strict 2-item limit
    if (this.selectedIds.length >= 2) {
      this.fb.showFeedback('error', 'En fazla 2 şekil seçebilirsin!');
      return;
    }

    // Safe to select
    this.selectedIds.push(id);
    this.persist();
  }

  checkAnswer(): void {
    if (this.selectedIds.length === 0) {
      this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
      return;
    }

    if (this.selectedIds.length < 2) {
      this.fb.showFeedback('error', 'Eksik seçim yaptın, 2 tane B bulmalısın!');
      return;
    }

    const selectedOptions = this.options.filter(opt => this.selectedIds.includes(opt.id));

    // Check if ALL selected are CORRECT
    const allCorrect = selectedOptions.every(opt => opt.isCorrect);

    if (allCorrect) {
      this.gs.markCompleted(ID);
      this.hintService.resetErrors(ID);
      this.fb.showFeedback('success', 'Harika! Doğru B harflerini buldun.');
      this.persist();
    } else {
      this.isChecking = true;
      this.hintService.registerError(ID);

      // We need to shake only the WRONG selected options
      const wrongSelected = selectedOptions.filter(opt => !opt.isCorrect);

      wrongSelected.forEach(opt => opt.isShaking = true);
      this.fb.showFeedback('error', 'Bazı seçimlerin hatalı, tekrar dene!');

      setTimeout(() => {
        // Stop shaking and AUTO DESELECT only the wrong ones
        wrongSelected.forEach(opt => {
          opt.isShaking = false;
          // remove from selectedIds array
          this.selectedIds = this.selectedIds.filter(id => id !== opt.id);
        });

        this.isChecking = false;
        this.persist(); // save the deselected state
      }, 500);
    }
  }

  clearSelection(): void {
    this.selectedIds = [];
    this.options.forEach(opt => opt.isShaking = false);
    this.gs.clear(ID);
    this.hintService.resetErrors(ID);
  }

  isHint(opt: SymbolOption): boolean {
    if (!this.showHints) return false;
    // Highlight correct items that are NOT currently selected
    return opt.isCorrect && !this.selectedIds.includes(opt.id);
  }

  goPrev(): void {
    this.router.navigate(['/grid-coloring']);
  }

  goNext(): void {
    if (!this.isNextUnlocked) return;
    this.router.navigate(['/find-numbers']);
  }
}
