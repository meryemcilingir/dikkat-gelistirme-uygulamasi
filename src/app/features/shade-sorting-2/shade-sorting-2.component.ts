import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface CircleItem {
    id: number;
    order: number;
    shade: string;
    clicked: boolean;
    clickStep?: number;
}

interface ShadeSortState {
    circles: CircleItem[];
    clickOrder: number[];
}

const ID = 'shade-sorting-2';

@Component({
    selector: 'app-shade-sorting-2',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './shade-sorting-2.component.html',
    styleUrl: './shade-sorting-2.component.scss',
})
export class ShadeSorting2Component implements OnInit {

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) { }

    circles: CircleItem[] = [];
    /** Öğrencinin tıklama sırasıyla oluşturduğu daire id dizisi. */
    clickOrder: number[] = [];

    get isSubmitted(): boolean { return this.gs.isCompleted(ID); }

    ngOnInit(): void {
        const saved = this.gs.getData<ShadeSortState>(ID);
        if (saved) {
            this.circles = saved.circles;
            this.clickOrder = saved.clickOrder || [];
        } else {
            this.initGame();
        }
    }

    initGame(): void {
        this.clickOrder = [];
        this.hintService.resetErrors(ID);
        this.circles = this.buildAndScatter();
    }

    private buildAndScatter(): CircleItem[] {
        const hue = 265; // mor
        const lStart = 93, lEnd = 18;
        const lStep = (lStart - lEnd) / 11;

        const items: CircleItem[] = Array.from({ length: 12 }, (_, i) => ({
            id: i, order: i + 1,
            shade: `hsl(${hue}, 90%, ${Math.round(lStart - i * lStep)}%)`,
            clicked: false, clickStep: undefined,
        }));
        // Sabit karışık sıra
        const fixedOrder = [8, 1, 10, 4, 11, 2, 7, 0, 5, 9, 3, 6];
        return fixedOrder.map((origIdx) => items[origIdx]);
    }

    /** Daireyi sıraya ekler/çıkarır — doğru sırada olup olmadığına hiç bakılmaz; sonuç yalnızca Gönder'e basılınca belli olur. */
    onCircleClick(circle: CircleItem): void {
        if (this.isSubmitted) return;

        if (circle.clicked) {
            this.clickOrder = this.clickOrder.filter(id => id !== circle.id);
            circle.clicked = false;
            circle.clickStep = undefined;
            this.renumber();
        } else {
            this.clickOrder.push(circle.id);
            circle.clicked = true;
            circle.clickStep = this.clickOrder.length;
        }
        this.persist();
    }

    private renumber(): void {
        this.clickOrder.forEach((id, i) => {
            const c = this.circles.find(x => x.id === id);
            if (c) c.clickStep = i + 1;
        });
    }

    checkAnswer(): void {
        if (this.clickOrder.length === 0) {
            this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
            return;
        }
        if (this.clickOrder.length < this.circles.length) {
            this.fb.showFeedback('error', 'Lütfen tüm dairelere tıklayın!');
            return;
        }

        const allCorrect = this.clickOrder.every((id, i) => {
            const c = this.circles.find(x => x.id === id);
            return c?.order === i + 1;
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
            circles: this.circles,
            clickOrder: this.clickOrder,
        });
    }

    restartGame(): void {
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
        this.initGame();
    }

    goPrev(): void { this.router.navigate(['/symbol-block-match']); }
    goNext(): void {
        if (!this.isSubmitted) return;
        this.router.navigate(['/balance-scale']);
    }
}
