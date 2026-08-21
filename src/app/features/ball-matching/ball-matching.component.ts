import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface Ball {
    id: number;
    pairId: number;   // 0 = the ONE correct pair; 1–14 = unique distractors
    color: string;
    symbols: string[];
    isSelected: boolean;
    isMatched: boolean;
    isWrong: boolean;
}

interface BallMatchingState {
    balls: Ball[];
}

const ID = 'ball-matching';

// The single correct pair
const CORRECT_PAIR = { color: '#65f4fcff', symbols: ['★', '●', '★'] };

// 14 unique distractors — some share color OR symbols with the pair (tricky!)
const DISTRACTORS: Array<{ color: string; symbols: string[] }> = [
    { color: '#65f4fcff', symbols: ['★', '★', '★'] },   // same color, diff symbols
    { color: '#65f4fcff', symbols: ['★', '■', '★'] },   // same color, diff symbols
    { color: '#1cb4a8ff', symbols: ['★', '●', '★'] },   // same symbols, diff color
    { color: '#f472b6', symbols: ['■', '●', '■'] },
    { color: '#64748b', symbols: ['■', '★', '▲'] },
    { color: '#b270f0ff', symbols: ['▲', '●', '▲'] },
    { color: 'rgba(252, 151, 79, 1)', symbols: ['●', '■', '▲'] },
    { color: '#5bf489ff', symbols: ['■', '●', '●'] },
    { color: '#fff567ff', symbols: ['★', '★'] },
    { color: '#fff567ff', symbols: ['●', '★', '●'] },
    { color: '#5bf489ff', symbols: ['▲', '■', '▲'] },
    { color: '#b270f0ff', symbols: ['●', '●', '●'] },
    { color: '#5361ffff', symbols: ['■', '▲', '■'] },
    { color: '#1cb4a8ff', symbols: ['★', '■', '■'] },
];

@Component({
    selector: 'app-ball-matching',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './ball-matching.component.html',
    styleUrl: './ball-matching.component.scss'
})
export class BallMatchingComponent implements OnInit {

    balls: Ball[] = [];
    isChecking = false;

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) { }

    get showHint(): boolean {
        return this.hintService.shouldShowHint(ID);
    }

    get isNextUnlocked(): boolean {
        return this.balls.filter(b => b.isMatched).length === 2
            || this.gs.isCompleted(ID);
    }

    // Hint highlights the two correct-pair balls
    isHint(ball: Ball): boolean {
        return this.showHint && ball.pairId === 0 && !ball.isMatched;
    }

    getSymbolText(symbols: string[]): string {
        return symbols.join(' ');
    }

    getSymbolFontSize(symbols: string[]): number {
        return symbols.length >= 3 ? 13 : 17;
    }

    ngOnInit(): void {
        const saved = this.gs.getData<BallMatchingState>(ID);
        if (saved?.balls?.length) {
            this.balls = saved.balls;
        } else {
            this.balls = this.createBalls();
            this.persist();
        }
    }

    private createBalls(): Ball[] {
        // Build 14 distractor entries
        const distractors: Ball[] = DISTRACTORS.map((def, i) => ({
            id: i + 2,
            pairId: i + 1,
            color: def.color,
            symbols: def.symbols,
            isSelected: false,
            isMatched: false,
            isWrong: false,
        }));

        const pair0: Ball = { id: 0, pairId: 0, color: CORRECT_PAIR.color, symbols: CORRECT_PAIR.symbols, isSelected: false, isMatched: false, isWrong: false };
        const pair1: Ball = { id: 1, pairId: 0, color: CORRECT_PAIR.color, symbols: CORRECT_PAIR.symbols, isSelected: false, isMatched: false, isWrong: false };

        // Place correct pair at positions 3 and 10 (row 0 col 3, row 2 col 2) — not adjacent
        const balls: Ball[] = [...distractors];
        balls.splice(3, 0, pair0);   // index 3  → row 0, col 3
        balls.splice(10, 0, pair1);  // index 10 → row 2, col 2

        // Re-assign sequential ids to match array positions
        balls.forEach((b, i) => b.id = i);

        return balls;
    }

    private persist(): void {
        this.gs.save(ID, { balls: this.balls });
    }

    onBallClick(id: number): void {
        if (this.isChecking || this.isNextUnlocked) return;
        const ball = this.balls.find(b => b.id === id)!;
        if (ball.isMatched) return;

        const selectedCount = this.balls.filter(b => b.isSelected).length;

        if (ball.isSelected) {
            ball.isSelected = false;
        } else if (selectedCount < 2) {
            ball.isSelected = true;
        }
    }

    checkAnswer(): void {
        if (this.isChecking || this.isNextUnlocked) return;

        const selectedBalls = this.balls.filter(b => b.isSelected);
        if (selectedBalls.length !== 2) {
            this.fb.showFeedback('error', 'Lütfen aynı olduğunu düşündüğün iki topu seç.');
            return;
        }

        this.isChecking = true;
        const [first, second] = selectedBalls;

        if (first.pairId === second.pairId) {
            // ✓ Correct! Only pairId 0 can match
            first.isMatched = true;
            second.isMatched = true;
            first.isSelected = false;
            second.isSelected = false;
            this.isChecking = false;

            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Harika! İki özdeş topu buldun!');
            this.persist();
        } else {
            // ✗ Wrong — shake both
            this.hintService.registerError(ID);
            first.isWrong = true;
            second.isWrong = true;
            this.fb.showFeedback('error', 'Bu toplar aynı değil! Tekrar dene.');

            setTimeout(() => {
                first.isWrong = false;
                second.isWrong = false;
                this.isChecking = false;
            }, 800);
        }
    }

    clearSelection(): void {
        this.balls = this.createBalls();
        this.isChecking = false;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    goPrev(): void {
        this.router.navigate(['/symbol-grid-copy']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/orange-different']);
    }
}
