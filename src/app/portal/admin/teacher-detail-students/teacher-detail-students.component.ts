import { Component, Input, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminService } from '../../../core/services/admin.service';
import { PagedResult, StudentQuery, StudentWithExam } from '../../../core/models/user.model';
import { studentFilterChips, FilterChip } from '../../../core/models/list-filters';
import { PaginationComponent } from '../../shared/pagination/pagination.component';

/**
 * Belirli bir öğretmenin öğrenci listesi — admin-teacher-detail.component'in
 * alt bileşeni. Kendi sorgu/sayfalama/filtre state'ini kendi yönetir; üst
 * component yalnızca hangi öğretmene ait olduğunu (teacherId) bildirir.
 */
@Component({
    selector: 'app-teacher-detail-students',
    standalone: true,
    imports: [CommonModule, FormsModule, PaginationComponent],
    templateUrl: './teacher-detail-students.component.html',
    styleUrl: './teacher-detail-students.component.scss',
})
export class TeacherDetailStudentsComponent implements OnChanges {
    private adminApi = inject(AdminService);
    private router = inject(Router);

    @Input({ required: true }) teacherId!: string;

    readonly studentPage = signal<PagedResult<StudentWithExam> | null>(null);
    readonly loading = signal(false);
    readonly showFilters = signal(false);

    /** Bu kart bir performans sıralaması olduğu için varsayılan sıralama başarıya göre (düşükten yükseğe). */
    query: StudentQuery = {
        page: 1, pageSize: 25, search: '', status: '', active: '',
        scoreMin: null, scoreMax: null, correctRateMin: null, correctRateMax: null,
        sortBy: 'score', sortDirection: 'asc',
    };

    private readonly search$ = new Subject<void>();

    constructor() {
        this.search$.pipe(debounceTime(300), takeUntilDestroyed())
            .subscribe(() => this.reload(1));
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['teacherId'] && this.teacherId) {
            this.query.teacherId = this.teacherId;
            this.reload(1);
        }
    }

    async reload(page?: number): Promise<void> {
        if (page) this.query.page = page;
        this.loading.set(true);
        try {
            this.studentPage.set(await this.adminApi.listStudents(this.query));
        } finally {
            this.loading.set(false);
        }
    }

    onSearchInput(): void { this.search$.next(); }

    sortBy(sortBy: StudentQuery['sortBy']): void {
        if (this.query.sortBy === sortBy) {
            this.query.sortDirection = this.query.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.query.sortBy = sortBy;
            this.query.sortDirection = 'asc';
        }
        this.reload(1);
    }

    sortIcon(sortBy: StudentQuery['sortBy']): string {
        if (this.query.sortBy !== sortBy) return '';
        return this.query.sortDirection === 'asc' ? '▲' : '▼';
    }

    toggleFilters(): void { this.showFilters.update(v => !v); }

    get filterChips(): FilterChip[] {
        return studentFilterChips(this.query, () => this.reload(1));
    }

    clearFilters(): void {
        this.query.search = '';
        this.query.status = '';
        this.query.active = '';
        this.query.scoreMin = null;
        this.query.scoreMax = null;
        this.query.correctRateMin = null;
        this.query.correctRateMax = null;
        this.reload(1);
    }

    openReview(s: StudentWithExam): void {
        this.router.navigate(['/admin/students', s.id, 'review'], {
            queryParams: { from: 'teacher', teacherId: this.teacherId },
        });
    }

    statusLabel(status: string): string {
        if (status === 'Completed') return 'Tamamlandı';
        if (status === 'InProgress') return 'Devam Ediyor';
        return 'Başlamadı';
    }

    // ── Mobil: satıra dokununca açılan detay bottom sheet'i ────
    // Masaüstünde davranış hiç değişmesin diye yalnızca mobil genişlikte tetiklenir.
    // (bkz. admin-students.component.ts — aynı desen)
    readonly selectedStudent = signal<StudentWithExam | null>(null);

    openStudentSheet(s: StudentWithExam): void {
        if (window.innerWidth > 640) return;
        this.selectedStudent.set(s);
    }

    closeStudentSheet(): void {
        this.selectedStudent.set(null);
    }

    reviewFromSheet(): void {
        const s = this.selectedStudent();
        if (!s || s.exam.answered === 0) return;
        this.closeStudentSheet();
        this.openReview(s);
    }

    avgTimeSeconds(s: StudentWithExam): number | null {
        const total = s.exam.totalTimeSeconds;
        if (!total || !s.exam.answered) return null;
        return Math.round(total / s.exam.answered);
    }

    /** "46 dk 18 sn" / "18 sn" formatında gösterir; veri yoksa "—". */
    formatDuration(seconds: number | null | undefined): string {
        if (seconds === null || seconds === undefined) return '—';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins === 0) return `${secs} sn`;
        return `${mins} dk ${secs} sn`;
    }
}
