import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityService } from '../../core/services/activity.service';

@Component({
    selector: 'app-activity-header',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="header-container">
      <!-- Linear Progress Bar -->
      <div class="progress-container">
        <div class="progress-bar" [style.width.%]="activityService.progress$ | async"></div>
      </div>

      <div class="instruction-card">
        <!-- Question Number -->
        <div class="question-number">
          {{ activityService.questionNumber$ | async }}.
        </div>

        <!-- Emojis (Optional depending on space) -->
        <div class="instruction-icons" *ngIf="icons" aria-hidden="true">
          {{ icons }}
        </div>

        <!-- Instruction Text -->
        <div class="instruction-text">
          <h1>{{ instruction }}</h1>
        </div>

        <!-- x/50 Indicator -->
        <div class="progress-counter">
          {{ (activityService.currentIndex$ | async)! + 1 }}/{{ activityService.totalActivities }}
        </div>
      </div>
    </div>
  `,
    styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .header-container {
      display: flex;
      flex-direction: column;
      gap: clamp(6px, 1.5vw, 12px);
      width: 100%;
    }

    .progress-container {
      width: 100%;
      height: clamp(5px, 1vw, 8px);
      background: #e0e7ff;
      border-radius: 4px;
      overflow: hidden;
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
    }

    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #6366f1, #a855f7);
      border-radius: 4px;
      transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .instruction-card {
      background: #ffffff;
      border-radius: clamp(24px, 5vw, 50px);
      box-shadow: 0 4px 0 #ffe5ce, 0 8px 18px rgba(255, 166, 35, .18);
      padding: clamp(8px, 1.5vw, 12px) clamp(14px, 3vw, 28px);
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: clamp(8px, 1.5vw, 14px);
      width: 100%;
      position: relative;
    }

    .question-number {
      font-family: 'Baloo 2', 'Nunito', sans-serif;
      font-size: clamp(1.3rem, 3vw, 2rem);
      font-weight: 900;
      color: #6366f1;
      flex-shrink: 0;
    }

    .instruction-icons {
      font-size: clamp(1.2rem, 2.5vw, 1.8rem);
      flex-shrink: 0;
      display: flex;
      gap: 5px;

      @media (max-width: 480px) {
        display: none;
      }
    }

    .instruction-text {
      font-family: 'Baloo 2', 'Nunito', sans-serif;
      font-size: clamp(0.95rem, 2vw, 1.4rem);
      font-weight: 800;
      color: #3a3a5c;
      margin: 0;
      line-height: 1.2;
      text-align: center;
      flex: 1;
      min-width: 0;

      h1 {
        font-family: inherit;
        font-size: inherit;
        font-weight: inherit;
        color: inherit;
        margin: 0;
      }
    }

    .progress-counter {
      font-family: 'Baloo 2', 'Nunito', sans-serif;
      font-size: clamp(0.85rem, 1.5vw, 1.2rem);
      font-weight: 800;
      color: #8b8fb9;
      background: #f0f2ff;
      padding: clamp(4px, 0.8vw, 6px) clamp(10px, 2vw, 16px);
      border-radius: 20px;
      flex-shrink: 0;
      white-space: nowrap;
    }
  `]
})
export class ActivityHeaderComponent {
    @Input() instruction: string = '';
    @Input() icons: string = '';

    activityService = inject(ActivityService);
}
