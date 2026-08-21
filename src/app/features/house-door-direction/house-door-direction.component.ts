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

interface HouseOption {
  id: number;
  doorPosition: 'left' | 'center' | 'right';
  isCorrect: boolean;
  color: string;
}

const ID = 'house-door-direction';

@Component({
  selector: 'app-house-door-direction',
  standalone: true,
  imports: [CommonModule, ActivityHeaderComponent, ActionButtonsComponent, SharedFeedbackComponent],
  templateUrl: './house-door-direction.component.html',
  styleUrl: './house-door-direction.component.scss'
})
export class HouseDoorDirectionComponent implements OnInit {
  private router = inject(Router);
  private activityService = inject(ActivityService);
  private feedbackService = inject(FeedbackService);
  private gameStateService = inject(GameStateService);
  private hintService = inject(HintService);

  isCompleted = false;
  checkAlwaysDisabled = false;

  houses: HouseOption[] = [
    { id: 1, doorPosition: 'left', isCorrect: false, color: '#48cfad' },
    { id: 2, doorPosition: 'right', isCorrect: false, color: '#ed5565' },
    { id: 3, doorPosition: 'center', isCorrect: true, color: '#ffe0b2' },
    { id: 4, doorPosition: 'left', isCorrect: false, color: '#ed5565' },
    { id: 5, doorPosition: 'right', isCorrect: false, color: '#ffe0b2' },
    { id: 6, doorPosition: 'left', isCorrect: false, color: '#48cfad' },
  ];

  selectedHouseId: number | null = null;

  ngOnInit(): void {
    // Shuffle slightly but ensure one center is present
    this.houses = this.shuffle(this.houses);
    
    const savedData = this.gameStateService.getData<any>(ID);
    if (savedData) {
      this.isCompleted = savedData.isCompleted;
      this.selectedHouseId = savedData.selectedHouseId;
    }
  }

  private shuffle(array: any[]) {
    return array.sort(() => Math.random() - 0.5);
  }

  selectHouse(id: number): void {
    if (this.isCompleted) return;
    this.selectedHouseId = this.selectedHouseId === id ? null : id;
    this.persist();
  }

  private persist(): void {
    this.gameStateService.save(ID, { isCompleted: this.isCompleted, selectedHouseId: this.selectedHouseId });
  }

  onReset(): void {
    this.isCompleted = false;
    this.selectedHouseId = null;
    this.gameStateService.clear(ID);
  }

  onCheck(): void {
    if (this.selectedHouseId === null) return;

    const selected = this.houses.find(h => h.id === this.selectedHouseId);
    if (selected?.isCorrect) {
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
