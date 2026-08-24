import { Component, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TeacherService } from '../../../core/services/teacher.service';
import { AdminService } from '../../../core/services/admin.service';
import { QuestionDetail } from '../../../core/models/question-stats.model';
import { questionTitle } from '../../../core/models/question-titles';
import { QuestionPreviewService } from '../../../core/services/question-preview.service';

/**
 * Bir sorunun istatistik detayını (kategori, doğru/yanlış sayısı, doğru/yanlış
 * yapan öğrenci listeleri) gösteren paylaşılan overlay + "Sınavda Gör" ile
 * sorunun gerçek ekranına geçiş. Hem admin hem öğretmen "Sorular"/"Analiz"
 * ekranlarında aynı şekilde kullanılır — tek gerçek kaynak, iki yerde
 * kopyalanmasın diye buraya çıkarıldı.
 */
@Component({
    selector: 'app-question-detail-panel',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './question-detail-panel.component.html',
    styleUrl: './question-detail-panel.component.scss',
})
export class QuestionDetailPanelComponent {
    /** 'teacher' → kendi öğrencileri; 'admin' → sistem geneli. */
    @Input() scope: 'teacher' | 'admin' = 'teacher';

    private teacherApi = inject(TeacherService);
    private adminApi = inject(AdminService);
    private preview = inject(QuestionPreviewService);
    private router = inject(Router);

    readonly selected = signal<QuestionDetail | null>(null);
    readonly loading = signal(false);
    readonly detailTab = signal<'wrong' | 'correct'>('wrong');

    private api() {
        return this.scope === 'admin' ? this.adminApi : this.teacherApi;
    }

    async open(questionId: string): Promise<void> {
        this.loading.set(true);
        this.selected.set(null);
        this.detailTab.set('wrong');
        try {
            this.selected.set(await this.api().getQuestionDetail(questionId));
        } finally {
            this.loading.set(false);
        }
    }

    close(): void {
        this.selected.set(null);
    }

    goToStudentReview(studentId: string): void {
        const base = this.scope === 'admin' ? '/admin/students' : '/teacher/students';
        this.router.navigate([base, studentId, 'review']);
    }

    /** Soruyu gerçek sınav ekranında (önizleme modunda) açar — geri dönünce aynı sayfaya iner. */
    viewInExam(): void {
        const d = this.selected();
        if (!d) return;
        const returnPath = this.scope === 'admin' ? ['/admin/questions'] : ['/teacher/questions'];
        this.preview.enter(returnPath);
        this.close();
        this.router.navigate(['/', d.questionId]);
    }

    title(questionId: string): string {
        return questionTitle(questionId);
    }
}
