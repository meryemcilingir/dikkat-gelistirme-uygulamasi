import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ExamSessionService } from '../../core/services/exam-session.service';
import { HintService } from '../../core/services/hint.service';
import { GameStateService } from '../../core/services/game-state.service';
import { ReviewModeService } from '../../core/services/review-mode.service';
import { QuestionPreviewService } from '../../core/services/question-preview.service';

/**
 * ActionButtonsComponent – Tüm etkinlik sayfalarında ortak kullanılan
 * "Baştan Başla" ve "Kontrol Et" butonları.
 *
 * Öğrenci sınav modundayken (rol === 'student') farklı davranır:
 * "Baştan Başla" (tekrar deneme) gizlenir, tek buton "Gönder" olarak gösterilir —
 * öğrenci cevabını gördükten sonra değiştirip tekrar deneyemez, doğru/yanlış
 * bilgisini de görmez (bu servis katmanında ayrıca gizlenir).
 *
 * Sınavın bir sonraki soruya geçmesi YALNIZCA bu "Gönder" tıklamasının sonucuna
 * göre tetiklenir (checkAlwaysDisabled etkinliklerde bu buton hiç gösterilmediği
 * için o tür etkinliklerde ilerleme yalnızca doğru tamamlanınca olur — bkz. altta).
 *
 * Admin panelinden "Sınavda Gör" ile açılan önizlemede (QuestionPreviewService.active())
 * bu butonlar hiç gösterilmez — o mod yalnızca sorunun görünümünü incelemek içindir.
 *
 * @Input  isCompleted         – true ise Kontrol Et disabled olur
 * @Input  checkAlwaysDisabled – shade-sorting gibi otomatik kontrollü
 *                               sayfalarda Kontrol Et daima disabled
 * @Output reset               – Baştan Başla tıklandığında yayılır
 * @Output check               – Kontrol Et / Gönder tıklandığında yayılır
 */
@Component({
    selector: 'app-action-buttons',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="action-buttons" [class.student-exam-actions]="isStudent" *ngIf="!reviewMode.active() && !preview.active()">
            <button
                *ngIf="!isStudent"
                class="btn btn-clear"
                (click)="reset.emit()"
            >
                <span class="material-icons btn-icon">refresh</span> Baştan Başla
            </button>
            <!-- Mobilde sağ üstteki sabit "Çıkış Yap" gizlenir (bkz. session-bar.component.scss);
                 yerine bu satırda, Gönder'in solunda ghost bir buton olarak görünür.
                 Masaüstünde .btn-exit { display:none } — çift buton olmasın. -->
            <button
                *ngIf="isStudent"
                type="button"
                class="btn-exit"
                (click)="onExitClick()"
            >
                Çıkış Yap
            </button>
            <button
                class="btn btn-check"
                (click)="onCheckClick()"
                [disabled]="isCompleted || checkAlwaysDisabled || (isStudent && examSession.submitting())"
            >
                <span class="material-icons btn-icon">{{ isStudent ? 'send' : 'check_circle' }}</span>
                {{ isStudent ? 'Gönder' : 'Kontrol Et' }}
            </button>
        </div>
    `,
    // Angular custom element'i varsayılan olarak "inline" — bu yüzden içindeki
    // .action-buttons'un width:100% (bkz. styles.scss .student-exam-actions)
    // kuralı, host kendisi shrink-to-fit kaldığı için hiç etkili olmuyordu.
    // Host'u block+tam genişlik yapmak masaüstünde görünümü değiştirmez
    // (içerik zaten .frame-bottom'un tüm genişliğinde ortalanıyordu).
    styles: [`
        :host {
            display: block;
            width: 100%;
        }
    `],
})
export class ActionButtonsComponent {
    private auth = inject(AuthService);
    private router = inject(Router);
    private hintService = inject(HintService);
    private gameStateService = inject(GameStateService);
    examSession = inject(ExamSessionService);
    reviewMode = inject(ReviewModeService);
    preview = inject(QuestionPreviewService);

    /** Oyun tamamlandığında Kontrol Et kilitlenir */
    @Input() isCompleted = false;

    /** Otomatik-kontrollü sayfalarda (shade-sorting) Kontrol Et daima kapalı */
    @Input() checkAlwaysDisabled = false;

    /** Baştan Başla tıklandı */
    @Output() reset = new EventEmitter<void>();

    /** Kontrol Et / Gönder tıklandı */
    @Output() check = new EventEmitter<void>();

    get isStudent(): boolean {
        return this.auth.currentUser()?.role === 'student';
    }

    /** Mobil alt bar'daki "Çıkış Yap" — session-bar'daki butonla AYNI onay akışını tetikler. */
    onExitClick(): void {
        this.auth.requestLogout();
    }

    onCheckClick(): void {
        if (!this.isStudent) {
            this.check.emit();
            return;
        }

        const path = this.router.url.split('/').filter(Boolean).pop() || '';
        const errorsBefore = this.hintService.getErrorCount(path);

        // Etkinliğin kendi checkX() metodu burada senkron olarak çalışır; doğruysa
        // GameStateService.markCompleted, yanlışsa HintService.registerError çağırır.
        this.check.emit();

        if (this.gameStateService.isCompleted(path)) {
            return; // Doğru: GameStateService.markCompleted zaten sonuçlandırıp ilerletti.
        }

        const errorsAfter = this.hintService.getErrorCount(path);
        if (errorsAfter > errorsBefore) {
            // Bu tıklamayla gerçek bir yanlış cevap kaydedildi (yalnızca doğrulama
            // uyarısı değil, ör. "önce bir seçim yap") → sonuçlandır ve ilerlet.
            this.examSession.recordWrongAttempt(path, this.gameStateService.getData(path), this.router);
        }
        // Değişmediyse: checkX() bir şey sonuçlandırmadı (ör. eksik seçim uyarısı),
        // öğrenci düzeltip tekrar "Gönder"e basabilir.
    }
}
