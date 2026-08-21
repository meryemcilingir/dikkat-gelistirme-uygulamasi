import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

/** Çıkış yapmadan önce onay isteyen global modal. AuthService.requestLogout() ile açılır. */
@Component({
    selector: 'app-logout-confirm',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './logout-confirm.component.html',
    styleUrl: './logout-confirm.component.scss',
})
export class LogoutConfirmComponent {
    auth = inject(AuthService);

    cancel(): void {
        this.auth.cancelLogout();
    }

    confirm(): void {
        this.auth.confirmLogout();
    }
}
