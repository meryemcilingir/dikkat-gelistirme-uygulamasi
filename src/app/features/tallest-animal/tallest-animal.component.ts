import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface AnimalOption {
  id: number;
  name: string;
  emoji: string;
  isCorrect: boolean;
  isShaking?: boolean;
}

export interface TallestAnimalState {
  selectedId: number | null;
  feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'tallest-animal';

@Component({
  selector: 'app-tallest-animal',
  standalone: true,
  imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
  templateUrl: './tallest-animal.component.html',
  styleUrl: './tallest-animal.component.scss'
})
export class TallestAnimalComponent implements OnInit {

  animals: AnimalOption[] = [
    { id: 1, name: 'Kedi',    emoji: '🐱', isCorrect: false },
    { id: 2, name: 'Ördek',   emoji: '🐥', isCorrect: false },
    { id: 3, name: 'Köpek',   emoji: '🐶', isCorrect: false },
    { id: 4, name: 'Geyik',   emoji: '🦌', isCorrect: false },
    { id: 5, name: 'Horoz',   emoji: '🐓', isCorrect: false },
    { id: 6, name: 'Zürafa',  emoji: '🦒', isCorrect: true  },
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
    const saved = this.gs.getData<TallestAnimalState>(ID);
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

  selectAnimal(id: number): void {
    if (this.feedbackState === 'correct') return;
    this.selectedId = id;
    this.feedbackState = null;
    this.persist();
  }

  clearSelection(): void {
    this.selectedId = null;
    this.feedbackState = null;
    this.animals.forEach(a => a.isShaking = false);
    this.gs.clear(ID);
    this.hintService.resetErrors(ID);
  }

  checkAnswer(): void {
    if (this.selectedId === null) {
      this.fb.showFeedback('error', 'Lütfen bir hayvan seçin!');
      return;
    }

    const selected = this.animals.find(a => a.id === this.selectedId)!;

    if (selected.isCorrect) {
      this.feedbackState = 'correct';
      this.gs.markCompleted(ID);
      this.hintService.resetErrors(ID);
      this.fb.showFeedback('success', 'Tebrikler! Zürafa en uzun hayvandır. 🦒');
    } else {
      this.feedbackState = 'wrong';
      this.hintService.registerError(ID);
      selected.isShaking = true;
      setTimeout(() => (selected.isShaking = false), 500);
      this.fb.showFeedback('error', 'Yanlış! Hayvanların boylarını karşılaştır.');
    }
    this.persist();
  }

  goPrev(): void {
    this.router.navigate(['/school-profession']);
  }

  goNext(): void {
    if (!this.isNextUnlocked) return;
    this.router.navigate(['/shape-corners']);
  }
}
