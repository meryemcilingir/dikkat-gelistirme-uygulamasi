import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';
import { ActivityService } from '../../core/services/activity.service';

export interface SportItem {
  id: number;
  name: string;
  emoji: string;
}

export interface ObjectItem {
  id: number;
  name: string;
  emoji: string;
  correctSportId: number;
  assignedSportId: number | null;
}

export interface SportMatchingState {
  assignments: { objectId: number; sportId: number | null }[];
  feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'sport-matching';

@Component({
  selector: 'app-sport-matching',
  standalone: true,
  imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent, SharedFeedbackComponent],
  templateUrl: './sport-matching.component.html',
  styleUrl: './sport-matching.component.scss'
})
export class SportMatchingComponent implements OnInit {

  sports: SportItem[] = [
    { id: 1, name: 'Tenis',      emoji: '🎾' },
    { id: 2, name: 'Okçuluk',    emoji: '🏹' },
    { id: 3, name: 'Basketbol',  emoji: 'svg:hoop' }, // Basketbol Potası (Hoop)
  ];

  objects: ObjectItem[] = [
    { id: 1, name: 'Basketbol Topu', emoji: '🏀', correctSportId: 3, assignedSportId: null },
    { id: 2, name: 'Hedef Tahtası',  emoji: '🎯', correctSportId: 2, assignedSportId: null },
    { id: 3, name: 'Tenis Topu',     emoji: '🎾', correctSportId: 1, assignedSportId: null },
  ];

  selectedObjectId: number | null = null;
  feedbackState: 'correct' | 'wrong' | null = null;

  constructor(
    private router: Router,
    private gs: GameStateService,
    private fb: FeedbackService,
    private hintService: HintService,
    private activityService: ActivityService
  ) {}

  get showHint(): boolean {
    return this.hintService.shouldShowHint(ID);
  }

  get isNextUnlocked(): boolean {
    return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
  }

  ngOnInit(): void {
    const saved = this.gs.getData<SportMatchingState>(ID);
    if (saved) {
      saved.assignments.forEach(a => {
        const obj = this.objects.find(o => o.id === a.objectId);
        if (obj) obj.assignedSportId = a.sportId;
      });
      this.feedbackState = saved.feedbackState;
    }
  }

  private persist(): void {
    this.gs.save(ID, {
      assignments: this.objects.map(o => ({ objectId: o.id, sportId: o.assignedSportId })),
      feedbackState: this.feedbackState
    });
  }

  selectObject(objectId: number): void {
    if (this.feedbackState === 'correct') return;
    this.selectedObjectId = this.selectedObjectId === objectId ? null : objectId;
  }

  assignToSport(sportId: number): void {
    if (this.feedbackState === 'correct') return;
    if (this.selectedObjectId === null) return;

    // Remove this sport from other objects
    this.objects.forEach(o => {
      if (o.assignedSportId === sportId) o.assignedSportId = null;
    });

    const obj = this.objects.find(o => o.id === this.selectedObjectId);
    if (obj) {
      obj.assignedSportId = sportId;
      this.feedbackState = null;
      this.selectedObjectId = null;
      this.persist();
    }
  }

  getSportForObject(objectId: number): SportItem | null {
    const obj = this.objects.find(o => o.id === objectId);
    if (!obj || obj.assignedSportId === null) return null;
    return this.sports.find(s => s.id === obj.assignedSportId) || null;
  }

  isSportAssigned(sportId: number): boolean {
    return this.objects.some(o => o.assignedSportId === sportId);
  }

  clearSelection(): void {
    this.objects.forEach(o => o.assignedSportId = null);
    this.selectedObjectId = null;
    this.feedbackState = null;
    this.gs.clear(ID);
    this.hintService.resetErrors(ID);
  }

  checkAnswer(): void {
    const allAssigned = this.objects.every(o => o.assignedSportId !== null);
    if (!allAssigned) {
      this.fb.showFeedback('error', 'Lütfen her nesneyi bir sporla eşleyin!');
      return;
    }

    const allCorrect = this.objects.every(o => o.assignedSportId === o.correctSportId);

    if (allCorrect) {
      this.feedbackState = 'correct';
      this.gs.markCompleted(ID);
      this.hintService.resetErrors(ID);
      this.fb.showFeedback('success', 'Tebrikler! Tüm sporları doğru eşledin! 🏆');
    } else {
      this.feedbackState = 'wrong';
      this.hintService.registerError(ID);
      this.fb.showFeedback('error', 'Yanlış eşleşme var! Hangi nesne hangi spora ait düşün.');
    }
    this.persist();
  }

  goPrev(): void {
    this.activityService.prev();
  }

  goNext(): void {
    if (!this.isNextUnlocked) return;
    this.activityService.next();
  }
}
