import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ExamSessionService } from '../../core/services/exam-session.service';

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
