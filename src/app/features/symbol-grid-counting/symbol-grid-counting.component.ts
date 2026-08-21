import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityService } from '../../core/services/activity.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { GameStateService } from '../../core/services/game-state.service';
import { HintService } from '../../core/services/hint.service';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';

interface SymbolRow {
  symbol: string;
  correctCount: number;
  selectedCount: number | null;
}

const ID = 'symbol-grid-counting';

@Component({
  selector: 'app-symbol-grid-counting',
  standalone: true,
  imports: [CommonModule, ActivityHeaderComponent, ActionButtonsComponent, SharedFeedbackComponent],
  templateUrl: './symbol-grid-counting.component.html',
  styleUrl: './symbol-grid-counting.component.scss'
})
export class SymbolGridCountingComponent {
  private activityService = inject(ActivityService);
  private feedbackService = inject(FeedbackService);
  private gameStateService = inject(GameStateService);
  private hintService = inject(HintService);

  isCompleted = false;

  readonly columns = [2, 3, 4, 5, 6];

  rows: SymbolRow[] = [
    { symbol: '❤️', correctCount: 3, selectedCount: null },
    { symbol: '🌸', correctCount: 4, selectedCount: null },
    { symbol: '⭐', correctCount: 4, selectedCount: null },
  ];

  // Scatter area: symbols distributed randomly (❤️×3, 🌸×4, ⭐×4 = 11)
  readonly scatterSymbols: string[] = [
    '❤️', '🌸', '⭐', '🌸',
    '⭐', '❤️', '🌸', '⭐',
    '🌸', '⭐', '❤️'
  ];

  ngOnInit(): void {
    const saved = this.gameStateService.getData<any>(ID);
    if (saved) {
      this.rows.forEach((r, i) => r.selectedCount = saved.selections?.[i] ?? null);
      this.isCompleted = saved.isCompleted ?? false;
    }
  }

  selectCell(rowIdx: number, count: number): void {
    if (this.isCompleted) return;
    const row = this.rows[rowIdx];
    row.selectedCount = row.selectedCount === count ? null : count;
    this.persist();
  }

  onCheck(): void {
    const allSelected = this.rows.every(r => r.selectedCount !== null);
    if (!allSelected) {
      this.feedbackService.showWrong();
      return;
    }
    const allCorrect = this.rows.every(r => r.selectedCount === r.correctCount);
    if (allCorrect) {
      this.isCompleted = true;
      this.gameStateService.markCompleted(ID);
      this.feedbackService.showCorrect();
    } else {
      this.feedbackService.showWrong();
      this.hintService.registerError(ID);
    }
    this.persist();
  }

  onReset(): void {
    this.rows.forEach(r => r.selectedCount = null);
    this.isCompleted = false;
    this.gameStateService.clear(ID);
  }

  prev(): void { this.activityService.prev(); }
  next(): void { this.activityService.next(); }

  private persist(): void {
    this.gameStateService.save(ID, {
      selections: this.rows.map(r => r.selectedCount),
      isCompleted: this.isCompleted
    });
  }
}
