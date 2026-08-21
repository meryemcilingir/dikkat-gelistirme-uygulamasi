import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface ProfessionOption {
  id: number;
  name: string;
  emoji: string;
  isCorrect: boolean;
  isShaking?: boolean;
}

export interface SchoolProfessionState {
  selectedId: number | null;
  feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'school-profession';

@Component({
  selector: 'app-school-profession',
  standalone: true,
  imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
  templateUrl: './school-profession.component.html',
  styleUrl: './school-profession.component.scss'
})
export class SchoolProfessionComponent implements OnInit {

  options: ProfessionOption[] = [
    { id: 1, name: 'Futbolcu',   emoji: '⚽', isCorrect: false },
    { id: 2, name: 'Çiftçi',     emoji: '🌾', isCorrect: false },
    { id: 3, name: 'Doktor',     emoji: '🩺', isCorrect: false },
    { id: 4, name: 'Öğretmen',   emoji: '📚', isCorrect: true  },
    { id: 5, name: 'Şarkıcı',   emoji: '🎤', isCorrect: false },
  ];

  selectedId: number | null = null;
  feedbackState: 'correct' | 'wrong' | null = null;

  constructor(
    private router: Router,
    private gs: GameStateService,
    private fb: FeedbackService,
    private hintService: HintService
  ) {}

  get showHint(): boolean {
    return this.hintService.shouldShowHint(ID);
  }

  get isNextUnlocked(): boolean {
    return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
  }

  ngOnInit(): void {
    const saved = this.gs.getData<SchoolProfessionState>(ID);
    if (saved) {
      this.selectedId = saved.selectedId;
      this.feedbackState = saved.feedbackState;
    }
  }

  private persist(): void {
    this.gs.save(ID, {
      selectedId: this.selectedId,
      feedbackState: this.feedbackState
    });
  }

  selectOption(id: number): void {
    if (this.feedbackState === 'correct') return;
    this.selectedId = id;
    this.feedbackState = null;
    this.persist();
  }

  clearSelection(): void {
    this.selectedId = null;
    this.feedbackState = null;
    this.options.forEach(o => o.isShaking = false);
    this.gs.clear(ID);
    this.hintService.resetErrors(ID);
  }

  checkAnswer(): void {
    if (this.selectedId === null) {
      this.fb.showFeedback('error', 'Lütfen bir meslek seçin!');
      return;
    }

    const selected = this.options.find(o => o.id === this.selectedId)!;

    if (selected.isCorrect) {
      this.feedbackState = 'correct';
      this.gs.markCompleted(ID);
      this.hintService.resetErrors(ID);
      this.fb.showFeedback('success', 'Tebrikler! Öğretmen okulda çalışır. 🏫');
    } else {
      this.feedbackState = 'wrong';
      this.hintService.registerError(ID);
      selected.isShaking = true;
      setTimeout(() => (selected.isShaking = false), 500);
      this.fb.showFeedback('error', 'Yanlış! Okulda hangi meslek çalışır, tekrar düşün.');
    }
    this.persist();
  }

  goPrev(): void {
    this.router.navigate(['/shape-matrix']);
  }

  goNext(): void {
    if (!this.isNextUnlocked) return;
    this.router.navigate(['/tallest-animal']);
  }
}
