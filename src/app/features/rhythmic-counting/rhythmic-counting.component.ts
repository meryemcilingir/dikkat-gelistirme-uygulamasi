import { Component, OnInit, ChangeDetectorRef, ViewChildren, ElementRef, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface SequenceItem {
  id: number;
  value: number;
  isMissing: boolean;
  userInput: number | null;
  isShaking?: boolean;
  isError?: boolean;
}

export interface SequenceRow {
  rowId: number;
  color: string;
  items: SequenceItem[];
}

interface RhythmicCountingState {
  userInputs: { [id: number]: number | null };
}

const ID = 'rhythmic-counting';

@Component({
  selector: 'app-rhythmic-counting',
  standalone: true,
  imports: [CommonModule, FormsModule, ActionButtonsComponent, ActivityHeaderComponent],
  templateUrl: './rhythmic-counting.component.html',
  styleUrl: './rhythmic-counting.component.scss'
})
export class RhythmicCountingComponent implements OnInit {

  rows: SequenceRow[] = [];
  isChecking = false;

  @ViewChildren('answerInput') inputElements!: QueryList<ElementRef<HTMLInputElement>>;

  constructor(
    private router: Router,
    private gs: GameStateService,
    private fb: FeedbackService,
    private hintService: HintService,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeRows();
  }

  get showHints(): boolean {
    return this.hintService.shouldShowHint(ID);
  }

  get isNextUnlocked(): boolean {
    return this.gs.isCompleted(ID);
  }

  private initializeRows(): void {
    let globalId = 0;

    // Helper to generate a row
    const createRow = (rowId: number, color: string, start: number, step: number) => {
      const items: SequenceItem[] = [];
      for (let i = 0; i < 6; i++) {
        items.push({
          id: globalId++,
          value: start + (i * step),
          isMissing: i >= 4, // Last 2 are missing
          userInput: null,
          isShaking: false,
          isError: false
        });
      }
      return { rowId, color, items };
    };

    this.rows = [
      createRow(1, '#27ae60', 10, 10), // 10'ar sayma - Yeşil
      createRow(2, '#3498db', 5, 5),   // 5'er sayma - Mavi
      createRow(3, '#9b59b6', 2, 2),   // 2'şer sayma - Lila
      createRow(4, '#e84393', 3, 3)    // 3'er sayma - Pembe
    ];
  }

  ngOnInit(): void {
    const saved = this.gs.getData<RhythmicCountingState>(ID);
    if (saved && saved.userInputs) {
      this.rows.forEach(row => {
        row.items.forEach(item => {
          if (item.isMissing && saved.userInputs[item.id] !== undefined) {
            item.userInput = saved.userInputs[item.id];
          }
        });
      });
    }
  }

  persist(): void {
    const userInputs: { [id: number]: number | null } = {};
    this.rows.forEach(row => {
      row.items.forEach(item => {
        if (item.isMissing) {
          userInputs[item.id] = item.userInput;
        }
      });
    });

    this.gs.save(ID, { userInputs });
  }

  updateInput(item: SequenceItem, event: Event): void {
    if (this.isChecking || this.isNextUnlocked) return;
    const inputElement = event.target as HTMLInputElement;
    const val = inputElement.value;

    if (val === '') {
      item.userInput = null;
    } else {
      item.userInput = parseInt(val, 10);
    }
    this.persist();
  }

  checkAnswer(): void {
    if (this.rows.every(row => row.items.filter(i => i.isMissing).every(i => i.userInput === null))) {
      this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
      return;
    }

    let hasMissing = false;
    let hasMistake = false;
    const mistakes: SequenceItem[] = [];

    this.rows.forEach(row => {
      row.items.forEach(item => {
        if (item.isMissing) {
          if (item.userInput === null || item.userInput === undefined || item.userInput.toString().trim() === '') {
            hasMissing = true;
          } else if (Number(item.userInput) !== item.value) {
            hasMistake = true;
            mistakes.push(item);
          }
        }
      });
    });

    if (hasMissing) {
      this.fb.showFeedback('error', 'Tüm boşlukları doldurmalısın!');
      return;
    }

    if (hasMistake) {
      this.isChecking = true;
      this.hintService.registerError(ID);

      mistakes.forEach(item => {
        item.isShaking = true;
        item.isError = true;
      });

      this.fb.showFeedback('error', 'Bazı sayılar hatalı, tekrar dene!');

      setTimeout(() => {
        // Collect IDs of mistakes to find their matching DOM index
        const mistakeIds = new Set(mistakes.map(m => m.id));
        let i = 0;

        this.rows.forEach(row => {
          row.items.forEach(item => {
            if (item.isMissing) {
              const nativeEl = this.inputElements.toArray()[i]?.nativeElement;
              // Only forcefully wipe the DOM value if this item was a mistake
              if (nativeEl && mistakeIds.has(item.id)) {
                item.userInput = null;
                item.isShaking = false;
                item.isError = false;
                nativeEl.value = '';
                nativeEl.dispatchEvent(new Event('input', { bubbles: true }));
              }
              i++;
            }
          });
        });

        // Trigger Angular CD so the placeholder `showHints` binds to `userInput: null` immediately
        this.cdr.detectChanges();
        this.isChecking = false;
        this.persist();
      }, 600);

    } else {
      this.gs.markCompleted(ID);
      this.hintService.resetErrors(ID);
      this.fb.showFeedback('success', 'Harika! Ritmik saymaları doğru tamamladın.');
      this.persist();
    }
  }

  clearSelection(): void {
    this.rows.forEach(row => {
      row.items.forEach(item => {
        if (item.isMissing) {
          item.userInput = null;
          item.isShaking = false;
          item.isError = false;
        }
      });
    });
    this.gs.clear(ID);
    this.hintService.resetErrors(ID);
  }

  goPrev(): void {
    this.router.navigate(['/count-and-add']);
  }

  goNext(): void {
    if (!this.isNextUnlocked) return;
    this.router.navigate(['/top-view']);
  }
}
