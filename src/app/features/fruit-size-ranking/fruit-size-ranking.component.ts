import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface FruitItem {
    emoji: string;
    label: string;
    displaySize: number;
    correctRank: number;
    userRank: string;
}

interface FruitRow {
    id: number;
    fruits: FruitItem[];
}

interface FruitRankingState {
    ranks: string[][];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'fruit-size-ranking';

@Component({
    selector: 'app-fruit-size-ranking',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './fruit-size-ranking.component.html',
    styleUrl: './fruit-size-ranking.component.scss'
})
export class FruitSizeRankingComponent implements OnInit {
    rows: FruitRow[] = [
        {
            id: 1,
            fruits: [
                { emoji: '🍎', label: 'Elma', displaySize: 50, correctRank: 3, userRank: '' },
                { emoji: '🍊', label: 'Portakal', displaySize: 70, correctRank: 2, userRank: '' },
                { emoji: '🍐', label: 'Armut', displaySize: 90, correctRank: 1, userRank: '' }
            ]
        },
        {
            id: 2,
            fruits: [
                { emoji: '🍎', label: 'Elma', displaySize: 85, correctRank: 1, userRank: '' },
                { emoji: '🍊', label: 'Portakal', displaySize: 65, correctRank: 2, userRank: '' },
                { emoji: '🍐', label: 'Armut', displaySize: 45, correctRank: 3, userRank: '' }
            ]
        }
    ];

    feedbackState: 'correct' | 'wrong' | null = null;

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) { }

    get showHints(): boolean {
        return this.hintService.shouldShowHint(ID);
    }

    get isNextUnlocked(): boolean {
        return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<FruitRankingState>(ID);
        if (saved) {
            saved.ranks.forEach((rowRanks, rowIdx) => {
                rowRanks.forEach((rank, colIdx) => {
                    if (this.rows[rowIdx]?.fruits[colIdx]) {
                        this.rows[rowIdx].fruits[colIdx].userRank = rank;
                    }
                });
            });
            this.feedbackState = saved.feedbackState;
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            ranks: this.rows.map(r => r.fruits.map(f => f.userRank)),
            feedbackState: this.feedbackState
        });
    }

    onRankInput(event: Event, fruit: FruitItem): void {
        const input = event.target as HTMLInputElement;
        // Only allow 1, 2, or 3
        const filtered = input.value.replace(/[^123]/g, '').slice(0, 1);
        fruit.userRank = filtered;
        input.value = filtered;
        this.feedbackState = null;
        this.persist();
    }

    onKeyDown(event: KeyboardEvent): void {
        const allowed = ['1', '2', '3', 'Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'];
        if (!allowed.includes(event.key)) {
            event.preventDefault();
        }
    }

    clearAll(): void {
        this.rows.forEach(r => r.fruits.forEach(f => f.userRank = ''));
        this.feedbackState = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    checkAnswers(): void {
        const allFilled = this.rows.every(r => r.fruits.every(f => f.userRank !== ''));
        if (!allFilled) {
            this.fb.showFeedback('error', 'Lütfen tüm kutucukları doldurun (1, 2 veya 3).');
            return;
        }

        const allRowsDistinct = this.rows.every(row => new Set(row.fruits.map(f => f.userRank)).size === 3);
        if (!allRowsDistinct) {
            this.fb.showFeedback('error', 'Her satırda 1, 2 ve 3 rakamlarının her birini birer kez kullanmalısın!');
            return;
        }

        const isCorrect = this.rows.every(row => {
            const ranksCorrect = row.fruits.every(f => parseInt(f.userRank) === f.correctRank);
            const ranks = row.fruits.map(f => f.userRank);
            const allDifferent = new Set(ranks).size === 3;
            return ranksCorrect && allDifferent;
        });

        this.feedbackState = isCorrect ? 'correct' : 'wrong';

        if (isCorrect) {
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Mükemmel! Meyveleri boyutlarına göre doğru sıraladın!');
        } else {
            this.hintService.registerError(ID);
            this.fb.showFeedback('error', 'Bazı sıralamalar yanlış. Boyutlara dikkat edelim.');
        }
        this.persist();
    }

    isHint(rowIdx: number, colIdx: number): boolean {
        if (!this.showHints) return false;
        const fruit = this.rows[rowIdx].fruits[colIdx];
        return fruit.userRank !== '' && parseInt(fruit.userRank) !== fruit.correctRank;
    }

    getHintValue(rowIdx: number, colIdx: number): string {
        if (!this.showHints) return '';
        const fruit = this.rows[rowIdx].fruits[colIdx];
        if (fruit.userRank === '' || parseInt(fruit.userRank) !== fruit.correctRank) {
            return fruit.correctRank.toString();
        }
        return '';
    }

    goPrev(): void {
        this.router.navigate(['/water-capacity']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/elderly-people']);
    }
}
