import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface SizeOption {
  id: number;
  width: number; // For styling the image size
  isCorrect: boolean;
  isSelected?: boolean;
  isShaking?: boolean;
}

interface MatchSizeState {
  options: SizeOption[];
  isCompleted: boolean;
}

const ID = 'match-size';

@Component({
  selector: 'app-match-size',
  standalone: true,
  imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
  templateUrl: './match-size.component.html',
  styleUrl: './match-size.component.scss'
})
export class MatchSizeComponent implements OnInit {

  // The correct dimensions matching the image target
  targetWidth = 100;

  options: SizeOption[] = [
    { id: 1, width: 55, isCorrect: false, isSelected: false, isShaking: false }, // Too small
    { id: 2, width: 75, isCorrect: false, isSelected: false, isShaking: false }, // Small
    { id: 3, width: 100, isCorrect: true, isSelected: false, isShaking: false }, // DOĞRU CEVAP
    { id: 4, width: 125, isCorrect: false, isSelected: false, isShaking: false }, // Too big
    { id: 5, width: 65, isCorrect: false, isSelected: false, isShaking: false }, // Smallest
    { id: 6, width: 85, isCorrect: false, isSelected: false, isShaking: false }  // Almost correct
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
    const saved = this.gs.getData<MatchSizeState>(ID);
    if (saved && saved.options) {
      this.options = saved.options;
    }
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
    const selected = this.options.find(opt => opt.id === id);
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

    const selectedOpt = this.options.find(opt => opt.isSelected);

    if (!selectedOpt) {
      this.fb.showFeedback('error', 'Önce bir görsel seç!');
      return;
    }

    if (selectedOpt.isCorrect) {
      this.gs.markCompleted(ID);
      this.hintService.resetErrors(ID);
      this.fb.showFeedback('success', 'Harika! Aynı büyüklükteki eşini buldunuz.');
      this.persist();
    } else {
      this.isChecking = true;
      this.hintService.registerError(ID);
      selectedOpt.isShaking = true;
      this.persist();
      this.fb.showFeedback('error', 'Bu aynı büyüklükte değil. Farklı birine tekrar bakmalısın.');

      setTimeout(() => {
        selectedOpt.isShaking = false;
        selectedOpt.isSelected = false; // reset selection visually
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
    this.router.navigate(['/identical-pattern']); // Previous page placeholder
  }

  goNext(): void {
    if (!this.isNextUnlocked) return;
    this.router.navigate(['/grid-coloring']);
  }
}
