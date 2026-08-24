import { Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { PortalIconComponent } from '../icon/portal-icon.component';

export interface ShellNavItem {
    label: string;
    icon: string;
    link: string;
}

export interface ShellNavSection {
    label: string;
    items: ShellNavItem[];
}

/**
 * Ortak uygulama shell'i (sidebar + topbar + content) — admin ve öğretmen
 * panelinin ikisi de bunu kullanır, yalnızca `sections` girdisi farklıdır.
 * İçerik <router-outlet> ile gelir; bu component sayfa mantığına karışmaz.
 */
@Component({
    selector: 'app-portal-shell',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, RouterOutlet, PortalIconComponent],
    templateUrl: './portal-shell.component.html',
    styleUrl: './portal-shell.component.scss',
})
export class PortalShellComponent {
    private router = inject(Router);

    @ViewChild('userMenu') private userMenuRef?: ElementRef<HTMLElement>;

    @Input() brandLabel = 'Panel';
    @Input() sections: ShellNavSection[] = [];
    @Input() userName = '';
    @Input() userRole = '';
    @Input() searchPlaceholder = '';
    /** Verilirse arama kutusu görünür ve gönderildiğinde bu rotaya ?q= ile gider. */
    @Input() searchLink: string | null = null;

    @Output() changePassword = new EventEmitter<void>();
    @Output() logout = new EventEmitter<void>();

    readonly userMenuOpen = signal(false);
    readonly sidebarOpen = signal(false);
    readonly collapsed = signal(localStorage.getItem('portal-sidebar-collapsed') === '1');
    readonly currentUrl = signal(this.router.url);
    searchTerm = '';

    constructor() {
        this.router.events
            .pipe(filter(e => e instanceof NavigationEnd))
            .subscribe((e: any) => {
                this.currentUrl.set(e.urlAfterRedirects);
                this.sidebarOpen.set(false);
            });
    }

    get activeLabel(): string {
        for (const section of this.sections) {
            for (const item of section.items) {
                if (this.currentUrl().startsWith(item.link)) return item.label;
            }
        }
        return '';
    }

    get userInitial(): string {
        return (this.userName.trim().charAt(0) || '?').toUpperCase();
    }

    toggleUserMenu(): void {
        this.userMenuOpen.update(v => !v);
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        if (!this.userMenuOpen()) return;
        // Önceden tüm shell'i (sidebar + topbar + tüm sayfa içeriği) referans
        // alıyordu — bu yüzden neredeyse hiçbir tıklama gerçekten "dışarı"
        // sayılmıyor, menü kapanmıyordu. Yalnızca kullanıcı menüsünün kendi
        // alanına bakıyoruz.
        if (!this.userMenuRef?.nativeElement.contains(event.target as Node)) this.closeUserMenu();
    }

    closeUserMenu(): void {
        this.userMenuOpen.set(false);
    }

    toggleSidebar(): void {
        this.sidebarOpen.update(v => !v);
    }

    toggleCollapse(): void {
        this.collapsed.update(v => {
            const next = !v;
            localStorage.setItem('portal-sidebar-collapsed', next ? '1' : '0');
            return next;
        });
    }

    /** Sidebar başlığındaki tek hamburger: mobilde drawer'ı kapatır, masaüstünde daralt/genişlet yapar. */
    onHamburgerClick(): void {
        if (window.innerWidth <= 900) {
            this.sidebarOpen.set(false);
        } else {
            this.toggleCollapse();
        }
    }

    onChangePassword(): void {
        this.closeUserMenu();
        this.changePassword.emit();
    }

    onLogout(): void {
        this.closeUserMenu();
        this.logout.emit();
    }

    submitSearch(): void {
        if (!this.searchLink) return;
        const q = this.searchTerm.trim();
        this.router.navigate([this.searchLink], q ? { queryParams: { q } } : {});
    }
}
