import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

type ShapeKind = 'triangle' | 'circle' | 'square';
type ColorKind = 'red' | 'blue' | 'green';

interface Cell {
    id: number;
    shape: ShapeKind;
    color: ColorKind;
    isTarget: boolean;   // matches both target shape + color
    isSelected: boolean; // user clicked it
}

interface TwoFeatureState {
    cells: { isSelected: boolean }[];
}

const ID = 'two-feature-filter';

@Component({
    selector: 'app-two-feature-filter',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './two-feature-filter.component.html',
    styleUrl: './two-feature-filter.component.scss'
})
export class TwoFeatureFilterComponent implements OnInit {

    readonly TARGET_SHAPE: ShapeKind = 'triangle';
    readonly TARGET_COLOR: ColorKind = 'red';

    // 5×4 = 20 cells. Fixed deterministic layout.
    cells: Cell[] = [
        { id: 0,  shape: 'triangle', color: 'red',   isTarget: true,  isSelected: false },
        { id: 1,  shape: 'circle',   color: 'red',   isTarget: false, isSelected: false },
        { id: 2,  shape: 'triangle', color: 'blue',  isTarget: false, isSelected: false },
        { id: 3,  shape: 'square',   color: 'green', isTarget: false, isSelected: false },
        { id: 4,  shape: 'triangle', color: 'red',   isTarget: true,  isSelected: false },

        { id: 5,  shape: 'square',   color: 'red',   isTarget: false, isSelected: false },
        { id: 6,  shape: 'triangle', color: 'green', isTarget: false, isSelected: false },
        { id: 7,  shape: 'triangle', color: 'red',   isTarget: true,  isSelected: false },
        { id: 8,  shape: 'circle',   color: 'blue',  isTarget: false, isSelected: false },
        { id: 9,  shape: 'triangle', color: 'blue',  isTarget: false, isSelected: false },

        { id: 10, shape: 'circle',   color: 'green', isTarget: false, isSelected: false },
        { id: 11, shape: 'triangle', color: 'red',   isTarget: true,  isSelected: false },
        { id: 12, shape: 'square',   color: 'blue',  isTarget: false, isSelected: false },
        { id: 13, shape: 'triangle', color: 'green', isTarget: false, isSelected: false },
        { id: 14, shape: 'circle',   color: 'red',   isTarget: false, isSelected: false },

        { id: 15, shape: 'triangle', color: 'red',   isTarget: true,  isSelected: false },
        { id: 16, shape: 'square',   color: 'red',   isTarget: false, isSelected: false },
        { id: 17, shape: 'circle',   color: 'blue',  isTarget: false, isSelected: false },
        { id: 18, shape: 'triangle', color: 'blue',  isTarget: false, isSelected: false },
        { id: 19, shape: 'square',   color: 'green', isTarget: false, isSelected: false },
    ];

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) { }

    get isSubmitted(): boolean { return this.gs.isCompleted(ID); }

    ngOnInit(): void {
        const saved = this.gs.getData<TwoFeatureState>(ID);
        if (saved?.cells?.length) {
            this.cells.forEach((c, i) => { if (saved.cells[i]) c.isSelected = saved.cells[i].isSelected; });
        }
    }

    /** Seçimi doğru/yanlış olduğuna bakmadan sessizce açar/kapatır — sonuç yalnızca Gönder'e basılınca belli olur. */
    onCellClick(cell: Cell): void {
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

        const allCorrect = this.cells.every(c => c.isSelected === c.isTarget);

        if (allCorrect) {
            this.gs.markCompleted(ID);
            this.fb.showFeedback('success', 'Harika! Tüm kırmızı üçgenleri buldun!');
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

    goPrev(): void { this.router.navigate(['/balance-scale']); }
    goNext(): void {
        if (!this.isSubmitted) return;
        this.router.navigate(['/subtle-difference']);
    }
}
