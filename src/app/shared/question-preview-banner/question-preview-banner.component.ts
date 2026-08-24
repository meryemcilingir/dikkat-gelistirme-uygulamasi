import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { QuestionPreviewService } from '../../core/services/question-preview.service';

/**
 * "Sınavda Gör" ile açılan soru önizlemesinde geri dönüş butonu. Sorunun
 * kendi component'ine hiç dokunmaz — yalnızca kendi konumunu ekran
 * genişliğine göre ayarlar.
 *
 * Masaüstünde (≥768px) sol üstte, sorunun `.frame-top` başlığının solunda
 * sabit küçük bir köşe butonu; `.page-frame` merkezde ve yanlarda boşluk
 * bıraktığı için içerikle çakışmaz.
 *
 * Dar ekranda (<768px) `.page-frame` tam genişlik olduğundan üstte yer
 * bırakmak soru başlığının üzerine biniyordu — bu yüzden mobilde buton
 * ekranın ALTINA, tam genişlikte sabit bir bar'a dönüşür. Önizleme
 * sırasında ActionButtonsComponent hiç render edilmediği için (bkz.
 * action-buttons.component.ts `*ngIf="!preview.active()"`) sorunun
 * `.frame-bottom` alanı (styles.scss) her zaman boş kalır — bar yalnızca o
 * boş alanın üzerine oturur. Sayfa kaydırıldığında son içeriğin bu bar'ın
 * altında kalmaması için body'ye ayrıca bir bottom padding ekleniyor (bkz.
 * app.ts `syncPreviewBodyClass` + styles.scss `body.preview-active`).
 */
@Component({
    selector: 'app-question-preview-banner',
    standalone: true,
    imports: [CommonModule],
    template: `
        <button class="preview-back-btn" *ngIf="preview.active()" (click)="preview.exit(router)">
            ← Sorulara Dön
        </button>
    `,
    styles: [`
        :host { display: contents; }

        .preview-back-btn {
            position: fixed;
            top: max(16px, env(safe-area-inset-top, 0px));
            left: max(16px, env(safe-area-inset-left, 0px));
            z-index: 9999;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            min-height: 44px;
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 9px 16px;
            font-family: 'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 0.84rem;
            font-weight: 600;
            color: #4b5563;
            cursor: pointer;
            box-shadow: 0 2px 10px rgba(17, 24, 39, 0.12);
            transition: border-color 150ms ease, color 150ms ease, background-color 150ms ease;
        }

        .preview-back-btn:hover {
            border-color: #d1d5db;
            color: #111827;
            background: #f9fafb;
        }

        // Mobil: köşe butonu yerine tam genişlik, alta sabit bir action bar.
        // Kırılım noktası 768px dahil mobil sayılır — soru çerçevesinin kendi
        // mobil kuralı da (styles.scss, $breakpoint-mobile) aynı sınırı
        // kullanıyor: 768px'te .frame-top tam genişliğe yayılıyor, üstte
        // kalan bir köşe butonu tam bu genişlikte başlık kartıyla çakışırdı.
        @media (max-width: 768px) {
            .preview-back-btn {
                top: auto;
                left: 0;
                right: 0;
                bottom: 0;
                width: 100%;
                min-height: 44px;
                border-radius: 0;
                border-left: none;
                border-right: none;
                border-bottom: none;
                padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
                box-shadow: 0 -2px 10px rgba(17, 24, 39, 0.12);
            }
        }
    `],
})
export class QuestionPreviewBannerComponent {
    preview = inject(QuestionPreviewService);
    router = inject(Router);
}
