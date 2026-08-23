import { Directive, HostListener } from '@angular/core';

/**
 * Sayı bekleyen soru input'larına eklenir (`inputmode="numeric"` yalnızca
 * mobil klavyeyi etkiliyor, fiziksel klavyeden harf girilmesini engellemiyordu).
 * Rakam olmayan tuş basımlarını ve yapıştırılan metindeki rakam olmayan
 * karakterleri engeller; ok tuşları, Backspace, Delete, Tab ve Ctrl/Cmd
 * kombinasyonları (kopyala/yapıştır/tümünü seç) serbest bırakılır.
 */
@Directive({
    selector: 'input[appNumericOnly]',
    standalone: true,
})
export class NumericOnlyDirective {
    private readonly allowedKeys = new Set([
        'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End',
    ]);

    @HostListener('keydown', ['$event'])
    onKeyDown(event: KeyboardEvent): void {
        if (this.allowedKeys.has(event.key)) return;
        if (event.ctrlKey || event.metaKey) return;
        if (!/^[0-9]$/.test(event.key)) {
            event.preventDefault();
        }
    }

    @HostListener('paste', ['$event'])
    onPaste(event: ClipboardEvent): void {
        const text = event.clipboardData?.getData('text') ?? '';
        if (/[^0-9]/.test(text)) {
            event.preventDefault();
            const input = event.target as HTMLInputElement;
            const digitsOnly = text.replace(/[^0-9]/g, '');
            const start = input.selectionStart ?? input.value.length;
            const end = input.selectionEnd ?? input.value.length;
            input.setRangeText(digitsOnly, start, end, 'end');
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    // Sürükle-bırak, otomatik doldurma veya klavye/işletim sistemi kaynaklı
    // (keydown'ı atlayan) diğer ekleme yollarına karşı ek güvenlik: değer
    // her değiştiğinde rakam olmayan karakter varsa temizlenir.
    @HostListener('input', ['$event'])
    onInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!/[^0-9]/.test(input.value)) return;
        const cleaned = input.value.replace(/[^0-9]/g, '');
        const pos = (input.selectionStart ?? cleaned.length) - (input.value.length - cleaned.length);
        input.value = cleaned;
        input.setSelectionRange(pos, pos);
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }
}
