import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface RopeOption {
    id: number;
    svgPath: string;
    isCorrect: boolean;
    isShaking?: boolean;
}

interface LongestRopeState {
    selectedId: number | null;
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'longest-rope';

@Component({
    selector: 'app-longest-rope',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './longest-rope.component.html',
    styleUrl: './longest-rope.component.scss',
})
export class LongestRopeComponent implements OnInit {
    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) { }

    // 9x4 grid, distance between dots is 20px. 
    // viewBox = "0 0 180 80"
    // So cx: 10, 30, 50, 70, 90, 110, 130, 150, 170
    // cy: 10, 30, 50, 70
    options: RopeOption[] = [
        {
            id: 1,
            svgPath: 'M 10 10 L 150 10', // straight line (Length: 140)
            isCorrect: false
        },
        {
            id: 2,
            svgPath: 'M 10 30 L 10 10 L 50 10 L 50 30 L 90 30 L 90 10 L 130 10 L 130 30 L 150 30', // square wave
            isCorrect: false
        },
        {
            id: 3,
            svgPath: 'M 10 50 L 10 10 L 30 10 L 30 50 L 50 50 L 50 10 L 70 10 L 70 50 L 90 50 L 90 10', // denser wave
            isCorrect: false
        },
        {
            id: 4,
            svgPath: 'M 10 70 L 10 10 L 30 10 L 30 70 L 50 70 L 50 10 L 70 10 L 70 70 L 90 70 L 90 10 L 110 10 L 110 70', // tallest/densest block
            isCorrect: true
        },
    ];

    selectedId: number | null = null;
    feedbackState: 'correct' | 'wrong' | null = null;

    get showHint(): boolean {
        return this.hintService.shouldShowHint(ID);
    }

    // Create dot coordinates array for template
    dotCols = [10, 30, 50, 70, 90, 110, 130, 150, 170];
    dotRows = [10, 30, 50, 70];

    get isNextUnlocked(): boolean {
        return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<LongestRopeState>(ID);
        if (saved) {
            this.selectedId = saved.selectedId;
            this.feedbackState = saved.feedbackState;
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            selectedId: this.selectedId,
            feedbackState: this.feedbackState
        });
    }

    selectOption(id: number): void {
        if (this.feedbackState === 'correct') return;
        this.selectedId = id;
        this.feedbackState = null;
        this.persist();
    }

    clearSelection(): void {
        this.selectedId = null;
        this.feedbackState = null;
        this.options.forEach((o) => (o.isShaking = false));
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    checkAnswer(): void {
        if (this.selectedId === null) {
            this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
            return;
        }

        if (this.selectedId === null) return;

        const selected = this.options.find((o) => o.id === this.selectedId)!;

        if (selected.isCorrect) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Tebrikler! En uzun ipi buldun!');
        } else {
            this.feedbackState = 'wrong';
            this.hintService.registerError(ID);
            selected.isShaking = true;
            this.fb.showFeedback('error', 'Tekrar Denemelisin');
            setTimeout(() => (selected.isShaking = false), 500);
        }
        this.persist();
    }

    goPrev(): void {
        this.router.navigate(['/liquid-selection']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/letter-matching']);
    }
}
