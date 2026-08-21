import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface FlowerCell {
    id: number;
    rotation: number;     // degrees
    color: string;        // petal color
    petalScale: number;   // 1 = normal; different if scaled
    centerColor: string;  // center color
    isDifferent: boolean; // whether this one is subtly different
    isSelected: boolean;
}

interface SubtleState { cells: { isSelected: boolean }[]; }

const ID = 'subtle-difference';

// Standart (ortak) özellikler
const STD_COLOR = '#FF9800';
const STD_CENTER = '#FFC107';
const STD_ROT = 0;
const STD_SCALE = 1;

@Component({
    selector: 'app-subtle-difference',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './subtle-difference.component.html',
    styleUrl: './subtle-difference.component.scss'
})
export class SubtleDifferenceComponent implements OnInit {

    // 4×4 = 16 çiçek; 4 tanesi "farklı"
    cells: FlowerCell[] = [];

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) {
        const make = (id: number, diff: Partial<FlowerCell> = {}): FlowerCell => ({
            id,
            rotation: STD_ROT,
            color: STD_COLOR,
            petalScale: STD_SCALE,
            centerColor: STD_CENTER,
            isDifferent: false,
            isSelected: false,
            ...diff,
        });

        this.cells = [
            make(0),
            make(1),
            make(2,  { rotation: 22, isDifferent: true }),             // eğilmiş
            make(3),
            make(4),
            make(5,  { color: '#FFB74D', isDifferent: true }),         // daha soluk turuncu
            make(6),
            make(7),
            make(8),
            make(9,  { petalScale: 0.78, isDifferent: true }),         // küçük taç yaprakları
            make(10),
            make(11),
            make(12),
            make(13),
            make(14, { centerColor: '#FB8C00', isDifferent: true }),   // farklı merkez rengi
            make(15),
        ];
    }

    get isSubmitted(): boolean { return this.gs.isCompleted(ID); }

    ngOnInit(): void {
        const saved = this.gs.getData<SubtleState>(ID);
        if (saved?.cells?.length) {
            this.cells.forEach((c, i) => { if (saved.cells[i]) c.isSelected = saved.cells[i].isSelected; });
        }
    }

    /** Seçimi doğru/yanlış olduğuna bakmadan sessizce açar/kapatır — sonuç yalnızca Gönder'e basılınca belli olur. */
    onCellClick(cell: FlowerCell): void {
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
            this.fb.showFeedback('success', 'Harika! Tüm farklı çiçekleri buldun!');
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

    goPrev(): void { this.router.navigate(['/two-feature-filter']); }
    goNext(): void {
        if (!this.isSubmitted) return;
        this.router.navigate(['/letter-hunt']);
    }
}
