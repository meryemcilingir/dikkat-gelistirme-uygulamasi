import { AfterViewInit, Directive, ElementRef } from '@angular/core';

/**
 * `.action-menu-dropdown`'ların tablo satırlarındaki "⋯" menüsüne eklenir.
 * Sorun: dropdown, `.table-scroll`'un `overflow-x: auto`'su yüzünden (bu,
 * CSS'te otomatik olarak overflow-y'yi de clip eder) — özellikle az satırlı
 * (ör. tek satırlık) tablolarda alta taşan kısmı kesiliyordu. Çözüm:
 * dropdown'ı `position: fixed` yapıp tetikleyici butonun gerçek ekran
 * konumuna göre konumlandırıyoruz — bu, tüm overflow:hidden/auto ata
 * elemanlarını (transform/filter olmadığı sürece) tamamen atlar.
 */
@Directive({
    selector: '[appFloatingMenu]',
    standalone: true,
})
export class FloatingMenuDirective implements AfterViewInit {
    constructor(private el: ElementRef<HTMLElement>) { }

    ngAfterViewInit(): void {
        const el = this.el.nativeElement;
        const anchor = el.previousElementSibling as HTMLElement | null;
        if (!anchor) return;

        const rect = anchor.getBoundingClientRect();
        el.style.position = 'fixed';
        el.style.right = 'auto';
        el.style.top = `${rect.bottom + 4}px`;

        // Önce sağa hizala (buton hizasında), sonra viewport dışına taşıyorsa
        // ekranın sağından biraz içeri çek.
        const menuWidth = el.offsetWidth || 170;
        let left = rect.right - menuWidth;
        if (left < 8) left = 8;
        if (left + menuWidth > window.innerWidth - 8) left = window.innerWidth - menuWidth - 8;
        el.style.left = `${left}px`;

        // Buton altında yeterli yer yoksa (ekranın alt kenarına yakınsa) yukarı aç.
        if (rect.bottom + 200 > window.innerHeight) {
            el.style.top = `${rect.top - 4}px`;
            el.style.transform = 'translateY(-100%)';
        }
    }
}
