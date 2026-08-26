import { Injectable, signal } from '@angular/core';

export type PortalTheme = 'light' | 'dark';

const STORAGE_KEY = 'dg_theme';

/**
 * Portal (admin/öğretmen) açık/koyu mod tercihi. Gerçek renkler CSS custom
 * property'lerdedir (bkz. _portal-theme.scss) — bu servis yalnızca <html>
 * üzerindeki [data-theme] attribute'unu yönetir ve tercihi kalıcı kılar.
 * Kullanıcı hiç seçim yapmadıysa sistem tercihi (prefers-color-scheme) geçerli
 * olur — bu durumda [data-theme] hiç set edilmez.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
    readonly theme = signal<PortalTheme | null>(this.readStored());

    constructor() {
        this.apply(this.theme());
    }

    private readStored(): PortalTheme | null {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored === 'light' || stored === 'dark' ? stored : null;
    }

    /** true ise şu an koyu mod (kullanıcı seçimi VEYA sistem tercihi). */
    get isDark(): boolean {
        const explicit = this.theme();
        if (explicit) return explicit === 'dark';
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    toggle(): void {
        this.set(this.isDark ? 'light' : 'dark');
    }

    set(theme: PortalTheme): void {
        this.theme.set(theme);
        localStorage.setItem(STORAGE_KEY, theme);
        this.apply(theme);
    }

    /** Kullanıcı tercihini sıfırlayıp sistem ayarına geri döner. */
    useSystem(): void {
        this.theme.set(null);
        localStorage.removeItem(STORAGE_KEY);
        this.apply(null);
    }

    private apply(theme: PortalTheme | null): void {
        const root = document.documentElement;
        if (theme) root.setAttribute('data-theme', theme);
        else root.removeAttribute('data-theme');
    }
}
