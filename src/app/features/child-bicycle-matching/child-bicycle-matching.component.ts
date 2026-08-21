import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ActivityService } from '../../core/services/activity.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { GameStateService } from '../../core/services/game-state.service';
import { HintService } from '../../core/services/hint.service';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';

interface MatchItem {
  id: number;
  label: string;
  emoji: string;
  color: string;
  type: 'child' | 'bicycle';
  correctPairId: number;
  assignedPairId: number | null;
}

const ID = 'child-bicycle-matching';

@Component({
  selector: 'app-child-bicycle-matching',
  standalone: true,
  imports: [CommonModule, ActivityHeaderComponent, ActionButtonsComponent, SharedFeedbackComponent],
  templateUrl: './child-bicycle-matching.component.html',
  styleUrl: './child-bicycle-matching.component.scss'
})
export class ChildBicycleMatchingComponent implements OnInit {
  private router = inject(Router);
  private activityService = inject(ActivityService);
  private feedbackService = inject(FeedbackService);
  private gameStateService = inject(GameStateService);
  private hintService = inject(HintService);

  isCompleted = false;
  checkAlwaysDisabled = false;

  children: MatchItem[] = [
    { id: 1, label: 'Burak bisiklet sürüyor.', emoji: '', color: '#48cfad', type: 'child', correctPairId: 5, assignedPairId: null },
    { id: 2, label: 'Yıldız tenis oynuyor.', emoji: '', color: '#ed5565', type: 'child', correctPairId: 6, assignedPairId: null },
    { id: 3, label: 'Berrin basketbol oynuyor.', emoji: '', color: '#ffce54', type: 'child', correctPairId: 4, assignedPairId: null }
  ];

  bicycles: MatchItem[] = [
    { id: 4, label: 'basketbol topu', emoji: '🏀', color: '#ffce54', type: 'bicycle', correctPairId: 3, assignedPairId: null },
    { id: 5, label: 'bisiklet', emoji: '🚲', color: '#48cfad', type: 'bicycle', correctPairId: 1, assignedPairId: null },
    { id: 6, label: 'tenis', emoji: '🎾', color: '#ed5565', type: 'bicycle', correctPairId: 2, assignedPairId: null }
  ];

  selectedChildId: number | null = null;
  selectedBicycleId: number | null = null;

  ngOnInit(): void {
    const savedData = this.gameStateService.getData<any>(ID);
    if (savedData) {
      this.isCompleted = savedData.isCompleted;
      if (savedData.assignments) {
        savedData.assignments.forEach((a: { childId: number; pairId: number | null }) => {
          const child = this.children.find(c => c.id === a.childId);
          if (child) child.assignedPairId = a.pairId;
          if (a.pairId !== null) {
            const bike = this.bicycles.find(b => b.id === a.pairId);
            if (bike) bike.assignedPairId = a.childId;
          }
        });
      }
    }
  }

  private persist(): void {
    this.gameStateService.save(ID, {
      isCompleted: this.isCompleted,
      assignments: this.children.map(c => ({ childId: c.id, pairId: c.assignedPairId }))
    });
  }

  selectChild(id: number): void {
    if (this.isCompleted) return;
    this.selectedChildId = this.selectedChildId === id ? null : id;
    this.checkAutoMatch();
  }

  selectBicycle(id: number): void {
    if (this.isCompleted) return;
    this.selectedBicycleId = this.selectedBicycleId === id ? null : id;
    this.checkAutoMatch();
  }

  private checkAutoMatch(): void {
    if (this.selectedChildId !== null && this.selectedBicycleId !== null) {
      const child = this.children.find(c => c.id === this.selectedChildId);
      const bike = this.bicycles.find(b => b.id === this.selectedBicycleId);

      if (child && bike) {
        // Clear previous assignments for these items
        this.children.forEach(c => { if (c.assignedPairId === this.selectedBicycleId) c.assignedPairId = null; });
        this.bicycles.forEach(b => { if (b.assignedPairId === this.selectedChildId) b.assignedPairId = null; });

        child.assignedPairId = this.selectedBicycleId;
        bike.assignedPairId = this.selectedChildId;
      }

      this.selectedChildId = null;
      this.selectedBicycleId = null;
      this.persist();
    }
  }

  /** Eşleşilen karşı öğenin kısa etiketini döndürür — öğretmen incelemesinde hangi kartın hangisiyle eşleştiğini göstermek için. */
  getPartnerLabel(item: MatchItem): string | null {
    if (item.assignedPairId === null) return null;
    const list = item.type === 'child' ? this.bicycles : this.children;
    const partner = list.find(x => x.id === item.assignedPairId);
    if (!partner) return null;
    return partner.emoji ? `${partner.emoji} ${partner.label}` : partner.label;
  }

  onReset(): void {
    this.isCompleted = false;
    this.children.forEach(c => c.assignedPairId = null);
    this.bicycles.forEach(b => b.assignedPairId = null);
    this.selectedChildId = null;
    this.selectedBicycleId = null;
    this.gameStateService.clear(ID);
  }

  onCheck(): void {
    const allMatched = this.children.every(c => c.assignedPairId !== null);
    if (!allMatched) {
      this.feedbackService.showWrong();
      return;
    }

    const allCorrect = this.children.every(c => c.assignedPairId === c.correctPairId);
    if (allCorrect) {
      this.isCompleted = true;
      this.feedbackService.showCorrect();
      this.gameStateService.markCompleted(ID);
    } else {
      this.feedbackService.showWrong();
      this.hintService.registerError(ID);
    }
    this.persist();
  }

  prev(): void { this.activityService.prev(); }
  next(): void { this.activityService.next(); }
}
