import { Component, ElementRef, HostListener, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ExamSessionService } from '../../core/services/exam-session.service';
import { PortalIconComponent } from '../shared/icon/portal-icon.component';

/**
 * Öğrenci girişten sonra gördüğü ana ekran — admin/öğretmen paneliyle aynı
 * kurumsal tasarım dilini (portal-tokens, .badge, .primary-btn, .metric-strip)
 * kullanır. Öğrenciye kendi sonucu (puan/yüzde) hiçbir yerde gösterilmez —
 * sınav tamamlandığında yalnızca "öğretmenine iletildi" bilgisi verilir.
 */
@Component({
    selector: 'app-student-exam-home',
    standalone: true,
    imports: [CommonModule, PortalIconComponent],
    templateUrl: './student-exam-home.component.html',
    styleUrl: './student-exam-home.component.scss',
})
export class StudentExamHomeComponent implements OnInit {
    private auth = inject(AuthService);
    private examSession = inject(ExamSessionService);
    private router = inject(Router);

    @ViewChild('userMenu') private userMenuRef?: ElementRef<HTMLElement>;

    readonly userMenuOpen = signal(false);
    readonly loading = signal(true);
    readonly currentIndex = signal(0);
    readonly total = signal(150);
    readonly status = signal<'Assigned' | 'InProgress' | 'Completed'>('Assigned');
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

    get actionLabel(): string {
        return this.status() === 'InProgress' ? 'Devam Et' : 'Sınava Başla';
    }

    /**
     * Henüz başlamamış bir sınav için önce kural bilgi kartını gösterir
     * (bkz. şablon `confirmingStart`) — "Devam Et" (zaten başlamış sınav)
     * için tekrar tekrar aynı uyarıyı göstermenin faydası yok, direkt devam eder.
     */
    readonly confirmingStart = signal(false);

    requestStart(): void {
        if (this.status() === 'InProgress') {
            this.start();
            return;
        }
        this.confirmingStart.set(true);
    }

    cancelStart(): void {
        this.confirmingStart.set(false);
    }

    confirmStart(): void {
        this.confirmingStart.set(false);
        this.start();
    }

    /** Sıradaki soruya gider (tamamlanmış sınavlar için hiç çağrılmaz — bkz. şablon). */
    private start(): void {
        const state = this.examSession.examState();
        if (!state || state.attempt.status === 'Completed') return;
        const next = state.questions[state.attempt.currentIndex];
        this.router.navigate([`/${next}`]);
    }

    logout(): void {
        this.closeUserMenu();
        this.auth.requestLogout();
    }

    get userInitial(): string {
        return (this.firstName.trim().charAt(0) || '?').toUpperCase();
    }

    toggleUserMenu(): void {
        this.userMenuOpen.update(v => !v);
    }

    closeUserMenu(): void {
        this.userMenuOpen.set(false);
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        if (!this.userMenuOpen()) return;
        if (!this.userMenuRef?.nativeElement.contains(event.target as Node)) this.closeUserMenu();
    }
}
