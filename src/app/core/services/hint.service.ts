import { Injectable, inject } from '@angular/core';
import { GameStateService } from './game-state.service';
import { AuthService } from './auth.service';

interface HintState {
    errorCount: number;
}

/**
 * HintService - Merkezi hata sayımı ve ipucu gösterimi tetikleyicisi.
 * GameStateService kullanarak veriyi sayfalar arasında kalıcı hale getirir.
 *
 * Not: Bu servis yalnızca hata SAYAR (ipucu eşiği için). Öğrenci sınav modunda
 * "Gönder" sonrası sonuçlandırma ActionButtonsComponent tarafından yönetilir —
 * bazı etkinlik türleri (checkAlwaysDisabled) seçim anında registerError'ı
 * defalarca/erken çağırabildiği için buradan doğrudan sınavı ilerletmek,
 * öğrenci "Gönder"e basmadan bir sonraki soruya atlamasına yol açardı.
 */
@Injectable({
    providedIn: 'root'
})
export class HintService {
    private readonly HINT_THRESHOLD = 2;
    private auth = inject(AuthService);

    constructor(private gs: GameStateService) { }

    private getHintKey(gameId: string): string {
        return `${gameId}-hint`;
    }

    /**
     * İlgili oyun için hata sayısını 1 artırır ve güncel sayıyı döndürür.
     */
    registerError(gameId: string): number {
        const key = this.getHintKey(gameId);
        const state = this.gs.getData<HintState>(key);
        const currentCount = state?.errorCount ?? 0;

        const newCount = currentCount + 1;
        this.gs.save(key, { errorCount: newCount });

        return newCount;
    }

    /**
     * İlgili oyun için mevcut hata sayısını döndürür.
     */
    getErrorCount(gameId: string): number {
        const key = this.getHintKey(gameId);
        const state = this.gs.getData<HintState>(key);
        return state?.errorCount ?? 0;
    }

    /**
     * Hata sayısına göre ipucu gösterilip gösterilmeyeceğini kontrol eder.
     * Öğrenci sınav modundayken ipucu HİÇ gösterilmez — doğru cevabı görsel
     * olarak ele vermek sınav puanlamasının anlamını yitirmesine yol açar.
     */
    shouldShowHint(gameId: string): boolean {
        if (this.auth.currentUser()?.role === 'student') return false;
        return this.getErrorCount(gameId) >= this.HINT_THRESHOLD;
    }

    /**
     * İlgili oyunun hata sayısını sıfırlar (oyun sıfırlandığında vb. kullanılır).
     */
    resetErrors(gameId: string): void {
        const key = this.getHintKey(gameId);
        // Hata sayısını sıfırla ama kaydı tamamen silmek istersen gs.clear kullanabilirsin.
        this.gs.save(key, { errorCount: 0 });
    }
}
