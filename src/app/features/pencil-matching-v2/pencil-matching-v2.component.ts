import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';

export interface ChildClue {
  id: number;
  name: string;
  emoji: string;
  clue: string;
  correctPencilId: number;
  assignedPencilId: number | null;
}

export interface PencilItem {
  id: number;
  color: string;
  colorName: string;
  lengthPx: number; // visual width in percent
}

export interface PencilMatchingState {
  assignments: { childId: number; pencilId: number | null }[];
  feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'pencil-matching-v2';

@Component({
  selector: 'app-pencil-matching-v2',
  standalone: true,
  imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent, SharedFeedbackComponent],
  templateUrl: './pencil-matching-v2.component.html',
  styleUrl: './pencil-matching-v2.component.scss'
})
export class PencilMatchingV2Component implements OnInit {

  // Pencils ordered by length: Green(longest) > Purple > Brown > Blue > Yellow(shortest)
  pencils: PencilItem[] = [
    { id: 1, color: '#4CAF50', colorName: 'Yeşil',  lengthPx: 100 },
    { id: 2, color: '#9C27B0', colorName: 'Mor',    lengthPx: 82 },
    { id: 3, color: '#795548', colorName: 'Kahve',   lengthPx: 64 },
    { id: 4, color: '#1565C0', colorName: 'Mavi',   lengthPx: 48 },
    { id: 5, color: '#FDD835', colorName: 'Sarı',   lengthPx: 34 },
  ];

  children: ChildClue[] = [
    { id: 1, name: 'Ayşe',  emoji: '👧', clue: 'Benim kalemim en kısa olan kalem.',                correctPencilId: 5, assignedPencilId: null },
    { id: 2, name: 'Emre',  emoji: '👦', clue: 'Benim kalemim en uzun kalemden biraz kısadır.',     correctPencilId: 2, assignedPencilId: null },
    { id: 3, name: 'Zeynep',emoji: '👩', clue: 'Benim kalemim en uzunudur.',                       correctPencilId: 1, assignedPencilId: null },
    { id: 4, name: 'Beren', emoji: '👧🏻', clue: 'Benim kalemim en uzun 3. kalemdir.',               correctPencilId: 3, assignedPencilId: null },
    { id: 5, name: 'Ali',   emoji: '👦🏻', clue: 'Benim kalemim en kısadan bir önceki.',              correctPencilId: 4, assignedPencilId: null },
  ];

  selectedChildId: number | null = null;
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
    const saved = this.gs.getData<PencilMatchingState>(ID);
    if (saved) {
      saved.assignments.forEach(a => {
        const child = this.children.find(c => c.id === a.childId);
        if (child) child.assignedPencilId = a.pencilId;
      });
      this.feedbackState = saved.feedbackState;
    }
  }

  private persist(): void {
    this.gs.save(ID, {
      assignments: this.children.map(c => ({ childId: c.id, pencilId: c.assignedPencilId })),
      feedbackState: this.feedbackState
    });
  }

  selectChild(childId: number): void {
    if (this.feedbackState === 'correct') return;
    this.selectedChildId = this.selectedChildId === childId ? null : childId;
  }

  assignPencil(pencilId: number): void {
    if (this.feedbackState === 'correct') return;
    if (this.selectedChildId === null) return;

    // Remove this pencil from other children
    this.children.forEach(c => {
      if (c.assignedPencilId === pencilId) c.assignedPencilId = null;
    });

    const child = this.children.find(c => c.id === this.selectedChildId);
    if (child) {
      child.assignedPencilId = pencilId;
      this.feedbackState = null;
      this.selectedChildId = null;
      this.persist();
    }
  }

  getPencilForChild(childId: number): PencilItem | null {
    const child = this.children.find(c => c.id === childId);
    if (!child || child.assignedPencilId === null) return null;
    return this.pencils.find(p => p.id === child.assignedPencilId) || null;
  }

  isPencilAssigned(pencilId: number): boolean {
    return this.children.some(c => c.assignedPencilId === pencilId);
  }

  clearSelection(): void {
    this.children.forEach(c => c.assignedPencilId = null);
    this.selectedChildId = null;
    this.feedbackState = null;
    this.gs.clear(ID);
    this.hintService.resetErrors(ID);
  }

  checkAnswer(): void {
    const allAssigned = this.children.every(c => c.assignedPencilId !== null);
    if (!allAssigned) {
      this.fb.showFeedback('error', 'Lütfen her çocuğa bir kalem eşleyin!');
      return;
    }

    const allCorrect = this.children.every(c => c.assignedPencilId === c.correctPencilId);

    if (allCorrect) {
      this.feedbackState = 'correct';
      this.gs.markCompleted(ID);
      this.hintService.resetErrors(ID);
      this.fb.showFeedback('success', 'Tebrikler! Tüm kalemleri doğru eşledin! ✏️');
    } else {
      this.feedbackState = 'wrong';
      this.hintService.registerError(ID);
      this.fb.showFeedback('error', 'Yanlış eşleşme var! İpuçlarını tekrar oku.');
    }
    this.persist();
  }

  goPrev(): void {
    this.router.navigate(['/shape-corners']);
  }

  goNext(): void {
    if (!this.isNextUnlocked) return;
    this.router.navigate(['/shape-count-coloring']);
  }
}
