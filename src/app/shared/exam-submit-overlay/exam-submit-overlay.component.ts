import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExamSessionService } from '../../core/services/exam-session.service';

/**
 * Öğrenci "Gönder"e bastığı an, altındaki oyun component'i kendi doğru/yanlış
 * görselini boyamadan önce ekranı tamamen kapatan opak katman. Doğru/yanlış
 * bilgisi burada da GÖSTERİLMEZ — sadece nötr bir "gönderildi" mesajı vardır.
 */
@Component({
    selector: 'app-exam-submit-overlay',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './exam-submit-overlay.component.html',
    styleUrl: './exam-submit-overlay.component.scss',
})
export class ExamSubmitOverlayComponent {
    examSession = inject(ExamSessionService);
}
