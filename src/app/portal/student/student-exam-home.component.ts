import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ExamSessionService } from '../../core/services/exam-session.service';

/**
 * Öğrenci girişten sonra gördüğü basit dashboard: "Sınavlarım" başlığı
 * altında tek bir sınav kartı. Karta tıklayınca doğrudan soruya atlamaz —
 * önce kısa bir bilgi kartı gösterir (kaç soru var, nasıl işliyor), asıl
 * "Başla/Devam Et" o ekrandadır. Mevcut sınav akışına (ExamSessionService,
 * route'lar) hiç dokunmaz — yalnızca bu giriş ekranının kendisi.
 */
@Component({
    selector: 'app-student-exam-home',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './student-exam-home.component.html',
    styleUrl: './student-exam-home.component.scss',
})
export class StudentExamHomeComponent implements OnInit {
    private auth = inject(AuthService);
    private examSession = inject(ExamSessionService);
    private router = inject(Router);

    readonly loading = signal(true);
    readonly currentIndex = signal(0);
    readonly total = signal(150);
    readonly status = signal<'Assigned' | 'InProgress' | 'Completed'>('Assigned');
    readonly showInfo = signal(false);
    readonly firstName = this.auth.currentUser()?.firstName ?? '';

    async ngOnInit(): Promise<void> {
        const state = await this.examSession.ensureLoaded(true);
        if (state) {
            this.currentIndex.set(state.attempt.currentIndex);
            this.total.set(state.attempt.totalQuestions);
            this.status.set(state.attempt.status);
        }
        this.loading.set(false);
    }

    get progressPct(): number {
        return this.total() ? Math.round((this.currentIndex() / this.total()) * 100) : 0;
    }

    get statusLabel(): string {
        switch (this.status()) {
            case 'InProgress': return 'Devam Ediyor';
            case 'Completed': return 'Tamamlandı';
            default: return 'Başlamadı';
        }
    }

    /** Sınav kartına tıklanınca: tamamlanmışsa doğrudan sonuç ekranına, değilse önce bilgi kartına gider. */
    openInfo(): void {
        if (this.status() === 'Completed') {
            this.router.navigate(['/end']);
            return;
        }
        this.showInfo.set(true);
    }

    closeInfo(): void {
        this.showInfo.set(false);
    }

    start(): void {
        const state = this.examSession.examState();
        if (!state) return;
        if (state.attempt.status === 'Completed') {
            this.router.navigate(['/end']);
            return;
        }
        const next = state.questions[state.attempt.currentIndex];
        this.router.navigate([`/${next}`]);
    }

    logout(): void {
        this.auth.requestLogout();
    }
}
