import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Yönetici panelinden "Sınavda Gör" ile bir soru component'inin gerçek,
 * canlı sayfasına gidildiğinde geri dönüş yolu sağlar. Bu rotalar öğrenci
 * sınav akışının parçası olduğu için kendi başlarına bir "geri" butonu
 * içermez (bkz. app.routes.ts: admin/öğretmen bu rotalara serbestçe girebilir
 * ama chrome'suz, çıplak component render edilir).
 *
 * ReviewModeService'ten kasıtlı olarak AYRI: o gerçek bir öğrencinin geçmiş
 * cevabını "kağıt inceler gibi" gösterir (Sınav İncelemesi metni/rozetleri
 * doğru); bu servis ise sorunun kendisini, hiçbir cevap enjekte etmeden,
 * olduğu gibi önizlemek için — farklı bir amaç, farklı metin.
 */
@Injectable({ providedIn: 'root' })
export class QuestionPreviewService {
    private readonly _active = signal(false);
    readonly active = this._active.asReadonly();

    private returnPath: string[] = ['/admin/questions'];

    enter(returnPath: string[] = ['/admin/questions']): void {
        this.returnPath = returnPath;
        this._active.set(true);
    }

    exit(router: Router): void {
        this._active.set(false);
        router.navigate(this.returnPath);
    }
}
