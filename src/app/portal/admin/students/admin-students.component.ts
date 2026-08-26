import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminService, AdminOverview } from '../../../core/services/admin.service';
import { AppUser, PagedResult, StudentQuery, StudentWithExam, TeacherWithCount } from '../../../core/models/user.model';
import { USER_FIELD_LIMITS, validateEditFields, validateNewPassword } from '../../../core/models/user-limits';
import { STUDENT_SORT_PRESETS, presetIndexFor } from '../../../core/models/sort-presets';
import { studentFilterChips, FilterChip } from '../../../core/models/list-filters';
import { PaginationComponent } from '../../shared/pagination/pagination.component';
import { FloatingMenuDirective } from '../../shared/floating-menu.directive';

const PAGE_SIZE = 25;

/**
 * Yönetici paneli — Öğrenciler sekmesi (sistem geneli). Kendi listesini,
 * formlarını ve sayfalamasını kendi yönetir; Öğretmenler/Genel Bakış
 * sekmelerinden bağımsızdır.
 */
@Component({
    selector: 'app-admin-students',
    standalone: true,
    imports: [CommonModule, FormsModule, PaginationComponent, FloatingMenuDirective],
    templateUrl: './admin-students.component.html',
    styleUrl: './admin-students.component.scss',
})
export class AdminStudentsComponent implements OnInit {
    private adminApi = inject(AdminService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);

    readonly limits = USER_FIELD_LIMITS;
    readonly sortPresets = STUDENT_SORT_PRESETS;

    readonly studentPage = signal<PagedResult<StudentWithExam> | null>(null);
    readonly summary = signal<AdminOverview | null>(null);

    // ── Öğretmen filtresi: yüzlerce öğretmende tümünü tek dropdown'a
    // yüklemek yerine, yazdıkça (debounce 300ms) API'den arayan, en fazla
    // 20 sonuç gösteren basit bir autocomplete.
    teacherSearchTerm = '';
    readonly teacherSearchResults = signal<TeacherWithCount[]>([]);
    readonly teacherSearchOpen = signal(false);
    readonly selectedTeacherLabel = signal('');
    private readonly teacherSearch$ = new Subject<string>();
    readonly loading = signal(false);
    readonly showFilters = signal(false);
    readonly error = signal<string | null>(null);

    query: StudentQuery = {
        page: 1, pageSize: PAGE_SIZE, search: '', teacherId: '', status: '', active: '',
        scoreMin: null, scoreMax: null, correctRateMin: null, correctRateMax: null,
        sortBy: 'name', sortDirection: 'asc',
    };

    private readonly search$ = new Subject<void>();

    readonly editingStudent = signal<AppUser | null>(null);
    editFirstName = '';
    editLastName = '';
    editUsername = '';
    readonly editSaving = signal(false);
    readonly editError = signal<string | null>(null);

    readonly resettingStudent = signal<AppUser | null>(null);
    resetPassword = '';
    readonly resetSaving = signal(false);
    readonly resetError = signal<string | null>(null);

    constructor() {
        this.search$.pipe(debounceTime(300), takeUntilDestroyed())
            .subscribe(() => this.reload(1));

        this.teacherSearch$.pipe(debounceTime(300), takeUntilDestroyed())
            .subscribe(term => this.runTeacherSearch(term));
    }

    async ngOnInit(): Promise<void> {
        /** Genel Bakış'tan veya Öğretmen Detayı'ndan bir karta tıklanıp gelindiyse, o filtre URL'den okunur. */
        const requestedStatus = this.route.snapshot.queryParamMap.get('status') as StudentQuery['status'] | null;
        if (requestedStatus) this.query.status = requestedStatus;
        const requestedScoreMin = this.route.snapshot.queryParamMap.get('scoreMin');
        const requestedScoreMax = this.route.snapshot.queryParamMap.get('scoreMax');
        if (requestedScoreMin || requestedScoreMax) {
            if (requestedScoreMin) this.query.scoreMin = Number(requestedScoreMin);
            if (requestedScoreMax) this.query.scoreMax = Number(requestedScoreMax);
            this.query.status = 'Completed';
        }
        const requestedTeacherId = this.route.snapshot.queryParamMap.get('teacherId');
        const tasks: Promise<unknown>[] = [];
        if (requestedTeacherId) {
            this.query.teacherId = requestedTeacherId;
            tasks.push(this.presetTeacherFilter(requestedTeacherId));
        }
        tasks.push(this.reload(1), this.loadSummary());
        await Promise.all(tasks);
    }

    /** Öğretmen Detayı'ndan "teacherId" ile gelindiğinde autocomplete kutusunda öğretmenin adı görünsün. */
    private async presetTeacherFilter(teacherId: string): Promise<void> {
        try {
            const res = await this.adminApi.getTeacher(teacherId);
            const label = `${res.teacher.firstName} ${res.teacher.lastName}`;
            this.selectedTeacherLabel.set(label);
            this.teacherSearchTerm = label;
        } catch {
            // Öğretmen bulunamadıysa filtre id ile sessizce kalır — liste yine doğru filtrelenir.
        }
    }

    private async loadSummary(): Promise<void> {
        this.summary.set(await this.adminApi.overview());
    }

    onTeacherSearchInput(): void {
        this.teacherSearchOpen.set(true);
        if (this.query.teacherId) {
            // Kullanıcı seçili öğretmenin adını değiştirmeye başladı — filtre geçersiz sayılır.
            this.query.teacherId = '';
            this.selectedTeacherLabel.set('');
        }
        this.teacherSearch$.next(this.teacherSearchTerm.trim());
    }

    private async runTeacherSearch(term: string): Promise<void> {
        if (!term) { this.teacherSearchResults.set([]); return; }
        const res = await this.adminApi.listTeachers({ search: term, page: 1, pageSize: 20, sortBy: 'name' });
        this.teacherSearchResults.set(res.items);
    }

    openTeacherSearch(): void {
        this.teacherSearchOpen.set(true);
        if (this.teacherSearchTerm.trim()) this.teacherSearch$.next(this.teacherSearchTerm.trim());
    }

    selectTeacher(t: TeacherWithCount): void {
        this.query.teacherId = t.id;
        this.selectedTeacherLabel.set(`${t.firstName} ${t.lastName}`);
        this.teacherSearchTerm = `${t.firstName} ${t.lastName}`;
        this.teacherSearchOpen.set(false);
        this.teacherSearchResults.set([]);
        this.reload(1);
    }

    clearTeacherFilter(): void {
        this.query.teacherId = '';
        this.selectedTeacherLabel.set('');
        this.teacherSearchTerm = '';
        this.teacherSearchResults.set([]);
        this.reload(1);
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
        const teacherLabel = this.query.teacherId ? this.selectedTeacherLabel() || null : null;
        const chips = studentFilterChips(this.query, () => this.reload(1), teacherLabel);
        // Öğretmen çipi kapatılınca autocomplete input'u da (isim metni, arama
        // sonuçları) sıfırlansın — yalnızca query.teacherId temizlenmesi yetmez.
        return chips.map(c => c.label.startsWith('Öğretmen:') ? { ...c, clear: () => this.clearTeacherFilter() } : c);
    }

    clearFilters(): void {
        this.query.search = '';
        this.query.teacherId = '';
        this.selectedTeacherLabel.set('');
        this.teacherSearchTerm = '';
        this.teacherSearchResults.set([]);
        this.query.status = '';
        this.query.active = '';
        this.query.scoreMin = null;
        this.query.scoreMax = null;
        this.query.correctRateMin = null;
        this.query.correctRateMax = null;
        this.reload(1);
    }

    openReview(s: StudentWithExam): void {
        this.router.navigate(['/admin/students', s.id, 'review'], { queryParams: { from: 'students' } });
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
    }

    cancelEdit(): void {
        this.editingStudent.set(null);
        this.editError.set(null);
    }

    async saveEdit(): Promise<void> {
        const student = this.editingStudent();
        if (!student) return;
        const validationError = validateEditFields({
            firstName: this.editFirstName, lastName: this.editLastName, username: this.editUsername,
        });
        if (validationError) { this.editError.set(validationError); return; }

        this.editSaving.set(true);
        this.editError.set(null);
        try {
            await this.adminApi.updateStudent(student.id, {
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
    }

    cancelResetPassword(): void {
        this.resettingStudent.set(null);
        this.resetError.set(null);
    }

    async saveResetPassword(): Promise<void> {
        const student = this.resettingStudent();
        if (!student) return;
        const validationError = validateNewPassword(this.resetPassword);
        if (validationError) { this.resetError.set(validationError); return; }

        this.resetSaving.set(true);
        this.resetError.set(null);
        try {
            await this.adminApi.updateStudent(student.id, { password: this.resetPassword });
            this.resettingStudent.set(null);
        } catch (err: any) {
            this.resetError.set(err?.error?.error || 'Şifre sıfırlanamadı.');
        } finally {
            this.resetSaving.set(false);
        }
    }

    statusLabel(status: string): string {
        if (status === 'Completed') return 'Tamamlandı';
        if (status === 'InProgress') return 'Devam Ediyor';
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
