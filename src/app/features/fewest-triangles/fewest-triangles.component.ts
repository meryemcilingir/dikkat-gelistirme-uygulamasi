import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityService } from '../../core/services/activity.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { GameStateService } from '../../core/services/game-state.service';
import { HintService } from '../../core/services/hint.service';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';

interface TriangleBox {
  id: number;
  count: number;
  color: string;
}

const ID = 'fewest-triangles';

@Component({
  selector: 'app-fewest-triangles',
  standalone: true,
  imports: [CommonModule, ActivityHeaderComponent, ActionButtonsComponent, SharedFeedbackComponent],
  templateUrl: './fewest-triangles.component.html',
  styleUrl: './fewest-triangles.component.scss'
})
export class FewestTrianglesComponent {
  private activityService = inject(ActivityService);
  private feedbackService = inject(FeedbackService);
  private gameStateService = inject(GameStateService);
  private hintService = inject(HintService);

  isCompleted = false;
  selectedId: number | null = null;

  boxes: TriangleBox[] = [
    { id: 1, count: 8, color: '#6366f1' },
    { id: 2, count: 12, color: '#6366f1' },
    { id: 3, count: 4, color: '#6366f1' },
    { id: 4, count: 10, color: '#6366f1' },
  ];

  // The correct answer is the box with the fewest triangles
  get correctId(): number {
    const min = Math.min(...this.boxes.map(b => b.count));
    return this.boxes.find(b => b.count === min)!.id;
  }

  ngOnInit(): void {
    const saved = this.gameStateService.getData<any>(ID);
    if (saved) {
      this.selectedId = saved.selectedId ?? null;
      this.isCompleted = saved.isCompleted ?? false;
    }
  }

  selectBox(id: number): void {
    if (this.isCompleted) return;
    this.selectedId = this.selectedId === id ? null : id;
    this.persist();
  }

  onCheck(): void {
    if (this.selectedId === null) {
      this.feedbackService.showWrong();
      return;
    }
    if (this.selectedId === this.correctId) {
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
    this.selectedId = null;
    this.isCompleted = false;
    this.gameStateService.clear(ID);
  }

  getArray(n: number): number[] { return Array.from({ length: n }, (_, i) => i); }

  prev(): void { this.activityService.prev(); }
  next(): void { this.activityService.next(); }

  private persist(): void {
    this.gameStateService.save(ID, {
      selectedId: this.selectedId,
      isCompleted: this.isCompleted
    });
  }
}
