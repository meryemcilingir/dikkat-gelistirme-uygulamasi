import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Ortak sayfalama footer'ı — tablonun ALTINDA kullanılır, tek satırda:
 * solda kayıt aralığı ("1–25 / 86 kayıt"), sağda "Sayfa başına" seçimi +
 * gerçek sayfa navigasyonu (‹ 1 2 3 4 ›). Server-side pagination varsayar:
 * bu component veri çekmez, yalnızca `pageChange`/`pageSizeChange` ile
 * istenen sayfa/boyutu dışarı bildirir — yükleme sorumluluğu ebeveyn
 * component'te (mevcut reload/reloadX metodu) kalır.
 */
@Component({
    selector: 'app-pagination',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './pagination.component.html',
    styleUrl: './pagination.component.scss',
})
export class PaginationComponent {
    @Input() page = 1;
    @Input() totalPages = 1;
    @Input() total = 0;
    @Input() pageSize = 25;
    @Input() pageSizeOptions: number[] = [10, 25, 50, 100];

    @Output() pageChange = new EventEmitter<number>();
    @Output() pageSizeChange = new EventEmitter<number>();

    rangeLabel(): string {
        if (this.total === 0) return '0 kayıt';
        const from = (this.page - 1) * this.pageSize + 1;
        const to = Math.min(this.page * this.pageSize, this.total);
        return `${from}–${to} / ${this.total} kayıt`;
    }

    onPageSizeChange(size: number): void {
        this.pageSizeChange.emit(size);
    }

    /** Aktif sayfa etrafında pencere + uçlarda gerektiğinde "…" gösterir. */
    pageList(): (number | '...')[] {
        const total = this.totalPages;
        const current = this.page;
        if (total <= 7) {
            return Array.from({ length: total }, (_, i) => i + 1);
        }

        const span = 1;
        const start = Math.max(2, current - span);
        const end = Math.min(total - 1, current + span);

        const pages: (number | '...')[] = [1];
        if (start > 2) pages.push('...');
        for (let i = start; i <= end; i++) pages.push(i);
        if (end < total - 1) pages.push('...');
        pages.push(total);
        return pages;
    }

    trackByIndex(i: number): number {
        return i;
    }

    go(n: number | '...'): void {
        if (n === '...' || n === this.page || n < 1 || n > this.totalPages) return;
        this.pageChange.emit(n);
    }
}
