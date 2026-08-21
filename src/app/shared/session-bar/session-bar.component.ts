import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ReviewModeService } from '../../core/services/review-mode.service';

/** Kendi çıkış butonu olan sayfalar — burada global session-bar gösterilmez. */
const PAGES_WITH_OWN_LOGOUT = ['/student/exam', '/end', '/login', '/admin', '/teacher'];

@Component({
    selector: 'app-session-bar',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './session-bar.component.html',
    styleUrl: './session-bar.component.scss',
})
export class SessionBarComponent {
    private auth = inject(AuthService);
    private reviewMode = inject(ReviewModeService);
    private router = inject(Router);

    readonly user = this.auth.currentUser;
    private readonly url = signal(this.router.url);

    constructor() {
        this.router.events
            .pipe(filter(e => e instanceof NavigationEnd))
            .subscribe((e: any) => this.url.set(e.urlAfterRedirects));
    }

    get visible(): boolean {
        if (!this.user() || this.user()!.role !== 'student') return false;
        // Öğretmen inceleme modundayken kendi banner'ı zaten var; çakışmasın.
        if (this.reviewMode.active()) return false;
        // Öğrenci ana sayfasının kendi çıkış butonu var; iki buton üst üste gelmesin.
        return !PAGES_WITH_OWN_LOGOUT.some(p => this.url().startsWith(p));
    }

    logout(): void {
        this.auth.requestLogout();
    }
}
