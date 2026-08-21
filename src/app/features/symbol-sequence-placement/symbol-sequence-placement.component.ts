import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActivityService } from '../../core/services/activity.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';

interface SymbolPaletteItem {
  id: number;
  symbol: string;
  type: string;
}

interface PlacementBox {
  id: number;
  targetSymbolId: number;
  targetNumber: number;
  userSymbolId: number | null;
}

interface PlacementState {
  userSymbolIds: (number | null)[];
  feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'symbol-sequence-placement';

@Component({
  selector: 'app-symbol-sequence-placement',
  standalone: true,
  imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent, SharedFeedbackComponent],
  templateUrl: './symbol-sequence-placement.component.html',
  styleUrl: './symbol-sequence-placement.component.scss'
})
export class SymbolSequencePlacementComponent implements OnInit {
  private gs = inject(GameStateService);
  private fb = inject(FeedbackService);
  private hintService = inject(HintService);
  private activityService = inject(ActivityService);

  palette: SymbolPaletteItem[] = [
    { id: 1, symbol: '▲', type: 'triangle' },
    { id: 2, symbol: '✕', type: 'cross' },
    { id: 3, symbol: '⭕', type: 'circle' }
  ];

  selectedSymbolId: number | null = null;

  boxes: PlacementBox[] = [
    { id: 1, targetNumber: 2, targetSymbolId: 2, userSymbolId: null },
    { id: 2, targetNumber: 3, targetSymbolId: 3, userSymbolId: null },
    { id: 3, targetNumber: 1, targetSymbolId: 1, userSymbolId: null },
    { id: 4, targetNumber: 2, targetSymbolId: 2, userSymbolId: null },
    { id: 5, targetNumber: 1, targetSymbolId: 1, userSymbolId: null }
  ];

  feedbackState: 'correct' | 'wrong' | null = null;

  get showHint(): boolean {
    return this.hintService.shouldShowHint(ID);
  }

  get isNextUnlocked(): boolean {
    return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
  }

  ngOnInit(): void {
    const saved = this.gs.getData<PlacementState>(ID);
    if (saved) {
      this.boxes.forEach((box, i) => {
        box.userSymbolId = saved.userSymbolIds[i];
      });
      this.feedbackState = saved.feedbackState;
    }
  }

  private persist(): void {
    this.gs.save(ID, {
      userSymbolIds: this.boxes.map(b => b.userSymbolId),
      feedbackState: this.feedbackState
    });
  }

  selectFromPalette(id: number): void {
    if (this.gs.isCompleted(ID) && this.feedbackState === 'correct') return;
    this.selectedSymbolId = this.selectedSymbolId === id ? null : id;
  }

  placeSymbol(box: PlacementBox): void {
    if (this.gs.isCompleted(ID) && this.feedbackState === 'correct') return;
    
    // If a palette item is selected, place it
    if (this.selectedSymbolId !== null) {
      box.userSymbolId = this.selectedSymbolId;
      this.feedbackState = null;
      this.persist();
    } else {
      // If nothing selected from palette, click clears the box
      box.userSymbolId = null;
      this.persist();
    }
  }

  getSymbolChar(id: number | null): string {
    if (!id) return '';
    return this.palette.find(p => p.id === id)?.symbol || '';
  }

  getSymbolClass(id: number | null): string {
    if (!id) return '';
    return this.palette.find(p => p.id === id)?.type || '';
  }

  onCheck(): void {
    const allFilled = this.boxes.every(b => b.userSymbolId !== null);
    if (!allFilled) {
      this.fb.showFeedback('error', 'Lütfen tüm boş kutulara bir şekil yerleştirin!');
      return;
    }

    const allCorrect = this.boxes.every(b => b.userSymbolId === b.targetSymbolId);
    this.feedbackState = allCorrect ? 'correct' : 'wrong';

    if (allCorrect) {
      this.gs.markCompleted(ID);
      this.hintService.resetErrors(ID);
      this.selectedSymbolId = null;
      this.fb.showFeedback('success', 'Tebrikler! Sayılara karşılık gelen şekilleri doğru yerleştirdin!');
    } else {
      this.hintService.registerError(ID);
      this.fb.showFeedback('error', 'Bazı şekiller yanlış. Tabloya dikkatlice bak!');
    }
    this.persist();
  }

  onReset(): void {
    this.boxes.forEach(b => b.userSymbolId = null);
    this.feedbackState = null;
    this.selectedSymbolId = null;
    this.gs.clear(ID);
    this.hintService.resetErrors(ID);
    this.persist();
  }

  prev(): void { this.activityService.prev(); }
  next(): void {
    if (this.isNextUnlocked) {
      this.activityService.next();
    }
  }
}
