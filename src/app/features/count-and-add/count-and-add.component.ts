import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface MathRow {
  id: number;
  emoji: string;
  leftCount: number;
  rightCount: number;
  target: number;
  isShaking?: boolean;
  isError?: boolean;
}

interface CountAndAddState {
  userAnswers: { [id: number]: number | null };
}

const ID = 'count-and-add';

@Component({
  selector: 'app-count-and-add',
  standalone: true,
  imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
  templateUrl: './count-and-add.component.html',
  styleUrl: './count-and-add.component.scss'
})
export class CountAndAddComponent implements OnInit {

  rows: MathRow[] = [
    { id: 1, emoji: '⚽', leftCount: 4, rightCount: 3, target: 7, isShaking: false, isError: false },
    { id: 2, emoji: '🌻', leftCount: 6, rightCount: 3, target: 9, isShaking: false, isError: false },
    { id: 3, emoji: '✏️', leftCount: 8, rightCount: 2, target: 10, isShaking: false, isError: false }
  ];

  userAnswers: { [id: number]: number | null } = {
    1: null,
    2: null,
    3: null
  };

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
    const saved = this.gs.getData<CountAndAddState>(ID);
    if (saved && saved.userAnswers) {
      this.userAnswers = { ...saved.userAnswers };
    }
  }

  persist(): void {
    this.gs.save(ID, {
      userAnswers: this.userAnswers
    });
  }

  updateAnswer(id: number, event: Event): void {
    if (this.isChecking || this.isNextUnlocked) return;
    const inputElement = event.target as HTMLInputElement;
    const val = inputElement.value;

    if (val === '') {
      this.userAnswers[id] = null;
    } else {
      this.userAnswers[id] = parseInt(val, 10);
    }

    this.persist();
  }

  getArray(count: number): number[] {
    return new Array(count).fill(0);
  }

  checkAnswer(): void {
    if (!this.rows.every(row => this.userAnswers[row.id] !== null)) {
      this.fb.showFeedback('error', 'Lütfen tüm kutucukları doldurun!');
      return;
    }

    const mistakes = this.rows.filter(row =>
      this.userAnswers[row.id] === null ||
      isNaN(this.userAnswers[row.id] as number) ||
      this.userAnswers[row.id] !== row.target
    );

    if (mistakes.length > 0) {
      this.isChecking = true;
      this.hintService.registerError(ID);

      mistakes.forEach(row => {
        row.isShaking = true;
        row.isError = true;
      });

      this.fb.showFeedback('error', 'Bazı toplamalar hatalı, tekrar saymayı dene!');

      setTimeout(() => {
        mistakes.forEach(row => {
          row.isShaking = false;
          row.isError = false;
        });
      }, 600);

      if (this.showHints) {
        // İpuçları aktifse ek CSS sınıfları (show-hint) zaten tetiklenecek
      }

      // Her zaman yanlış olanları sil (Hint aktif olmasa bile kalsın istemiyoruz)
      mistakes.forEach(row => {
        this.userAnswers[row.id] = null;
      });

      setTimeout(() => {
        this.isChecking = false;
        this.persist();
      }, 500);

    } else {
      this.gs.markCompleted(ID);
      this.hintService.resetErrors(ID);
      this.fb.showFeedback('success', 'Harika! Bütün toplamaları doğru yaptın.');
      this.persist();
    }
  }

  clearSelection(): void {
    this.rows.forEach(row => {
      this.userAnswers[row.id] = null;
      row.isShaking = false;
    });
    this.gs.clear(ID);
    this.hintService.resetErrors(ID);
  }

  isHint(row: MathRow): boolean {
    if (!this.showHints) return false;
    return this.userAnswers[row.id] !== row.target;
  }

  goPrev(): void {
    this.router.navigate(['/find-reversed-e']);
  }

  goNext(): void {
    if (!this.isNextUnlocked) return;
    this.router.navigate(['/rhythmic-counting']);
  }
}
