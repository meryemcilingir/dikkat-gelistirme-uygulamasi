import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Küçük, tutarlı stroke-stilinde ikon seti (harici kütüphane yok).
 * Sidebar/topbar/analitik kartlarında kullanılır.
 */
@Component({
    selector: 'app-portal-icon',
    standalone: true,
    imports: [CommonModule],
    template: `
    <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <ng-container [ngSwitch]="name">
            <ng-container *ngSwitchCase="'grid'">
                <rect x="3" y="3" width="7" height="7" rx="1.2"></rect>
                <rect x="14" y="3" width="7" height="7" rx="1.2"></rect>
                <rect x="3" y="14" width="7" height="7" rx="1.2"></rect>
                <rect x="14" y="14" width="7" height="7" rx="1.2"></rect>
            </ng-container>
            <ng-container *ngSwitchCase="'users'">
                <circle cx="9" cy="8" r="3.2"></circle>
                <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"></path>
                <circle cx="17.5" cy="8.5" r="2.6"></circle>
                <path d="M15.7 14.2c2.9.4 4.8 2.5 4.8 5.8"></path>
            </ng-container>
            <ng-container *ngSwitchCase="'user'">
                <circle cx="12" cy="8" r="3.6"></circle>
                <path d="M4.5 20c0-4 3.3-6.6 7.5-6.6s7.5 2.6 7.5 6.6"></path>
            </ng-container>
            <ng-container *ngSwitchCase="'chart'">
                <path d="M4 20V10"></path>
                <path d="M11 20V4"></path>
                <path d="M18 20v-7"></path>
                <path d="M3 20h18"></path>
            </ng-container>
            <ng-container *ngSwitchCase="'clipboard-check'">
                <rect x="5" y="4" width="14" height="17" rx="1.5"></rect>
                <path d="M9 3.5h6a1 1 0 011 1V6H8V4.5a1 1 0 011-1z"></path>
                <path d="M9 13l2 2 4-4"></path>
            </ng-container>
            <ng-container *ngSwitchCase="'help-circle'">
                <circle cx="12" cy="12" r="9"></circle>
                <path d="M9.3 9.2a2.7 2.7 0 115.2 1c0 1.6-2.5 1.6-2.5 3.3"></path>
                <path d="M12 17.2v.1"></path>
            </ng-container>
            <ng-container *ngSwitchCase="'search'">
                <circle cx="10.5" cy="10.5" r="6.5"></circle>
                <path d="M20 20l-4.6-4.6"></path>
            </ng-container>
            <ng-container *ngSwitchCase="'chevron-down'">
                <path d="M5 8l7 7 7-7"></path>
            </ng-container>
            <ng-container *ngSwitchCase="'x'">
                <path d="M5 5l14 14"></path>
                <path d="M19 5L5 19"></path>
            </ng-container>
            <ng-container *ngSwitchCase="'menu'">
                <path d="M3 6h18"></path>
                <path d="M3 12h18"></path>
                <path d="M3 18h18"></path>
            </ng-container>
            <ng-container *ngSwitchCase="'key'">
                <circle cx="8" cy="15.5" r="3.5"></circle>
                <path d="M10.6 13 19 4.6"></path>
                <path d="M15.5 8.1l2.4 2.4"></path>
                <path d="M18 5.6L20.4 8"></path>
            </ng-container>
            <ng-container *ngSwitchCase="'logout'">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"></path>
                <path d="M16 17l5-5-5-5"></path>
                <path d="M21 12H9"></path>
            </ng-container>
            <ng-container *ngSwitchCase="'arrow-left'">
                <path d="M19 12H5"></path>
                <path d="M12 19l-7-7 7-7"></path>
            </ng-container>
            <ng-container *ngSwitchCase="'trend-up'">
                <path d="M3 17l6-6 4 4 8-8"></path>
                <path d="M15 7h6v6"></path>
            </ng-container>
            <ng-container *ngSwitchCase="'trend-down'">
                <path d="M3 7l6 6 4-4 8 8"></path>
                <path d="M15 17h6v-6"></path>
            </ng-container>
            <ng-container *ngSwitchCase="'file-text'">
                <path d="M6 2.5h8l4 4V21a1 1 0 01-1 1H6a1 1 0 01-1-1V3.5a1 1 0 011-1z"></path>
                <path d="M14 2.5V7h4"></path>
                <path d="M8 12h8"></path>
                <path d="M8 16h8"></path>
            </ng-container>
            <ng-container *ngSwitchCase="'settings'">
                <path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            </ng-container>
            <ng-container *ngSwitchCase="'panel-collapse'">
                <rect x="3" y="4" width="18" height="16" rx="1.5"></rect>
                <path d="M9.5 4v16"></path>
                <path d="M15 10l-2 2 2 2"></path>
            </ng-container>
            <ng-container *ngSwitchCase="'panel-expand'">
                <rect x="3" y="4" width="18" height="16" rx="1.5"></rect>
                <path d="M9.5 4v16"></path>
                <path d="M13.5 10l2 2-2 2"></path>
            </ng-container>
            <ng-container *ngSwitchCase="'sun'">
                <circle cx="12" cy="12" r="4.2"></circle>
                <path d="M12 2.5v2.4"></path>
                <path d="M12 19.1v2.4"></path>
                <path d="M4.6 4.6l1.7 1.7"></path>
                <path d="M17.7 17.7l1.7 1.7"></path>
                <path d="M2.5 12h2.4"></path>
                <path d="M19.1 12h2.4"></path>
                <path d="M4.6 19.4l1.7-1.7"></path>
                <path d="M17.7 6.3l1.7-1.7"></path>
            </ng-container>
            <ng-container *ngSwitchCase="'moon'">
                <path d="M20.5 14.2A8.5 8.5 0 019.8 3.5a8.5 8.5 0 1010.7 10.7z"></path>
            </ng-container>
        </ng-container>
    </svg>
  `,
})
export class PortalIconComponent {
    @Input() name = 'grid';
    @Input() size = 18;
}
