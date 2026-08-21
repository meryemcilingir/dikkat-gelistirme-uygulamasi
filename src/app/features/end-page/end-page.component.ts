import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ExamSessionService } from '../../core/services/exam-session.service';

@Component({
    selector: 'app-end-page',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './end-page.component.html',
    styleUrl: './end-page.component.scss',
})
export class EndPageComponent implements OnInit {
    private router = inject(Router);
    private auth = inject(AuthService);
    private examSession = inject(ExamSessionService);

    /** Öğrenciye doğru/yanlış/puan asla gösterilmez — sadece sınavın tamamlandığı bilgisi. */
    readonly completed = signal(false);
    readonly firstName = this.auth.currentUser()?.firstName ?? '';

    async ngOnInit(): Promise<void> {
        const user = this.auth.currentUser();
        if (user?.role !== 'student') return;
        const state = await this.examSession.ensureLoaded(true);
        if (state?.attempt.status === 'Completed') {
            this.completed.set(true);
        }
    }

    logout(): void {
        this.auth.requestLogout();
    }
}
