import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AppUser } from '../models/user.model';

const STORAGE_KEY = 'attn_auth';

interface StoredAuth {
    token: string;
    user: AppUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    private http = inject(HttpClient);
    private router = inject(Router);

    private readonly _auth = signal<StoredAuth | null>(this.restore());

    readonly currentUser = computed(() => this._auth()?.user ?? null);
    readonly token = computed(() => this._auth()?.token ?? null);
    readonly isLoggedIn = computed(() => !!this._auth());

    /** Çıkış onay penceresinin açık olup olmadığı (global app.html'de gösterilir). */
    readonly confirmingLogout = signal(false);

    /** Şifre değiştirme penceresinin açık olup olmadığı (global app.html'de gösterilir). */
    readonly changePasswordOpen = signal(false);

    private restore(): StoredAuth | null {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    async login(username: string, password: string): Promise<AppUser> {
        const res = await firstValueFrom(
            this.http.post<{ token: string; user: AppUser }>('/api/auth/login', { username, password })
        );
        this._auth.set(res);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(res));
        return res.user;
    }

    /** Çıkış butonlarının çağırması gereken metod — direkt çıkış yapmaz, önce onay ister. */
    requestLogout(): void {
        this.confirmingLogout.set(true);
    }

    cancelLogout(): void {
        this.confirmingLogout.set(false);
    }

    confirmLogout(): void {
        this.confirmingLogout.set(false);
        this.logout();
    }

    /** Oturum süresi dolduğunda (401) interceptor tarafından çağrılır — onay istemeden çıkış yapar. */
    forceLogout(): void {
        this.logout();
    }

    private logout(): void {
        this._auth.set(null);
        localStorage.removeItem(STORAGE_KEY);
        this.router.navigate(['/login']);
    }

    openChangePassword(): void {
        this.changePasswordOpen.set(true);
    }

    closeChangePassword(): void {
        this.changePasswordOpen.set(false);
    }

    async changePassword(currentPassword: string, newPassword: string): Promise<void> {
        await firstValueFrom(
            this.http.post('/api/auth/change-password', { currentPassword, newPassword })
        );
    }

    homePathFor(user: AppUser | null): string {
        if (!user) return '/login';
        if (user.role === 'admin') return '/admin';
        if (user.role === 'teacher') return '/teacher';
        return '/student/exam';
    }

    goHome(): void {
        this.router.navigate([this.homePathFor(this.currentUser())]);
    }
}
