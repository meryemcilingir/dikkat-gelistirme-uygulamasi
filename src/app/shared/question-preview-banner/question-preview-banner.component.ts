import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { QuestionPreviewService } from '../../core/services/question-preview.service';

/**
 * "Sınavda Gör" ile açılan soru önizlemesinin üstünde duran tek amaçlı geri
 * dönüş butonu. Sorunun kendi component'ine hiç dokunmaz — yalnızca üstüne
 * sabit konumlu küçük bir kontrol bindirir.
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
            top: 16px;
            left: 16px;
            z-index: 9999;
            display: inline-flex;
            align-items: center;
            gap: 6px;
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
    `],
})
export class QuestionPreviewBannerComponent {
    preview = inject(QuestionPreviewService);
    router = inject(Router);
}
