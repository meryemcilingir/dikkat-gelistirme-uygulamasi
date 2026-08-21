import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface BallGroup {
  id: number;
  topRow?: ('basket' | 'soccer')[];
  middleRow?: ('basket' | 'soccer')[];
  bottomRow?: ('basket' | 'soccer')[];
  isCorrect: boolean;
  isSelected: boolean;
  isWrong: boolean;
  borderColor: string;
}

interface FindMostBallsState {
  groups: BallGroup[];
  isCompleted: boolean;
}

const ID = 'find-most-balls';

@Component({
  selector: 'app-find-most-balls',
  standalone: true,
  imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
  templateUrl: './find-most-balls.component.html',
  styleUrl: './find-most-balls.component.scss'
})
export class FindMostBallsComponent implements OnInit {

  groups: BallGroup[] = [
    {
      id: 1,
      topRow: ['basket', 'basket', 'basket', 'basket'],
      bottomRow: ['basket', 'basket', 'basket', 'basket'],
      isCorrect: false,
      isSelected: false,
      isWrong: false,
      borderColor: '#d32f2f' // Red
    },
    {
      id: 2,
      middleRow: ['soccer', 'soccer', 'soccer', 'soccer'],
      isCorrect: false,
      isSelected: false,
      isWrong: false,
      borderColor: '#6d4c41' // Brown
    },
    {
      id: 3,
      topRow: ['basket', 'basket', 'basket', 'basket', 'basket'],
      bottomRow: ['soccer', 'soccer', 'soccer', 'soccer'],
      isCorrect: true,
      isSelected: false,
      isWrong: false,
      borderColor: '#7b1fa2' // Purple
    }
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
    const saved = this.gs.getData<FindMostBallsState>(ID);
    if (saved?.groups?.length) {
      this.groups = saved.groups;
    }
  }

  persist(): void {
    this.gs.save(ID, {
      groups: this.groups,
      isCompleted: this.isNextUnlocked
    });
  }

  selectGroup(group: BallGroup): void {
    if (this.isChecking || this.isNextUnlocked) return;

    this.groups.forEach(g => g.isSelected = false);
    group.isSelected = true;
    this.persist();
  }

  checkAnswer(): void {
    if (!this.groups.some(g => g.isSelected)) {
      this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
      return;
    }

    const selectedGroup = this.groups.find(g => g.isSelected);

    if (!selectedGroup) {
      this.fb.showFeedback('error', 'Lütfen en fazla top olan grubu seçin.');
      return;
    }

    if (selectedGroup.isCorrect) {
      this.gs.markCompleted(ID);
      this.hintService.resetErrors(ID);
      this.fb.showFeedback('success', 'Harika! En fazla top olan grubu doğru buldunuz.');
      this.persist();
    } else {
      this.isChecking = true;
      this.hintService.registerError(ID);
      selectedGroup.isWrong = true;
      this.persist(); // Öğrencinin işaretlediği grup, temizlenmeden önce kaydedilir (inceleme ekranı için).
      selectedGroup.isSelected = false; // Remove selection instantly
      this.fb.showFeedback('error', 'Bu grupta en fazla top yok. Tekrar deneyin!');

      setTimeout(() => {
        selectedGroup.isWrong = false;
        this.isChecking = false;
      }, 500);
    }
  }

  clearSelection(): void {
    this.groups.forEach(g => {
      g.isSelected = false;
      g.isWrong = false;
    });
    this.gs.clear(ID);
    this.hintService.resetErrors(ID);
  }

  goPrev(): void {
    this.router.navigate(['/fruit-count-matching']);
  }

  goNext(): void {
    if (!this.isNextUnlocked) return;
    this.router.navigate(['/shadow-matching']); // Next page
  }

}
