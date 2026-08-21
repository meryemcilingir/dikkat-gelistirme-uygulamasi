import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { USER_FIELD_LIMITS } from '../../../core/models/user-limits';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './login.component.html',
    styleUrl: './login.component.scss',
})
export class LoginComponent {
    private auth = inject(AuthService);

    readonly limits = USER_FIELD_LIMITS;

    username = '';
    password = '';
    loading = signal(false);
    error = signal<string | null>(null);

    async submit(): Promise<void> {
        if (!this.username || !this.password) {
            this.error.set('Kullanıcı adı ve şifre gerekli.');
            return;
        }
        this.loading.set(true);
        this.error.set(null);
        try {
            const user = await this.auth.login(this.username.trim(), this.password);
            this.auth.homePathFor(user);
            this.auth.goHome();
        } catch (err: any) {
            this.error.set(err?.error?.error || 'Giriş yapılamadı. Bilgileri kontrol edin.');
        } finally {
            this.loading.set(false);
        }
    }
}
