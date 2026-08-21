import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { USER_FIELD_LIMITS } from '../../core/models/user-limits';

/** Şifremi Değiştir global modalı. AuthService.openChangePassword() ile açılır. */
@Component({
    selector: 'app-change-password',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './change-password.component.html',
    styleUrl: './change-password.component.scss',
})
export class ChangePasswordComponent {
    auth = inject(AuthService);
    readonly limits = USER_FIELD_LIMITS;

    currentPassword = '';
    newPassword = '';
    confirmPassword = '';
    readonly saving = signal(false);
    readonly error = signal<string | null>(null);
    readonly success = signal(false);

    private resetFields(): void {
        this.currentPassword = this.newPassword = this.confirmPassword = '';
    }

    cancel(): void {
        this.resetFields();
        this.error.set(null);
        this.success.set(false);
        this.auth.closeChangePassword();
    }

    async submit(): Promise<void> {
        this.error.set(null);
        if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
            this.error.set('Tüm alanlar zorunlu.');
            return;
        }
        if (this.newPassword.length < this.limits.password.min || this.newPassword.length > this.limits.password.max) {
            this.error.set(`Yeni şifre en az ${this.limits.password.min}, en fazla ${this.limits.password.max} karakter olmalıdır.`);
            return;
        }
        if (this.newPassword !== this.confirmPassword) {
            this.error.set('Yeni şifre tekrarı eşleşmiyor.');
            return;
        }
        this.saving.set(true);
        try {
            await this.auth.changePassword(this.currentPassword, this.newPassword);
            this.success.set(true);
            this.resetFields();
        } catch (err: any) {
            this.error.set(err?.error?.error || 'Şifre değiştirilemedi.');
        } finally {
            this.saving.set(false);
        }
    }
}
