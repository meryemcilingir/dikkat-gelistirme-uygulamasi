import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TeacherService } from '../../../core/services/teacher.service';
import { PagedResult, StudentQuery, StudentWithExam } from '../../../core/models/user.model';
import { USER_FIELD_LIMITS, validateUserFields, validateEditFields, validateNewPassword } from '../../../core/models/user-limits';
import { STUDENT_SORT_PRESETS, presetIndexFor } from '../../../core/models/sort-presets';
import { studentFilterChips, FilterChip } from '../../../core/models/list-filters';
import { PaginationComponent } from '../../shared/pagination/pagination.component';

const PAGE_SIZE = 25;

/**
 * Öğretmen paneli — Öğrencilerim sekmesi. Kendi listesini, formlarını ve
 * sayfalamasını kendi yönetir; Soru Analizi sekmesinden bağımsızdır.
 */
@Component({
    selector: 'app-teacher-students',
    standalone: true,
    imports: [CommonModule, FormsModule, PaginationComponent],
    templateUrl: './teacher-students.component.html',
    styleUrl: './teacher-students.component.scss',
})
export class TeacherStudentsComponent implements OnInit {
    private teacherApi = inject(TeacherService);
    private router = inject(Router);

    readonly studentPage = signal<PagedResult<StudentWithExam> | null>(null);
    readonly loading = signal(true);
    readonly showForm = signal(false);
    readonly showFilters = signal(false);
    readonly saving = signal(false);
    readonly error = signal<string | null>(null);

    firstName = '';
    lastName = '';
    username = '';
    password = '';

    readonly limits = USER_FIELD_LIMITS;
    readonly sortPresets = STUDENT_SORT_PRESETS;

    query: StudentQuery = {
        page: 1, pageSize: PAGE_SIZE, search: '', status: '', active: '',
        scoreMin: null, scoreMax: null, correctRateMin: null, correctRateMax: null,
        sortBy: 'name', sortDirection: 'asc',
    };

    private readonly search$ = new Subject<void>();

    readonly editingStudent = signal<StudentWithExam | null>(null);
    editFirstName = '';
    editLastName = '';
    editUsername = '';
    readonly editSaving = signal(false);
    readonly editError = signal<string | null>(null);

    readonly resettingStudent = signal<StudentWithExam | null>(null);
    resetPassword = '';
    readonly resetSaving = signal(false);
    readonly resetError = signal<string | null>(null);

    constructor() {
        this.search$.pipe(debounceTime(300), takeUntilDestroyed())
            .subscribe(() => this.reload(1));
    }

    async ngOnInit(): Promise<void> {
        await this.reload(1);
    }

    async reload(page?: number): Promise<void> {
        if (page) this.query.page = page;
        this.loading.set(true);
        try {
            this.studentPage.set(await this.teacherApi.listStudents(this.query));
        } finally {
            this.loading.set(false);
        }
    }

    onSearchInput(): void { this.search$.next(); }

    toggleFilters(): void { this.showFilters.update(v => !v); }

    get sortIndex(): number {
        return presetIndexFor(this.sortPresets, this.query.sortBy, this.query.sortDirection);
    }
    set sortIndex(i: number) {
        const preset = this.sortPresets[i];
        if (!preset) return;
        this.query.sortBy = preset.sortBy;
        this.query.sortDirection = preset.sortDirection;
        this.reload(1);
    }

    get filterChips(): FilterChip[] {
        return studentFilterChips(this.query, () => this.reload(1));
    }

    clearAllFilters(): void {
        this.query.search = '';
        this.query.status = '';
        this.query.active = '';
        this.query.scoreMin = null;
        this.query.scoreMax = null;
        this.query.correctRateMin = null;
        this.query.correctRateMax = null;
        this.reload(1);
    }

    toggleForm(): void {
        const next = !this.showForm();
        this.closePanels();
        this.showForm.set(next);
    }

    async createStudent(): Promise<void> {
        const validationError = validateUserFields({
            firstName: this.firstName,
            lastName: this.lastName,
            username: this.username,
            password: this.password,
        });
        if (validationError) {
            this.error.set(validationError);
            return;
        }
        this.saving.set(true);
        this.error.set(null);
        try {
            await this.teacherApi.createStudent({
                firstName: this.firstName.trim(),
                lastName: this.lastName.trim(),
                username: this.username.trim(),
                password: this.password,
            });
            this.firstName = this.lastName = this.username = this.password = '';
            this.showForm.set(false);
            await this.reload(1);
        } catch (err: any) {
            this.error.set(err?.error?.error || 'Öğrenci oluşturulamadı.');
        } finally {
            this.saving.set(false);
        }
    }

    openReview(studentId: string): void {
        this.router.navigate(['/teacher/students', studentId, 'review']);
    }

    readonly openMenuId = signal<string | null>(null);

    toggleMenu(id: string, event: MouseEvent): void {
        event.stopPropagation();
        this.openMenuId.set(this.openMenuId() === id ? null : id);
    }

    @HostListener('document:click')
    closeMenu(): void {
        this.openMenuId.set(null);
    }

    private closePanels(): void {
        this.showForm.set(false);
        this.editingStudent.set(null);
        this.resettingStudent.set(null);
        this.error.set(null);
    }

    startEdit(student: StudentWithExam): void {
        this.closePanels();
        this.editingStudent.set(student);
        this.editFirstName = student.firstName;
        this.editLastName = student.lastName;
        this.editUsername = student.username;
        this.editError.set(null);
    }

    cancelEdit(): void {
        this.editingStudent.set(null);
        this.editError.set(null);
    }

    async saveEdit(): Promise<void> {
        const student = this.editingStudent();
        if (!student) return;
        const validationError = validateEditFields({
            firstName: this.editFirstName,
            lastName: this.editLastName,
            username: this.editUsername,
        });
        if (validationError) {
            this.editError.set(validationError);
            return;
        }
        this.editSaving.set(true);
        this.editError.set(null);
        try {
            await this.teacherApi.updateStudent(student.id, {
                firstName: this.editFirstName.trim(),
                lastName: this.editLastName.trim(),
                username: this.editUsername.trim(),
            });
            this.editingStudent.set(null);
            await this.reload();
        } catch (err: any) {
            this.editError.set(err?.error?.error || 'Güncellenemedi.');
        } finally {
            this.editSaving.set(false);
        }
    }

    startResetPassword(student: StudentWithExam): void {
        this.closePanels();
        this.resettingStudent.set(student);
        this.resetPassword = '';
        this.resetError.set(null);
    }

    cancelResetPassword(): void {
        this.resettingStudent.set(null);
        this.resetError.set(null);
    }

    async saveResetPassword(): Promise<void> {
        const student = this.resettingStudent();
        if (!student) return;
        const validationError = validateNewPassword(this.resetPassword);
        if (validationError) {
            this.resetError.set(validationError);
            return;
        }
        this.resetSaving.set(true);
        this.resetError.set(null);
        try {
            await this.teacherApi.updateStudent(student.id, { password: this.resetPassword });
            this.resettingStudent.set(null);
        } catch (err: any) {
            this.resetError.set(err?.error?.error || 'Şifre sıfırlanamadı.');
        } finally {
            this.resetSaving.set(false);
        }
    }

    statusLabel(s: StudentWithExam): string {
        if (s.exam.status === 'Completed') return 'Tamamlandı';
        if (s.exam.status === 'InProgress') return 'Devam Ediyor';
        return 'Başlamadı';
    }

    // ── Mobil: satıra dokununca açılan detay bottom sheet'i ────
    // Masaüstünde davranış hiç değişmesin diye yalnızca mobil genişlikte tetiklenir.
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
        if (!s) return;
        this.closeStudentSheet();
        this.openReview(s.id);
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
