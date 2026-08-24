import { ShellNavSection } from './shell/portal-shell.component';

/**
 * Yönetici ve öğretmen paneli sidebar menüleri — TEK gerçek kaynak. Her iki
 * rol de aynı <app-portal-shell> component'ini kullanır; aralarındaki tek
 * fark bu menü içeriğidir (bkz. admin-dashboard/teacher-dashboard component'leri).
 * Görsel yapı, ölçüler, davranış (collapse/drawer) ikisinde de birebir aynıdır.
 */
export const ADMIN_NAV_SECTIONS: ShellNavSection[] = [
    {
        label: 'Genel',
        items: [
            { label: 'Genel Bakış', icon: 'grid', link: '/admin/overview' },
        ],
    },
    {
        label: 'Yönetim',
        items: [
            { label: 'Öğretmenler', icon: 'users', link: '/admin/teachers' },
            { label: 'Öğrenciler', icon: 'user', link: '/admin/students' },
            { label: 'Sorular', icon: 'file-text', link: '/admin/questions' },
        ],
    },
    {
        label: 'Sistem',
        items: [
            { label: 'Ayarlar', icon: 'settings', link: '/admin/settings' },
        ],
    },
];

export const TEACHER_NAV_SECTIONS: ShellNavSection[] = [
    {
        label: 'Genel',
        items: [
            { label: 'Genel Bakış', icon: 'grid', link: '/teacher/overview' },
        ],
    },
    {
        label: 'Öğrenciler',
        items: [
            { label: 'Öğrencilerim', icon: 'users', link: '/teacher/students' },
        ],
    },
    {
        label: 'Analitik',
        items: [
            { label: 'Sorular', icon: 'file-text', link: '/teacher/questions' },
        ],
    },
];
