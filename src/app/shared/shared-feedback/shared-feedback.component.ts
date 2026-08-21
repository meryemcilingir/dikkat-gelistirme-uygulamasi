import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FeedbackService } from '../../core/services/feedback.service';

@Component({
  selector: 'app-shared-feedback',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (fb.state().visible) {
      <div 
        class="complete-overlay" 
        [class.error]="fb.state().status === 'error'"
        (click)="fb.hideFeedback()"
        role="alert">
        {{ fb.state().message }}
      </div>
    }
  `,
  styles: [`
    @keyframes overlayPop {
      0%   { transform: translate(-50%,-50%) scale(.7); opacity: 0; }
      70%  { transform: translate(-50%,-50%) scale(1.05); }
      100% { transform: translate(-50%,-50%) scale(1); opacity: 1; }
    }

    .complete-overlay {
      position: fixed; 
      top: 50%; left: 50%;
      transform: translate(-50%,-50%);
      background: rgba(214,245,227,.95); 
      color: #276749;
      font-family: 'Nunito', sans-serif; 
      font-size: clamp(1rem, 2vw, 1.2rem); 
      font-weight: 900;
      padding: clamp(12px, 2.5vw, 18px) clamp(20px, 4vw, 32px); 
      border-radius: 18px;
      box-shadow: 0 8px 28px rgba(39,103,73,.18);
      text-align: center; 
      z-index: 9999;
      animation: overlayPop .4s cubic-bezier(.34,1.56,.64,1);
      cursor: pointer;
      max-width: 90vw;
      word-wrap: break-word;
    }

    .complete-overlay.error {
      background: rgba(255,243,205,.95); 
      color: #7a5800;
      box-shadow: 0 8px 28px rgba(122,88,0,.18);
    }
  `]
})
export class SharedFeedbackComponent {
  constructor(public fb: FeedbackService) { }
}
