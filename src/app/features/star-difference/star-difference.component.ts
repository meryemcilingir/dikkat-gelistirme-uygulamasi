import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface StarCell {
    id: number;
    rotation: number;
    fillColor: string;
    scale: number;
    innerRadius: number;
    isDifferent: boolean;
    isSelected: boolean;
}

interface StarDifferenceState { cells: { isSelected: boolean }[]; }

const ID = 'star-difference';

const STD_COLOR = '#FFD700';
const STD_ROT = 0;
const STD_SCALE = 1;
const STD_INNER = 17;
const OUTER_R = 40;

@Component({
    selector: 'app-star-difference',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './star-difference.component.html',
    styleUrl: './star-difference.component.scss'
})
export class StarDifferenceComponent implements OnInit {

    cells: StarCell[] = [];

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) {
        const make = (id: number, diff: Partial<StarCell> = {}): StarCell => ({
            id,
            rotation: STD_ROT,
            fillColor: STD_COLOR,
            scale: STD_SCALE,
            innerRadius: STD_INNER,
            isDifferent: false,
            isSelected: false,
            ...diff,
        });

        // 4×4 = 16 yıldız, 4 tanesi "farklı"
        this.cells = [
            make(0),
            make(1),
            make(2,  { rotation: 20, isDifferent: true }),          // hafif eğilmiş yıldız
            make(3),
            make(4),
            make(5),
            make(6),
            make(7,  { fillColor: '#FFB347', isDifferent: true }),   // turuncu-sarı ton
            make(8),
            make(9),
            make(10, { innerRadius: 24, isDifferent: true }),        // kalın, az sivri yıldız
            make(11),
            make(12),
            make(13, { scale: 0.72, isDifferent: true }),            // küçük yıldız
            make(14),
            make(15),
        ];
    }

    getStarPoints(innerR: number): string {
        const points: string[] = [];
        for (let k = 0; k < 10; k++) {
            const r = k % 2 === 0 ? OUTER_R : innerR;
            const angle = (k * 36 - 90) * Math.PI / 180;
            points.push(`${(r * Math.cos(angle)).toFixed(1)},${(r * Math.sin(angle)).toFixed(1)}`);
        }
        return points.join(' ');
    }

    get isSubmitted(): boolean { return this.gs.isCompleted(ID); }

    ngOnInit(): void {
        const saved = this.gs.getData<StarDifferenceState>(ID);
        if (saved?.cells?.length) {
            this.cells.forEach((c, i) => { if (saved.cells[i]) c.isSelected = saved.cells[i].isSelected; });
        }
    }

    /** Seçimi doğru/yanlış olduğuna bakmadan sessizce açar/kapatır — sonuç yalnızca Gönder'e basılınca belli olur. */
    onCellClick(cell: StarCell): void {
        if (this.isSubmitted) return;
        cell.isSelected = !cell.isSelected;
        this.persist();
    }

    checkAnswer(): void {
        const selectedCount = this.cells.filter(c => c.isSelected).length;
        if (selectedCount === 0) {
            this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
            return;
        }

        const allCorrect = this.cells.every(c => c.isSelected === c.isDifferent);

        if (allCorrect) {
            this.gs.markCompleted(ID);
            this.fb.showFeedback('success', 'Harika! Tüm farklı yıldızları buldun!');
        } else {
            this.hintService.registerError(ID);
        }
    }

    private persist(): void {
        this.gs.save(ID, { cells: this.cells.map(c => ({ isSelected: c.isSelected })) });
    }

    clearSelection(): void {
        this.cells.forEach(c => { c.isSelected = false; });
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    goPrev(): void { this.router.navigate(['/count-given-color']); }
    goNext(): void {
        if (!this.isSubmitted) return;
        this.router.navigate(['/fruit-sequence']);
    }
}
