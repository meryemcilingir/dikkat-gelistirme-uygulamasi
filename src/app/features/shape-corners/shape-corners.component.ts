import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface ShapeCornerOption {
  id: number;
  name: string;
  corners: number;
  shape: 'triangle' | 'square' | 'rectangle';
  isCorrect: boolean;
  isShaking?: boolean;
}

export interface ShapeCornersState {
  selectedIds: number[];
  feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'shape-corners';

@Component({
  selector: 'app-shape-corners',
  standalone: true,
  imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
  templateUrl: './shape-corners.component.html',
  styleUrl: './shape-corners.component.scss'
})
export class ShapeCornersComponent implements OnInit {

  shapes: ShapeCornerOption[] = [
    { id: 1, name: 'Üçgen',      corners: 3, shape: 'triangle',  isCorrect: false },
    { id: 2, name: 'Kare',       corners: 4, shape: 'square',    isCorrect: true  },
    { id: 3, name: 'Dikdörtgen', corners: 4, shape: 'rectangle', isCorrect: true  },
  ];

  selectedIds: number[] = [];
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
    const saved = this.gs.getData<ShapeCornersState>(ID);
    if (saved) {
      this.selectedIds = saved.selectedIds || [];
      this.feedbackState = saved.feedbackState;
    }
  }

  private persist(): void {
    this.gs.save(ID, {
      selectedIds: this.selectedIds,
      feedbackState: this.feedbackState
    });
  }

  isSelected(id: number): boolean {
    return this.selectedIds.includes(id);
  }

  toggleShape(id: number): void {
    if (this.feedbackState === 'correct') return;

    if (this.isSelected(id)) {
      this.selectedIds = this.selectedIds.filter(sid => sid !== id);
    } else {
      this.selectedIds = [...this.selectedIds, id];
    }
    this.feedbackState = null;
    this.persist();
  }

  clearSelection(): void {
    this.selectedIds = [];
    this.feedbackState = null;
    this.shapes.forEach(s => s.isShaking = false);
    this.gs.clear(ID);
    this.hintService.resetErrors(ID);
  }

  checkAnswer(): void {
    // Doğru cevap: kare ve dikdörtgen (ikisi de 4 köşe)
    const correctIds = this.shapes.filter(s => s.isCorrect).map(s => s.id);

    if (this.selectedIds.length === 0) {
      this.fb.showFeedback('error', 'Lütfen en az bir şekil seçin!');
      return;
    }

    const selectedCorrectly =
      this.selectedIds.length === correctIds.length &&
      correctIds.every(cid => this.selectedIds.includes(cid));

    if (selectedCorrectly) {
      this.feedbackState = 'correct';
      this.gs.markCompleted(ID);
      this.hintService.resetErrors(ID);
      this.fb.showFeedback('success', 'Tebrikler! Kare ve dikdörtgen en çok köşeye (noktaya) sahip. 🎯');
    } else {
      this.feedbackState = 'wrong';
      this.hintService.registerError(ID);

      // Yanlış seçimleri titret
      this.shapes.forEach(s => {
        if (this.selectedIds.includes(s.id) && !s.isCorrect) {
          s.isShaking = true;
          setTimeout(() => (s.isShaking = false), 500);
        }
      });

      this.fb.showFeedback('error', 'Yanlış! Köşelerdeki noktaları say ve en çok olanları bul.');
    }
    this.persist();
  }

  /** SVG dot positions for each shape corner */
  getCornerDots(shape: ShapeCornerOption): {x: number; y: number}[] {
    switch (shape.shape) {
      case 'triangle':
        return [
          { x: 60, y: 10 },  // top
          { x: 10, y: 100 }, // bottom-left
          { x: 110, y: 100 } // bottom-right
        ];
      case 'square':
        return [
          { x: 15, y: 15 },
          { x: 105, y: 15 },
          { x: 15, y: 105 },
          { x: 105, y: 105 }
        ];
      case 'rectangle':
        return [
          { x: 5, y: 25 },
          { x: 115, y: 25 },
          { x: 5, y: 95 },
          { x: 115, y: 95 }
        ];
      default: return [];
    }
  }

  goPrev(): void {
    this.router.navigate(['/tallest-animal']);
  }

  goNext(): void {
    if (!this.isNextUnlocked) return;
    this.router.navigate(['/pencil-matching-v2']);
  }
}
