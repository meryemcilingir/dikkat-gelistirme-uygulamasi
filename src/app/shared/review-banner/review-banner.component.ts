import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReviewModeService } from '../../core/services/review-mode.service';

/**
 * Öğretmenin sınav inceleme kabuğu: üst başlık, sağ bilgi paneli ve alt
 * gezinme çubuğu. Sorunun kendisini HİÇ render etmez — mevcut question
 * component `<router-outlet>` üzerinden aynı şekilde ve app-root'un doğrudan
 * çocuğu olarak render edilmeye devam eder (bkz. app.html/styles.scss); bu
 * component yalnızca onun etrafına yerleşir. `:host { display: contents }`
 * sayesinde header/aside/footer, app-root'ta tanımlı (.review-active, bkz.
 * app.scss) grid'in doğrudan hücrelerine (grid-area) yerleşir.
 */
@Component({
    selector: 'app-review-banner',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './review-banner.component.html',
    styleUrl: './review-banner.component.scss',
})
export class ReviewBannerComponent {
    private router = inject(Router);
    reviewMode = inject(ReviewModeService);

    prev(): void { this.reviewMode.prev(this.router); }
    next(): void { this.reviewMode.next(this.router); }
    exit(): void { this.reviewMode.exit(this.router); }

    /** "3 dk 12 sn" / "45 sn" formatında gösterir; eski kayıtlarda süre yoksa "—". */
    formatDuration(seconds: number | null | undefined): string {
        if (seconds === null || seconds === undefined) return '—';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins === 0) return `${secs} sn`;
        return `${mins} dk ${secs} sn`;
    }
}
