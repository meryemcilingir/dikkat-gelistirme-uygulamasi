import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface Bike {
    color: string;
    image: string;
    isSelected: boolean;
    isPaired: boolean;
}

interface MatchLine {
    leftIndex: number;
    rightIndex: number;
    color: string;
}

interface BikeMatchingState {
    leftBikes: Bike[];
    rightBikes: Bike[];
    matchLines: MatchLine[];
}

const ID = 'bike-matching';

@Component({
    selector: 'app-bike-matching',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './bike-matching.component.html',
    styleUrl: './bike-matching.component.scss'
})
export class BikeMatchingComponent implements OnInit {

    // SVG layout constants
    readonly CONTAINER_WIDTH = 540;
    readonly CONTAINER_HEIGHT = 440;
    readonly ITEM_HEIGHT = 110;
    readonly LEFT_ANCHOR_X = 160;
    readonly RIGHT_ANCHOR_X = 380;

    leftBikes: Bike[] = [
        { color: 'sari', image: 'assets/bisiklet-sari.png', isSelected: false, isPaired: false },
        { color: 'yesil', image: 'assets/bisiklet-yesil.png', isSelected: false, isPaired: false },
        { color: 'mavi', image: 'assets/bisiklet-mavi.png', isSelected: false, isPaired: false },
        { color: 'mor', image: 'assets/bisiklet-mor.png', isSelected: false, isPaired: false },
    ];

    rightBikes: Bike[] = [
        { color: 'mavi', image: 'assets/bisiklet-mavi.png', isSelected: false, isPaired: false },
        { color: 'mor', image: 'assets/bisiklet-mor.png', isSelected: false, isPaired: false },
        { color: 'sari', image: 'assets/bisiklet-sari.png', isSelected: false, isPaired: false },
        { color: 'yesil', image: 'assets/bisiklet-yesil.png', isSelected: false, isPaired: false },
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
        const saved = this.gs.getData<BikeMatchingState>(ID);
        if (saved) {
            this.leftBikes = saved.leftBikes || this.leftBikes;
            this.rightBikes = saved.rightBikes || this.rightBikes;
            this.matchLines = saved.matchLines || [];
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            leftBikes: this.leftBikes,
            rightBikes: this.rightBikes,
            matchLines: this.matchLines
        });
    }

    getItemCenterY(index: number): number {
        return index * this.ITEM_HEIGHT + this.ITEM_HEIGHT / 2;
    }

    getLineColor(color: string): string {
        const colorMap: Record<string, string> = {
            sari: '#eab308',
            yesil: '#16a34a',
            mavi: '#2563eb',
            mor: '#7c3aed'
        };
        return colorMap[color] || '#334155';
    }

    selectLeft(index: number): void {
        if (this.isSubmitted) return;
        const bike = this.leftBikes[index];
        if (bike.isPaired) return;

        if (this.selectedLeftIndex === index) {
            bike.isSelected = false;
            this.selectedLeftIndex = null;
        } else {
            this.leftBikes.forEach(b => b.isSelected = false);
            bike.isSelected = true;
            this.selectedLeftIndex = index;
        }
    }

    /** Eşleşmeyi doğru/yanlış olduğuna bakmadan sessizce kaydeder — sonuç yalnızca Gönder'e basılınca belli olur. */
    selectRight(index: number): void {
        if (this.isSubmitted) return;
        if (this.selectedLeftIndex === null) return;
        const rightBike = this.rightBikes[index];
        if (rightBike.isPaired) return;

        const leftBike = this.leftBikes[this.selectedLeftIndex];
        const leftIndex = this.selectedLeftIndex;

        leftBike.isPaired = true;
        rightBike.isPaired = true;
        leftBike.isSelected = false;
        this.matchLines.push({ leftIndex, rightIndex: index, color: leftBike.color });
        this.selectedLeftIndex = null;
        this.persist();
    }

    checkAnswer(): void {
        if (this.matchLines.length === 0) {
            this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
            return;
        }
        if (this.matchLines.length < this.leftBikes.length) {
            this.fb.showFeedback('error', 'Lütfen tüm bisikletleri eşleştirin!');
            return;
        }

        const allCorrect = this.matchLines.every(
            l => this.leftBikes[l.leftIndex].color === this.rightBikes[l.rightIndex].color
        );

        if (allCorrect) {
            this.gs.markCompleted(ID);
            this.fb.showFeedback('success', 'Harika! Tüm bisikletleri doğru eşleştirdin!');
        } else {
            this.hintService.registerError(ID);
        }
    }

    clearSelection(): void {
        this.leftBikes.forEach(b => { b.isSelected = false; b.isPaired = false; });
        this.rightBikes.forEach(b => { b.isSelected = false; b.isPaired = false; });
        this.matchLines = [];
        this.selectedLeftIndex = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    goPrev(): void {
        this.router.navigate(['/dot-grid-copy']);
    }

    goNext(): void {
        if (!this.isSubmitted) return;
        this.router.navigate(['/pencil-matching']);
    }
}
