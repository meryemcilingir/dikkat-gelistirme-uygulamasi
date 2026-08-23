import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of } from 'rxjs';

/**
 * Sınavın 150 soru component'i lazy-loaded (her biri ayrı JS chunk'ı) — bu
 * yüzden bir öğrenci cevap gönderdiğinde bir sonraki soru chunk'ı ilk kez
 * indiriliyorsa gözle görülür bir gecikme/boşluk oluşuyordu. Yönetici/öğretmen
 * panelinin (çok daha ağır) chunk'larını öğrenci hiç ziyaret etmeyeceği için
 * onları preload ETMİYORUZ — yalnızca `data.preload` işaretli examRoutes
 * arkaplanda, uygulama açılır açılmaz indirilir.
 */
@Injectable({ providedIn: 'root' })
export class ExamPreloadStrategy implements PreloadingStrategy {
    preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
        return route.data?.['preload'] ? load() : of(null);
    }
}
