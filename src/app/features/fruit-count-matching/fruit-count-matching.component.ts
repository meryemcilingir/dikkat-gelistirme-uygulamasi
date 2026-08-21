import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface FruitGroup {
  id: number;
  count: number;
  type: 'apple' | 'orange';
  isSelected: boolean;
  isPaired: boolean;
}

interface FruitPair {
  leftId: number;
  rightId: number;
}

interface FruitMatchingState {
  leftGroups: FruitGroup[];
  rightGroups: FruitGroup[];
  pairs: FruitPair[];
}

const ID = 'fruit-count-matching';

@Component({
  selector: 'app-fruit-count-matching',
  standalone: true,
  imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
  templateUrl: './fruit-count-matching.component.html',
  styleUrl: './fruit-count-matching.component.scss'
})
export class FruitCountMatchingComponent implements OnInit {
  leftGroups: FruitGroup[] = [
    { id: 1, count: 3, type: 'apple', isSelected: false, isPaired: false },
    { id: 2, count: 2, type: 'apple', isSelected: false, isPaired: false },
    { id: 3, count: 4, type: 'apple', isSelected: false, isPaired: false },
    { id: 4, count: 5, type: 'apple', isSelected: false, isPaired: false }
  ];

  rightGroups: FruitGroup[] = [
    { id: 5, count: 4, type: 'orange', isSelected: false, isPaired: false },
    { id: 6, count: 3, type: 'orange', isSelected: false, isPaired: false },
    { id: 7, count: 5, type: 'orange', isSelected: false, isPaired: false },
    { id: 8, count: 2, type: 'orange', isSelected: false, isPaired: false }
  ];

  pairs: FruitPair[] = [];

  constructor(
    private router: Router,
    private gs: GameStateService,
    private fb: FeedbackService,
    private hintService: HintService
  ) { }

  get isSubmitted(): boolean {
    return this.gs.isCompleted(ID);
  }

  ngOnInit(): void {
    const saved = this.gs.getData<FruitMatchingState>(ID);
    if (saved) {
      this.leftGroups = saved.leftGroups || this.leftGroups;
      this.rightGroups = saved.rightGroups || this.rightGroups;
      this.pairs = saved.pairs || [];
    }
  }

  persist(): void {
    this.gs.save(ID, {
      leftGroups: this.leftGroups,
      rightGroups: this.rightGroups,
      pairs: this.pairs,
    });
  }

  selectGroup(group: FruitGroup): void {
    if (this.isSubmitted || group.isPaired) return;

    // Her sütundan sadece biri seçilebilir
    if (group.type === 'apple') {
      this.leftGroups.forEach(g => g.isSelected = false);
      group.isSelected = true;
    } else {
      this.rightGroups.forEach(g => g.isSelected = false);
      group.isSelected = true;
    }

    this.tryFormPair();
  }

  /** Eşleşmeyi doğru/yanlış olduğuna bakmadan sessizce kaydeder — sonuç yalnızca Gönder'e basılınca belli olur. */
  private tryFormPair(): void {
    const selectedLeft = this.leftGroups.find(g => g.isSelected);
    const selectedRight = this.rightGroups.find(g => g.isSelected);
    if (!selectedLeft || !selectedRight) return;

    selectedLeft.isPaired = true;
    selectedRight.isPaired = true;
    selectedLeft.isSelected = false;
    selectedRight.isSelected = false;
    this.pairs.push({ leftId: selectedLeft.id, rightId: selectedRight.id });
    this.persist();
  }

  checkAnswer(): void {
    if (this.pairs.length === 0) {
      this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
      return;
    }
    if (this.pairs.length < this.leftGroups.length) {
      this.fb.showFeedback('error', 'Lütfen tüm meyveleri eşleştirin!');
      return;
    }

    const allCorrect = this.pairs.every(p => {
      const left = this.leftGroups.find(g => g.id === p.leftId);
      const right = this.rightGroups.find(g => g.id === p.rightId);
      return !!left && !!right && left.count === right.count;
    });

    if (allCorrect) {
      this.gs.markCompleted(ID);
      this.fb.showFeedback('success', 'Harika! Tüm meyveleri doğru eşleştirdin.');
    } else {
      this.hintService.registerError(ID);
    }
  }

  clearSelection(): void {
    this.leftGroups.forEach(g => { g.isSelected = false; g.isPaired = false; });
    this.rightGroups.forEach(g => { g.isSelected = false; g.isPaired = false; });
    this.pairs = [];
    this.gs.clear(ID);
    this.hintService.resetErrors(ID);
  }

  getArray(count: number): any[] {
    return new Array(count);
  }

  goPrev(): void {
    this.router.navigate(['/dot-pattern-drawing']);
  }

  goNext(): void {
    if (!this.isSubmitted) return;
    this.router.navigate(['/find-most-balls']);
  }
}
