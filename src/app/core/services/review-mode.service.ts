import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { GameStateService } from './game-state.service';
import { TeacherExamReview, ExamAnswer } from '../models/exam.model';

export interface ReviewBannerState {
    studentName: string;
    studentId: string;
    questionIndex: number; // 0-based
    totalQuestions: number;
    answer: ExamAnswer | null; // null => öğrenci bu soruya hiç gelmemiş
}

/**
 * Öğretmenin "sınav kağıdı incelemesi" modu.
 * Mevcut 150 oyun component'ini HİÇ değiştirmeden, öğrencinin geçmiş cevabını
 * GameStateService'e enjekte ederek salt-okunur şekilde tekrar gösterir.
 */
@Injectable({ providedIn: 'root' })
export class ReviewModeService {
    private gs = inject(GameStateService);

    private readonly _review = signal<TeacherExamReview | null>(null);
    private readonly _bannerIndex = signal<number | null>(null);

    readonly banner = computed<ReviewBannerState | null>(() => {
        const review = this._review();
        const index = this._bannerIndex();
        if (!review || index === null) return null;
        const answer = review.answers.find(a => a.questionIndex === index) ?? null;
        return {
            studentName: `${review.student.firstName} ${review.student.lastName}`,
            studentId: review.student.id,
            questionIndex: index,
            totalQuestions: review.questions.length,
            answer,
        };
    });

    readonly active = computed(() => this.banner() !== null);

    /** İncelemeden çıkınca dönülecek liste rotası (öğretmen veya yönetici). */
    private returnPath: string[] = [];

    setReview(review: TeacherExamReview, returnPath?: string[]): void {
        this._review.set(review);
        this.returnPath = returnPath ?? ['/teacher/students', review.student.id, 'review'];
    }

    open(index: number, router: Router): void {
        const review = this._review();
        if (!review) return;
        const path = review.questions[index];
        const answer = review.answers.find(a => a.questionIndex === index);

        // Önceki incelenen sorunun sahte durumunu temizle (gerçek kullanım sızmasın).
        this.clearSeeded();

        if (answer) {
            this.gs.save(path, answer.studentAnswer, true);
            const hintKey = `${path}-hint`;
            this.gs.save(hintKey, { errorCount: Math.max(0, (answer.attemptCount || 1) - 1) });
        }

        this._bannerIndex.set(index);
        router.navigate([`/${path}`]);
    }

    prev(router: Router): void {
        const index = this._bannerIndex();
        if (index === null || index <= 0) return;
        this.open(index - 1, router);
    }

    next(router: Router): void {
        const review = this._review();
        const index = this._bannerIndex();
        if (!review || index === null || index >= review.questions.length - 1) return;
        this.open(index + 1, router);
    }

    exit(router: Router): void {
        this.clearSeeded();
        this._bannerIndex.set(null);
        if (this.returnPath.length) {
            router.navigate(this.returnPath);
        }
    }

    private clearSeeded(): void {
        const review = this._review();
        const index = this._bannerIndex();
        if (!review || index === null) return;
        const path = review.questions[index];
        this.gs.clear(path);
        this.gs.clear(`${path}-hint`);
    }
}
