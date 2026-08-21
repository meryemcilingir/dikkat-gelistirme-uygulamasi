import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface Pencil {
    color: string; // 'red' | 'orange' | 'green' | 'yellow'
    size: string;  // 'xl' | 'lg' | 'md' | 'sm'
    isSelected: boolean;
    isPaired: boolean;
}

interface MatchLine {
    leftIndex: number;
    rightIndex: number;
    size: string;
}

interface PencilMatchingState {
    leftPencils: Pencil[];
    rightPencils: Pencil[];
    matchLines: MatchLine[];
}

const ID = 'pencil-matching';

@Component({
    selector: 'app-pencil-matching',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './pencil-matching.component.html',
    styleUrl: './pencil-matching.component.scss'
})
export class PencilMatchingComponent implements OnInit {

    // SVG overlay layout constants
    readonly CONTAINER_WIDTH = 560;
    readonly CONTAINER_HEIGHT = 440;
    readonly ITEM_HEIGHT = 110;
    readonly LEFT_ANCHOR_X = 240;  // right edge of left column
    readonly RIGHT_ANCHOR_X = 320; // left edge of right column

    // Left column: fixed order, tips point RIGHT
    leftPencils: Pencil[] = [
        { color: 'red',    size: 'xl', isSelected: false, isPaired: false },
        { color: 'orange', size: 'lg', isSelected: false, isPaired: false },
        { color: 'green',  size: 'md', isSelected: false, isPaired: false },
        { color: 'yellow', size: 'sm', isSelected: false, isPaired: false },
    ];

    // Right column: shuffled, tips point LEFT (flipped)
    rightPencils: Pencil[] = [
        { color: 'green',  size: 'sm', isSelected: false, isPaired: false },
        { color: 'orange', size: 'xl', isSelected: false, isPaired: false },
        { color: 'red',    size: 'lg', isSelected: false, isPaired: false },
        { color: 'yellow', size: 'md', isSelected: false, isPaired: false },
    ];

    matchLines: MatchLine[] = [];
    selectedLeftIndex: number | null = null;

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) {}

    get isSubmitted(): boolean {
        return this.gs.isCompleted(ID);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<PencilMatchingState>(ID);
        if (saved) {
            this.leftPencils = saved.leftPencils || this.leftPencils;
            this.rightPencils = saved.rightPencils || this.rightPencils;
            this.matchLines = saved.matchLines || [];
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            leftPencils: this.leftPencils,
            rightPencils: this.rightPencils,
            matchLines: this.matchLines
        });
    }

    getItemCenterY(index: number): number {
        return index * this.ITEM_HEIGHT + this.ITEM_HEIGHT / 2;
    }

    selectLeft(index: number): void {
        if (this.isSubmitted) return;
        const pencil = this.leftPencils[index];
        if (pencil.isPaired) return;

        if (this.selectedLeftIndex === index) {
            pencil.isSelected = false;
            this.selectedLeftIndex = null;
        } else {
            this.leftPencils.forEach(p => p.isSelected = false);
            pencil.isSelected = true;
            this.selectedLeftIndex = index;
        }
    }

    /** Eşleşmeyi doğru/yanlış olduğuna bakmadan sessizce kaydeder — sonuç yalnızca Gönder'e basılınca belli olur. */
    selectRight(index: number): void {
        if (this.isSubmitted) return;
        if (this.selectedLeftIndex === null) return;
        const right = this.rightPencils[index];
        if (right.isPaired) return;

        const left = this.leftPencils[this.selectedLeftIndex];
        const leftIndex = this.selectedLeftIndex;

        left.isPaired = true;
        right.isPaired = true;
        left.isSelected = false;
        this.matchLines.push({ leftIndex, rightIndex: index, size: left.size });
        this.selectedLeftIndex = null;
        this.persist();
    }

    checkAnswer(): void {
        if (this.matchLines.length === 0) {
            this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
            return;
        }
        if (this.matchLines.length < this.leftPencils.length) {
            this.fb.showFeedback('error', 'Lütfen tüm kalemleri eşleştirin!');
            return;
        }

        const allCorrect = this.matchLines.every(
            l => this.leftPencils[l.leftIndex].size === this.rightPencils[l.rightIndex].size
        );

        if (allCorrect) {
            this.gs.markCompleted(ID);
            this.fb.showFeedback('success', 'Harika! Tüm kalemleri doğru eşleştirdin!');
        } else {
            this.hintService.registerError(ID);
        }
    }

    clearSelection(): void {
        this.leftPencils.forEach(p => { p.isSelected = false; p.isPaired = false; });
        this.rightPencils.forEach(p => { p.isSelected = false; p.isPaired = false; });
        this.matchLines = [];
        this.selectedLeftIndex = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    goPrev(): void {
        this.router.navigate(['/bike-matching']);
    }

    goNext(): void {
        if (!this.isSubmitted) return;
        this.router.navigate(['/symbol-grid-copy']);
    }
}
