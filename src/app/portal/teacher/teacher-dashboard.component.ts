import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { PortalShellComponent, ShellNavSection } from '../shared/shell/portal-shell.component';
import { TEACHER_NAV_SECTIONS } from '../shared/portal-nav.config';

/**
 * Öğretmen paneli kabuğu — sidebar + topbar için ortak <app-portal-shell>
 * kullanır. Her sekme kendi URL'ine sahiptir (/teacher/overview,
 * /teacher/students, /teacher/questions) ve içeriği <router-outlet> ile
 * ayrı bir component'ten gelir; bu dosya onlarla hiç karışmaz.
 */
@Component({
    selector: 'app-teacher-dashboard',
    standalone: true,
    imports: [PortalShellComponent],
    templateUrl: './teacher-dashboard.component.html',
    styleUrl: './teacher-dashboard.component.scss',
})
export class TeacherDashboardComponent {
    private auth = inject(AuthService);

    readonly userName = `${this.auth.currentUser()?.firstName ?? ''} ${this.auth.currentUser()?.lastName ?? ''}`.trim();

    readonly sections: ShellNavSection[] = TEACHER_NAV_SECTIONS;

    openChangePassword(): void {
        this.auth.openChangePassword();
    }

    logout(): void {
        this.auth.requestLogout();
    }
}
