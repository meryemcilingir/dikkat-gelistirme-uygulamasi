import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { PortalShellComponent, ShellNavSection } from '../shared/shell/portal-shell.component';

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

    readonly sections: ShellNavSection[] = [
        { label: 'Genel', items: [{ label: 'Genel Bakış', icon: 'grid', link: '/admin/overview' }] },
        {
            label: 'Yönetim',
            items: [
                { label: 'Öğretmenler', icon: 'users', link: '/admin/teachers' },
                { label: 'Öğrenciler', icon: 'user', link: '/admin/students' },
                { label: 'Sınav Yönetimi', icon: 'clipboard-check', link: '/admin/exams' },
            ],
        },
        {
            label: 'Analitik',
            items: [
                { label: 'Soru Analizi', icon: 'chart', link: '/admin/questions' },
            ],
        },
        { label: 'Sistem', items: [{ label: 'Ayarlar', icon: 'settings', link: '/admin/settings' }] },
    ];

    openChangePassword(): void {
        this.auth.openChangePassword();
    }

    logout(): void {
        this.auth.requestLogout();
    }
}
