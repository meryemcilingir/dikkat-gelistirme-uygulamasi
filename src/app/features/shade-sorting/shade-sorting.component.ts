import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface TriangleItem {
    id: number;
    order: number;
    shade: string;
    clicked: boolean;
    clickStep?: number;
}

interface ShadeSortState {
    triangles: TriangleItem[];
    clickOrder: number[];
}

const ID = 'shade-sorting';

@Component({
    selector: 'app-shade-sorting',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './shade-sorting.component.html',
    styleUrl: './shade-sorting.component.scss',
})
export class ShadeSortingComponent implements OnInit {
    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) { }

    triangles: TriangleItem[] = [];
    /** Öğrencinin tıklama sırasıyla oluşturduğu üçgen id dizisi. */
    clickOrder: number[] = [];

    get isSubmitted(): boolean { return this.gs.isCompleted(ID); }

    ngOnInit(): void {
        const saved = this.gs.getData<ShadeSortState>(ID);
        if (saved) {
            this.triangles = saved.triangles;
            this.clickOrder = saved.clickOrder || [];
        } else {
            this.initGame();
        }
    }

    initGame(): void {
        this.clickOrder = [];
        this.hintService.resetErrors(ID);
        this.triangles = this.buildAndScatter();
    }

    private buildAndScatter(): TriangleItem[] {
        const hStart = 182, hEnd = 189;
        const lStart = 95, lEnd = 12;
        const hStep = (hEnd - hStart) / 11;
        const lStep = (lStart - lEnd) / 11;

        const items: TriangleItem[] = Array.from({ length: 12 }, (_, i) => ({
            id: i, order: i + 1,
            shade: `hsl(${Math.round(hStart + i * hStep)}, 100%, ${Math.round(lStart - i * lStep)}%)`,
            clicked: false, clickStep: undefined,
        }));
        // Sabit karışık sıra
        const fixedOrder = [9, 2, 6, 11, 0, 7, 4, 10, 3, 8, 1, 5];
        return fixedOrder.map((origIdx) => items[origIdx]);
    }

    /** Üçgeni sıraya ekler/çıkarır — doğru sırada olup olmadığına hiç bakılmaz; sonuç yalnızca Gönder'e basılınca belli olur. */
    onTriangleClick(tri: TriangleItem): void {
        if (this.isSubmitted) return;

        if (tri.clicked) {
            // Tekrar tıklayınca sıradan çıkar (düzeltme imkânı)
            this.clickOrder = this.clickOrder.filter(id => id !== tri.id);
            tri.clicked = false;
            tri.clickStep = undefined;
            this.renumber();
        } else {
            this.clickOrder.push(tri.id);
            tri.clicked = true;
            tri.clickStep = this.clickOrder.length;
        }
        this.persist();
    }

    private renumber(): void {
        this.clickOrder.forEach((id, i) => {
            const t = this.triangles.find(x => x.id === id);
            if (t) t.clickStep = i + 1;
        });
    }

    checkAnswer(): void {
        if (this.clickOrder.length === 0) {
            this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
            return;
        }
        if (this.clickOrder.length < this.triangles.length) {
            this.fb.showFeedback('error', 'Lütfen tüm üçgenlere tıklayın!');
            return;
        }

        const allCorrect = this.clickOrder.every((id, i) => {
            const t = this.triangles.find(x => x.id === id);
            return t?.order === i + 1;
        });

        if (allCorrect) {
            this.gs.markCompleted(ID);
            this.fb.showFeedback('success', 'Harika bir iş çıkardın!');
        } else {
            this.hintService.registerError(ID);
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            triangles: this.triangles,
            clickOrder: this.clickOrder,
        });
    }

    /** Tüm ilerlemeyi sıfırlar; sıra sabitlenir */
    restartGame(): void {
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
        this.initGame();
    }

    goPrev(): void { this.router.navigate(['/odd-direction']); }
    goNext(): void {
        if (!this.isSubmitted) return;
        this.router.navigate(['/number-sequence']);
    }
}
