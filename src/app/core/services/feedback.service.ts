import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';

export type FeedbackStatus = 'success' | 'error';
export interface FeedbackState {
    status: FeedbackStatus;
    message: string;
    visible: boolean;
}

@Injectable({ providedIn: 'root' })
export class FeedbackService {
    private auth = inject(AuthService);

    readonly state = signal<FeedbackState>({ status: 'success', message: '', visible: false });
    private timer: any;

    showFeedback(status: FeedbackStatus, message: string): void {
        // Öğrenci sınav sırasında cevabının doğru/yanlış olduğunu ÖĞRENMEMELİ.
        // 150 etkinlik component'inin tamamı geri bildirimi buradan geçirdiği için
        // tek noktadan susturmak yeterli; component'lere dokunmaya gerek yok.
        if (this.auth.currentUser()?.role === 'student') return;

        this.state.set({ status, message, visible: true });
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => {
            this.state.update(s => ({ ...s, visible: false }));
        }, 2500);
    }

    showCorrect(): void {
        this.showFeedback('success', 'Harika! Doğru cevap! 🎨');
    }

    showWrong(): void {
        this.showFeedback('error', 'Tekrar Denemelisin 🧐');
    }

    hideFeedback(): void {
        this.state.update(s => ({ ...s, visible: false }));
        if (this.timer) clearTimeout(this.timer);
    }
}
