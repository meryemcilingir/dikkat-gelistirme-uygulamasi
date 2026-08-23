import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminService, AdminOverview } from '../../../core/services/admin.service';
import { AppUser, PagedResult, TeacherQuery, TeacherWithCount } from '../../../core/models/user.model';
import { USER_FIELD_LIMITS, validateUserFields, validateEditFields, validateNewPassword } from '../../../core/models/user-limits';
import { TEACHER_SORT_PRESETS, presetIndexFor } from '../../../core/models/sort-presets';
import { PaginationComponent } from '../../shared/pagination/pagination.component';
import { FloatingMenuDirective } from '../../shared/floating-menu.directive';

const PAGE_SIZE = 25;

/**
 * Yönetici paneli — Öğretmenler sekmesi. Kendi listesini, formlarını ve
 * sayfalamasını kendi yönetir; Öğrenciler/Genel Bakış sekmelerinden bağımsızdır.
 * Görünüm ve mobil davranış (metric-strip/list-toolbar/responsive tablo +
 * bottom sheet) kasıtlı olarak Öğrenciler sekmesiyle birebir aynıdır.
 */
@Component({
    selector: 'app-admin-teachers',
    standalone: true,
    imports: [CommonModule, FormsModule, PaginationComponent, FloatingMenuDirective],
    templateUrl: './admin-teachers.component.html',
    styleUrl: './admin-teachers.component.scss',
})
export class AdminTeachersComponent implements OnInit {
    private adminApi = inject(AdminService);
    private router = inject(Router);

    readonly limits = USER_FIELD_LIMITS;
    readonly sortPresets = TEACHER_SORT_PRESETS;

    readonly teacherPage = signal<PagedResult<TeacherWithCount> | null>(null);
    readonly summary = signal<AdminOverview | null>(null);
    readonly loading = signal(false);
    readonly showForm = signal(false);
    readonly saving = signal(false);
    readonly error = signal<string | null>(null);
    readonly showFilters = signal(false);

    firstName = '';
    lastName = '';
    username = '';
    password = '';

    query: TeacherQuery = {
        page: 1, pageSize: PAGE_SIZE, search: '', status: '', sortBy: 'name', sortDirection: 'asc',
    };

    private readonly search$ = new Subject<void>();

    readonly editingTeacher = signal<AppUser | null>(null);
    editFirstName = '';
    editLastName = '';
    editUsername = '';
    readonly editSaving = signal(false);
    readonly editError = signal<string | null>(null);

    readonly resettingTeacher = signal<AppUser | null>(null);
    resetPassword = '';
    readonly resetSaving = signal(false);
    readonly resetError = signal<string | null>(null);

    constructor() {
        this.search$.pipe(debounceTime(300), takeUntilDestroyed())
            .subscribe(() => this.reload(1));
    }

    async ngOnInit(): Promise<void> {
        await Promise.all([this.reload(1), this.loadSummary()]);
    }

    private async loadSummary(): Promise<void> {
        this.summary.set(await this.adminApi.overview());
    }

    async reload(page?: number): Promise<void> {
        if (page) this.query.page = page;
        this.loading.set(true);
        try {
            this.teacherPage.set(await this.adminApi.listTeachers(this.query));
        } finally {
            this.loading.set(false);
        }
    }

    onSearchInput(): void { this.search$.next(); }

    sortBy(sortBy: TeacherQuery['sortBy']): void {
        if (this.query.sortBy === sortBy) {
            this.query.sortDirection = this.query.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.query.sortBy = sortBy;
            this.query.sortDirection = 'asc';
        }
        this.reload(1);
    }

    sortIcon(sortBy: TeacherQuery['sortBy']): string {
        if (this.query.sortBy !== sortBy) return '';
        return this.query.sortDirection === 'asc' ? '▲' : '▼';
    }

    toggleFilters(): void {
        this.showFilters.update(v => !v);
    }

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

    clearFilters(): void {
        this.query.search = '';
        this.query.status = '';
        this.reload(1);
    }

    openDetail(t: TeacherWithCount): void {
        this.router.navigate(['/admin/teachers', t.id]);
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
        this.editingTeacher.set(null);
        this.resettingTeacher.set(null);
        this.error.set(null);
    }

    toggleForm(): void {
        const next = !this.showForm();
        this.closePanels();
        this.showForm.set(next);
    }

    async createTeacher(): Promise<void> {
        const validationError = validateUserFields({
            firstName: this.firstName, lastName: this.lastName,
            username: this.username, password: this.password,
        });
        if (validationError) { this.error.set(validationError); return; }

        this.saving.set(true);
        this.error.set(null);
        try {
            await this.adminApi.createTeacher({
                firstName: this.firstName.trim(),
                lastName: this.lastName.trim(),
                username: this.username.trim(),
                password: this.password,
            });
            this.firstName = this.lastName = this.username = this.password = '';
            this.showForm.set(false);
            await this.reload(1);
        } catch (err: any) {
            this.error.set(err?.error?.error || 'Öğretmen oluşturulamadı.');
        } finally {
            this.saving.set(false);
        }
    }

    async toggleActive(t: TeacherWithCount): Promise<void> {
        await this.adminApi.updateTeacher(t.id, { active: !t.active });
        await this.reload();
    }

    startEdit(teacher: AppUser): void {
        this.closePanels();
        this.editingTeacher.set(teacher);
        this.editFirstName = teacher.firstName;
        this.editLastName = teacher.lastName;
        this.editUsername = teacher.username;
    }

    cancelEdit(): void {
        this.editingTeacher.set(null);
        this.editError.set(null);
    }

    async saveEdit(): Promise<void> {
        const teacher = this.editingTeacher();
        if (!teacher) return;
        const validationError = validateEditFields({
            firstName: this.editFirstName, lastName: this.editLastName, username: this.editUsername,
        });
        if (validationError) { this.editError.set(validationError); return; }

        this.editSaving.set(true);
        this.editError.set(null);
        try {
            await this.adminApi.updateTeacher(teacher.id, {
                firstName: this.editFirstName.trim(),
                lastName: this.editLastName.trim(),
                username: this.editUsername.trim(),
            });
            this.editingTeacher.set(null);
            await this.reload();
        } catch (err: any) {
            this.editError.set(err?.error?.error || 'Güncellenemedi.');
        } finally {
            this.editSaving.set(false);
        }
    }

    startResetPassword(teacher: AppUser): void {
        this.closePanels();
        this.resettingTeacher.set(teacher);
        this.resetPassword = '';
    }

    cancelResetPassword(): void {
        this.resettingTeacher.set(null);
        this.resetError.set(null);
    }

    async saveResetPassword(): Promise<void> {
        const teacher = this.resettingTeacher();
        if (!teacher) return;
        const validationError = validateNewPassword(this.resetPassword);
        if (validationError) { this.resetError.set(validationError); return; }

        this.resetSaving.set(true);
        this.resetError.set(null);
        try {
            await this.adminApi.updateTeacher(teacher.id, { password: this.resetPassword });
            this.resettingTeacher.set(null);
        } catch (err: any) {
            this.resetError.set(err?.error?.error || 'Şifre sıfırlanamadı.');
        } finally {
            this.resetSaving.set(false);
        }
    }

    // ── Mobil: satıra dokununca açılan detay bottom sheet'i ────
    // Masaüstünde davranış hiç değişmesin diye yalnızca mobil genişlikte tetiklenir.
    readonly selectedTeacher = signal<TeacherWithCount | null>(null);

    openTeacherSheet(t: TeacherWithCount): void {
        if (window.innerWidth > 640) return;
        this.selectedTeacher.set(t);
    }

    closeTeacherSheet(): void {
        this.selectedTeacher.set(null);
    }

    goToDetailFromSheet(): void {
        const t = this.selectedTeacher();
        if (!t) return;
        this.closeTeacherSheet();
        this.openDetail(t);
    }
}
