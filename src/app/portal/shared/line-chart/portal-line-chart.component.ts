import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface LineChartPoint {
    label: string;
    value: number;
}

/**
 * Bağımlılıksız, gerçek zaman serisi verisinden çizilen inline SVG çizgi
 * grafiği. Fake/random veri üretmez — yalnızca `points` girdisindeki gerçek
 * değerlerden path hesaplar. Veri yoksa/tek noktaysa boş durum bileşenin
 * kendi tarafında (host template) gösterilmeli.
 */
@Component({
    selector: 'app-portal-line-chart',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './portal-line-chart.component.html',
    styleUrl: './portal-line-chart.component.scss',
})
export class PortalLineChartComponent {
    @Input() points: LineChartPoint[] = [];
    @Input() height = 120;
    @Input() valueSuffix = '';

    private readonly viewW = 300;
    private readonly viewH = 100;

    get viewBox(): string {
        return `0 0 ${this.viewW} ${this.viewH}`;
    }

    private get values(): number[] {
        return this.points.map(p => p.value);
    }

    private get min(): number {
        return Math.min(0, ...this.values);
    }

    private get max(): number {
        const m = Math.max(...this.values, 1);
        return m === this.min ? m + 1 : m;
    }

    private coords(): { x: number; y: number }[] {
        const n = this.points.length;
        if (n === 0) return [];
        const range = this.max - this.min;
        return this.points.map((p, i) => ({
            x: n === 1 ? this.viewW / 2 : (i / (n - 1)) * this.viewW,
            y: this.viewH - ((p.value - this.min) / range) * this.viewH,
        }));
    }

    get pathD(): string {
        const c = this.coords();
        if (!c.length) return '';
        return c.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ');
    }

    get areaD(): string {
        const c = this.coords();
        if (!c.length) return '';
        const line = c.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ');
        const last = c[c.length - 1];
        const first = c[0];
        return `${line} L ${last.x.toFixed(1)} ${this.viewH} L ${first.x.toFixed(1)} ${this.viewH} Z`;
    }

    get dots(): { x: number; y: number }[] {
        return this.coords();
    }

    get firstLabel(): string {
        return this.points[0]?.label ?? '';
    }

    get lastLabel(): string {
        return this.points[this.points.length - 1]?.label ?? '';
    }
}
