import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ExamSessionService } from './exam-session.service';

/**
 * GameStateService – Her etkinliğin tam durumunu hafızada tutar.
 * Sayfa geçişleri arasında seçimler, doldurulmuş alanlar ve
 * tamamlanma durumu korunur.
 *
 * Etkinlik ID'leri:
 *   'pattern'         → Deseni Kopyala
 *   'odd-direction'   → Ters Yöne Bakanı Bul
 *   'shade-sorting'   → Açıktan Koyuya Sıralama
 *   'number-sequence' → Sayının Öncesi ve Sonrası
 *   'symbol-matching' → Benzer Sembolü Bul
 */
@Injectable({ providedIn: 'root' })
export class GameStateService {
    private examSession = inject(ExamSessionService);
    private router = inject(Router);

    private store = new Map<string, { isCompleted: boolean; data: unknown }>();

    // ── Okuma ─────────────────────────────────────────────

    /** Etkinlik tamamlandı mı? */
    isCompleted(id: string): boolean {
        return this.store.get(id)?.isCompleted ?? false;
    }

    /** Kaydedilmiş veriyi döndürür; yoksa null */
    getData<T>(id: string): T | null {
        const entry = this.store.get(id);
        return entry ? (entry.data as T) : null;
    }

    // ── Yazma ─────────────────────────────────────────────

    /** Anlık durum (data) + tamamlanma bayrağını kaydeder */
    save(id: string, data: unknown, isCompleted = false): void {
        const prev = this.store.get(id);
        this.store.set(id, {
            isCompleted: isCompleted || (prev?.isCompleted ?? false),
            data,
        });
    }

    /** Etkinliği tamamlandı olarak işaretler (data aynı kalır) */
    markCompleted(id: string): void {
        const prev = this.store.get(id);
        this.store.set(id, { isCompleted: true, data: prev?.data ?? null });
        // Öğrenci sınav modundaysa: doğru/yanlış görseli boyanmadan ÖNCE (aynı senkron
        // tick içinde) opak katmanı devreye sokar, böylece öğrenci sonucu göremez.
        this.examSession.beginSubmitIfActive(id);
        // setTimeout(0): component'in markCompleted() sonrası aynı fonksiyon içinde
        // yaptığı son persist() çağrısı (ör. feedbackState='correct') tamamlansın diye
        // bir sonraki tick'e ertelenir; böylece backend'e en güncel veri gider.
        setTimeout(() => {
            this.examSession.recordSuccess(id, this.store.get(id)?.data ?? null, this.router);
        }, 0);
    }

    /** Etkinliğin tüm durumunu siler → sıfırlama */
    clear(id: string): void {
        this.store.delete(id);
    }
}
