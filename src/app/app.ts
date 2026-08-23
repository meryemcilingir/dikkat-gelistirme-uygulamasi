import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SharedFeedbackComponent } from './shared/shared-feedback/shared-feedback.component';
import { ReviewBannerComponent } from './shared/review-banner/review-banner.component';
import { QuestionPreviewBannerComponent } from './shared/question-preview-banner/question-preview-banner.component';
import { SessionBarComponent } from './shared/session-bar/session-bar.component';
import { ExamSubmitOverlayComponent } from './shared/exam-submit-overlay/exam-submit-overlay.component';
import { LogoutConfirmComponent } from './shared/logout-confirm/logout-confirm.component';
import { ChangePasswordComponent } from './shared/change-password/change-password.component';
import { ReviewModeService } from './core/services/review-mode.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    SharedFeedbackComponent,
    ReviewBannerComponent,
    QuestionPreviewBannerComponent,
    SessionBarComponent,
    ExamSubmitOverlayComponent,
    LogoutConfirmComponent,
    ChangePasswordComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  host: {
    '[class.review-active]': 'reviewMode.active()',
  },
})
export class App {
  reviewMode = inject(ReviewModeService);

  // review-active grid'i 1400px'de ortalandığı için yanlarda kalan boşluk
  // öğrenci sınavının pastel arka planı yerine nötr olsun — yalnızca
  // inceleme modunda; öğrenci ekranının body arka planı hiç değişmez.
  private readonly syncReviewBodyClass = effect(() => {
    document.body.classList.toggle('review-active', this.reviewMode.active());
  });
}
