import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface Scale {
    id: number;
    leftEmoji: string;
    rightEmoji: string;
    leftCount: number;
    rightCount: number;
    picked: 'left' | 'right' | null;
}

interface BalanceState { scales: { picked: 'left'|'right'|null }[]; }

const ID = 'balance-scale';

@Component({
    selector: 'app-balance-scale',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './balance-scale.component.html',
    styleUrl: './balance-scale.component.scss'
})
export class BalanceScaleComponent implements OnInit {

    scales: Scale[] = [
        { id: 1, leftEmoji: '🍎', rightEmoji: '🍎', leftCount: 5, rightCount: 2, picked: null },
        { id: 2, leftEmoji: '🍓', rightEmoji: '🍓', leftCount: 3, rightCount: 6, picked: null },
        { id: 3, leftEmoji: '🍊', rightEmoji: '🍊', leftCount: 4, rightCount: 7, picked: null },
    ];

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) { }

    get isSubmitted(): boolean { return this.gs.isCompleted(ID); }

    heavierSide(s: Scale): 'left' | 'right' {
        return s.leftCount > s.rightCount ? 'left' : 'right';
    }

    ngOnInit(): void {
        const saved = this.gs.getData<BalanceState>(ID);
        if (saved?.scales?.length) {
            this.scales.forEach((s, i) => { if (saved.scales[i]) s.picked = saved.scales[i].picked; });
        }
    }

    /** Seçimi doğru/yanlış olduğuna bakmadan sessizce kaydeder — sonuç yalnızca Gönder'e basılınca belli olur. */
    pick(scale: Scale, side: 'left' | 'right'): void {
        if (this.isSubmitted) return;
        scale.picked = scale.picked === side ? null : side;
        this.persist();
    }

    checkAnswer(): void {
        if (this.scales.every(s => s.picked === null)) {
            this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
            return;
        }
        if (this.scales.some(s => s.picked === null)) {
            this.fb.showFeedback('error', 'Lütfen tüm terazileri seçin!');
            return;
        }

        const allCorrect = this.scales.every(s => s.picked === this.heavierSide(s));

        if (allCorrect) {
            this.gs.markCompleted(ID);
            this.fb.showFeedback('success', 'Harika! Tüm terazileri çözdün!');
        } else {
            this.hintService.registerError(ID);
        }
    }

    persist(): void {
        this.gs.save(ID, { scales: this.scales.map(s => ({ picked: s.picked })) });
    }

    clearSelection(): void {
        this.scales.forEach(s => { s.picked = null; });
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    items(n: number): number[] { return Array.from({ length: n }, (_, i) => i); }

    goPrev(): void { this.router.navigate(['/shade-sorting-2']); }
    goNext(): void {
        if (!this.isSubmitted) return;
        this.router.navigate(['/two-feature-filter']);
    }
}
