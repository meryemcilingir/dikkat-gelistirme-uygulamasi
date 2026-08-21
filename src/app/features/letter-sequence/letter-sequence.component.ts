import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface SequenceRow {
  id: number;
  letters: string[];
  colorHex: string;
  isCorrect: boolean;
  isSelected: boolean;
  isShaking: boolean;
}

interface LetterSequenceState {
  rows: SequenceRow[];
  isCompleted: boolean;
}

const ID = 'letter-sequence';

@Component({
  selector: 'app-letter-sequence',
  standalone: true,
  imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
  templateUrl: './letter-sequence.component.html',
  styleUrl: './letter-sequence.component.scss'
})
export class LetterSequenceComponent implements OnInit {

  rows: SequenceRow[] = [
    { id: 1, colorHex: '#e91e63', isCorrect: false, isSelected: false, isShaking: false, letters: ['B', 'B', 'B', 'B', 'B', 'D', 'D', 'B', 'B', 'B', 'D', 'D'] }, // Pink
    { id: 2, colorHex: '#8d6e63', isCorrect: false, isSelected: false, isShaking: false, letters: ['B', 'B', 'B', 'B', 'B', 'D', 'D', 'B', 'B', 'B', 'D', 'D'] }, // Brown
    { id: 3, colorHex: '#9c27b0', isCorrect: false, isSelected: false, isShaking: false, letters: ['B', 'B', 'B', 'B', 'B', 'D', 'D', 'B', 'B', 'B', 'D', 'D'] }, // Purple
    { id: 4, colorHex: '#4caf50', isCorrect: false, isSelected: false, isShaking: false, letters: ['B', 'B', 'B', 'B', 'B', 'D', 'D', 'B', 'B', 'B', 'D', 'D'] }, // Green
    { id: 5, colorHex: '#f44336', isCorrect: true, isSelected: false, isShaking: false, letters: ['B', 'B', 'B', 'B', 'B', 'D', 'D', 'D', 'B', 'B', 'D', 'D'] }, // Red (DOĞRU)
    { id: 6, colorHex: '#212121', isCorrect: false, isSelected: false, isShaking: false, letters: ['B', 'B', 'B', 'B', 'B', 'D', 'D', 'B', 'B', 'B', 'D', 'D'] }  // Black
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
    const saved = this.gs.getData<LetterSequenceState>(ID);
    if (saved && saved.rows) {
      this.rows = saved.rows;
    }
  }

  persist(): void {
    this.gs.save(ID, {
      rows: this.rows,
      isCompleted: this.isNextUnlocked
    });
  }

  selectRow(id: number): void {
    if (this.isChecking || this.isNextUnlocked) return;

    this.rows.forEach(r => r.isSelected = false);
    const selected = this.rows.find(r => r.id === id);
    if (selected) {
      selected.isSelected = true;
    }
    this.persist();
  }

  checkAnswer(): void {
    const selectedRow = this.rows.find(r => r.isSelected);

    if (!selectedRow) {
      this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
      return;
    }

    if (selectedRow.isCorrect) {
      this.gs.markCompleted(ID);
      this.hintService.resetErrors(ID);
      this.fb.showFeedback('success', 'Harika! Farklı olan sıralamayı doğru buldunuz.');
      this.persist();
    } else {
      this.isChecking = true;
      this.hintService.registerError(ID);
      selectedRow.isShaking = true;
      this.persist(); // Öğrencinin işaretlediği sıra, temizlenmeden önce kaydedilir (inceleme ekranı için).
      selectedRow.isSelected = false; // instantly clear selection visually
      this.fb.showFeedback('error', 'Tekrar Denemelisin');

      setTimeout(() => {
        selectedRow.isShaking = false;
        this.isChecking = false;
      }, 500);
    }
  }

  clearSelection(): void {
    this.rows.forEach(r => {
      r.isSelected = false;
      r.isShaking = false;
    });
    this.gs.clear(ID);
    this.hintService.resetErrors(ID);
  }

  goPrev(): void {
    this.router.navigate(['/shadow-matching']); // Previous page placeholder
  }

  goNext(): void {
    if (!this.isNextUnlocked) return;
    this.router.navigate(['/identical-pattern']);
  }
}
