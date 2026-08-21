import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface ShadowShape {
  type: 'plus-thick' | 'star' | 'cross' | 'plus-thin' | 'diamond';
}

export interface ShadowOption {
  id: number;
  shapes: ShadowShape[];
  isCorrect: boolean;
  isSelected: boolean;
  isShaking: boolean;
}

interface ShadowMatchingState {
  options: ShadowOption[];
  isCompleted: boolean;
}

const ID = 'shadow-matching';

@Component({
  selector: 'app-shadow-matching',
  standalone: true,
  imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
  templateUrl: './shadow-matching.component.html',
  styleUrl: './shadow-matching.component.scss'
})
export class ShadowMatchingComponent implements OnInit {

  options: ShadowOption[] = [
    { id: 1, shapes: [{ type: 'cross' }, { type: 'star' }], isCorrect: false, isSelected: false, isShaking: false },
    { id: 2, shapes: [{ type: 'diamond' }, { type: 'star' }], isCorrect: false, isSelected: false, isShaking: false },
    { id: 3, shapes: [{ type: 'plus-thick' }, { type: 'star' }], isCorrect: true, isSelected: false, isShaking: false },
    { id: 4, shapes: [{ type: 'plus-thick' }, { type: 'plus-thick' }], isCorrect: false, isSelected: false, isShaking: false }, // Slightly different logic ? 
    { id: 5, shapes: [{ type: 'plus-thin' }, { type: 'star' }], isCorrect: false, isSelected: false, isShaking: false },
    { id: 6, shapes: [{ type: 'plus-thick' }, { type: 'cross' }], isCorrect: false, isSelected: false, isShaking: false }
  ];

  isChecking = false;

  constructor(
    private router: Router,
    private gs: GameStateService,
    private fb: FeedbackService,
    private hintService: HintService
  ) { }

  get showHint(): boolean {
    return this.hintService.shouldShowHint(ID);
  }

  get isNextUnlocked(): boolean {
    return this.gs.isCompleted(ID);
  }

  ngOnInit(): void {
    const saved = this.gs.getData<ShadowMatchingState>(ID);
    if (saved && saved.options) {
      this.options = saved.options;
    }

    // Adjust option 4 to make it distinct
    this.options[3].shapes = [{ type: 'plus-thick' }, { type: 'plus-thick' }]; // Cross or double plus
  }

  persist(): void {
    this.gs.save(ID, {
      options: this.options,
      isCompleted: this.isNextUnlocked
    });
  }

  selectOption(id: number): void {
    if (this.isChecking || this.isNextUnlocked) return;

    this.options.forEach(opt => opt.isSelected = false);
    const selected = this.options.find(o => o.id === id);
    if (selected) {
      selected.isSelected = true;
    }
    this.persist();
  }

  checkAnswer(): void {
        if (!this.options.some(o => o.isSelected)) {
            this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
            return;
        }

    const selectedOption = this.options.find(o => o.isSelected);

    if (!selectedOption) {
      this.fb.showFeedback('error', 'Lütfen kutudaki şekillerin gölgesi olabilecek bir kart seçin.');
      return;
    }

    if (selectedOption.isCorrect) {
      this.gs.markCompleted(ID);
      this.hintService.resetErrors(ID);
      this.fb.showFeedback('success', 'Harika! Doğru gölgeyi buldunuz.');
      this.persist();
    } else {
      this.isChecking = true;
      this.hintService.registerError(ID);
      selectedOption.isShaking = true;
      this.persist();
      selectedOption.isSelected = false;
      this.fb.showFeedback('error', 'Bu şekiller hedefteki şekillerin gölgesi değil, tekrar deneyin!');

      setTimeout(() => {
        selectedOption.isShaking = false;
        this.isChecking = false;
      }, 500);
    }
  }

  clearSelection(): void {
    this.options.forEach(opt => {
      opt.isSelected = false;
      opt.isShaking = false;
    });
    this.gs.clear(ID);
    this.hintService.resetErrors(ID);
  }

  goPrev(): void {
    this.router.navigate(['/find-most-balls']);
  }

  goNext(): void {
    if (!this.isNextUnlocked) return;
    this.router.navigate(['/letter-sequence']);
  }
}
