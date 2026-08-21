import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Ayarlar (/admin/settings). Yalnızca gerçekten var olan hesap bilgilerini
 * ve mevcut şifre değiştirme akışını gösterir — backend'de karşılığı
 * olmayan bildirim/entegrasyon gibi ayarlar burada UYDURULMAZ.
 */
@Component({
    selector: 'app-admin-settings',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './admin-settings.component.html',
    styleUrl: './admin-settings.component.scss',
})
export class AdminSettingsComponent {
    private auth = inject(AuthService);

    readonly user = this.auth.currentUser();

    openChangePassword(): void {
        this.auth.openChangePassword();
    }
}
