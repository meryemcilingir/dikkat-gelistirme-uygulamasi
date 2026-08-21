import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AdminService, AdminOverview } from '../../../core/services/admin.service';
import { StudentQuery } from '../../../core/models/user.model';

/**
 * Sınav Yönetimi (/admin/exams). Mevcut sistemde tek bir 150 soruluk
 * değerlendirme olduğu için bu sayfa çoklu "sınav" kavramı uydurmaz —
 * mevcut tek değerlendirmenin atama/tamamlama durumunu özetler ve
 * öğrenci/öğretmen bazlı ekranlara drill-down sağlar. Yeni bir backend
 * endpoint'i gerekmez; getOverviewStats() üzerindeki gerçek verileri kullanır.
 */
@Component({
    selector: 'app-admin-exams',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './admin-exams.component.html',
    styleUrl: './admin-exams.component.scss',
})
export class AdminExamsComponent implements OnInit {
    private adminApi = inject(AdminService);
    private router = inject(Router);

    readonly overview = signal<AdminOverview | null>(null);
    readonly loading = signal(true);

    async ngOnInit(): Promise<void> {
        this.overview.set(await this.adminApi.overview());
        this.loading.set(false);
    }

    get startedCount(): number {
        const o = this.overview();
        if (!o) return 0;
        return o.examSummary.completed + o.examSummary.inProgress;
    }

    get completionRate(): number | null {
        const o = this.overview();
        if (!o || !o.studentCount) return null;
        return Math.round((o.examSummary.completed / o.studentCount) * 100);
    }

    viewStudents(status?: StudentQuery['status']): void {
        this.router.navigate(['/admin/students'], status ? { queryParams: { status } } : {});
    }

    viewTeachers(): void {
        this.router.navigate(['/admin/teachers']);
    }
}
