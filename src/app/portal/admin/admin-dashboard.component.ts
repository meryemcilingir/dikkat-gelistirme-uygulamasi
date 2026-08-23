import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { PortalShellComponent, ShellNavSection } from '../shared/shell/portal-shell.component';
import { ADMIN_NAV_SECTIONS } from '../shared/portal-nav.config';

/**
 * Yönetici paneli kabuğu — sidebar + topbar için ortak <app-portal-shell>
 * kullanır. Her sekme kendi URL'ine sahiptir (/admin/overview,
 * /admin/teachers, /admin/students, /admin/questions) ve içeriği
 * <router-outlet> ile ayrı bir component'ten gelir; bu dosya onlarla
 * hiç karışmaz.
 */
@Component({
    selector: 'app-admin-dashboard',
    standalone: true,
    imports: [PortalShellComponent],
    templateUrl: './admin-dashboard.component.html',
    styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent {
    private auth = inject(AuthService);

    readonly userName = `${this.auth.currentUser()?.firstName ?? ''} ${this.auth.currentUser()?.lastName ?? ''}`.trim();

    readonly sections: ShellNavSection[] = ADMIN_NAV_SECTIONS;

    openChangePassword(): void {
        this.auth.openChangePassword();
    }

    logout(): void {
        this.auth.requestLogout();
    }
}
