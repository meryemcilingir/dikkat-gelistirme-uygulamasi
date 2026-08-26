import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TeacherService } from '../../core/services/teacher.service';
import { AdminService } from '../../core/services/admin.service';
import { ReviewModeService } from '../../core/services/review-mode.service';
import { TeacherExamReview, ExamAnswer } from '../../core/models/exam.model';
import { questionTitle } from '../../core/models/question-titles';

/**
 * Sınav kağıdı inceleme ekranı. Hem öğretmen (/teacher/students/:id/review) hem de
 * yönetici (/admin/students/:id/review) tarafından kullanılır; veri kaynağı ve geri
 * dönüş rotası oturumdaki role göre seçilir.
 */
@Component({
    selector: 'app-teacher-review',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './teacher-review.component.html',
    styleUrl: './teacher-review.component.scss',
})
export class TeacherReviewComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private auth = inject(AuthService);
    private teacherApi = inject(TeacherService);
    private adminApi = inject(AdminService);
    private reviewMode = inject(ReviewModeService);

    readonly review = signal<TeacherExamReview | null>(null);
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);

    readonly isAdmin = this.auth.currentUser()?.role === 'admin';

    async ngOnInit(): Promise<void> {
        const studentId = this.route.snapshot.paramMap.get('id')!;
        try {
            const review = this.isAdmin
                ? await this.adminApi.getStudentExam(studentId)
                : await this.teacherApi.getStudentExam(studentId);
            this.review.set(review);
            this.reviewMode.setReview(review, this.reviewReturnPath(studentId));
        } catch (err: any) {
            this.error.set(err?.error?.error || 'Sınav bilgisi alınamadı.');
        } finally {
            this.loading.set(false);
        }
    }

    private reviewReturnPath(studentId: string): string[] {
        return this.isAdmin
            ? ['/admin/students', studentId, 'review']
            : ['/teacher/students', studentId, 'review'];
    }

    private get sourceView(): 'teacher' | 'students' | null {
        const from = this.route.snapshot.queryParamMap.get('from');
        return from === 'teacher' || from === 'students' ? from : null;
    }

    answerFor(index: number): ExamAnswer | undefined {
        return this.review()?.answers.find(a => a.questionIndex === index);
    }

    /** Süresi kaydedilmiş cevaplar — eski kayıtlarda (özellik eklenmeden önce) bu alan boş olabilir. */
    private get timedAnswers(): ExamAnswer[] {
        return (this.review()?.answers ?? []).filter(a => typeof a.timeSpentSeconds === 'number');
    }

    /** Toplam sınav süresi: soru sürelerinin toplamı (ara verme/bekleme süresi dahil değildir). */
    get totalTimeSeconds(): number | null {
        const timed = this.timedAnswers;
        if (!timed.length) return null;
        return timed.reduce((sum, a) => sum + (a.timeSpentSeconds ?? 0), 0);
    }

    get avgTimeSeconds(): number | null {
        const timed = this.timedAnswers;
        if (!timed.length) return null;
        return Math.round(this.totalTimeSeconds! / timed.length);
    }

    /** "46 dk 18 sn" / "18 sn" formatında gösterir; veri yoksa "—". */
    formatDuration(seconds: number | null | undefined): string {
        if (seconds === null || seconds === undefined) return '—';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins === 0) return `${secs} sn`;
        return `${mins} dk ${secs} sn`;
    }

    title(questionId: string): string {
        return questionTitle(questionId);
    }

    cellClass(index: number): string {
        const a = this.answerFor(index);
        if (!a) return 'unanswered';
        return a.isCorrect ? 'correct' : 'wrong';
    }

    openQuestion(index: number): void {
        if (!this.answerFor(index)) return; // henüz cevaplanmamış soru incelenemez
        this.reviewMode.open(index, this.router);
    }

    back(): void {
        if (this.isAdmin) {
            const source = this.sourceView;
            if (source === 'teacher') {
                const teacherId = this.route.snapshot.queryParamMap.get('teacherId') || this.review()?.student.teacherId;
                if (teacherId) { this.router.navigate(['/admin/teachers', teacherId]); return; }
            }
            if (source === 'students') {
                this.router.navigate(['/admin/students']);
                return;
            }
            // Doğrudan URL ile açıldıysa (from parametresi yok): en makul geri dönüş.
            const teacherId = this.review()?.student.teacherId;
            if (teacherId) this.router.navigate(['/admin/teachers', teacherId]);
            else this.router.navigate(['/admin/students']);
        } else {
            this.router.navigate(['/teacher/students']);
        }
    }

    statusLabel(status: string): string {
        if (status === 'Completed') return 'Tamamlandı';
        if (status === 'InProgress') return 'Devam Ediyor';
        return 'Başlamadı';
    }
}
