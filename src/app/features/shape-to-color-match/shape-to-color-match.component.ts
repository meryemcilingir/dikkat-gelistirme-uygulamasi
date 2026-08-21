import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export type ShapeOutline = 'square' | 'triangle';
export type CircleColor = 'red' | 'yellow';

interface OptionItem {
    id: number;
    colors: CircleColor[];
    isCorrect: boolean;
    isShaking?: boolean;
}

interface ShapeColorState {
    selectedId: number | null;
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'shape-to-color-match';

@Component({
    selector: 'app-shape-to-color-match',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './shape-to-color-match.component.html',
    styleUrl: './shape-to-color-match.component.scss'
})
export class ShapeToColorMatchComponent implements OnInit {

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) { }

    readonly referenceGrid: ShapeOutline[] = [
        'square', 'triangle', 'square',
        'triangle', 'square', 'triangle',
        'square', 'triangle', 'square'
    ];

    options: OptionItem[] = [
        // 1: Doğru (Kare=Kırmızı, Üçgen=Sarı)
        {
            id: 1,
            colors: ['red', 'yellow', 'red', 'yellow', 'red', 'yellow', 'red', 'yellow', 'red'],
            isCorrect: true
        },
        // 2: Çeldirici (Sıralar bozuk)
        {
            id: 2,
            colors: ['red', 'red', 'yellow', 'red', 'yellow', 'red', 'yellow', 'red', 'yellow'],
            isCorrect: false
        },
        // 3: Çeldirici 
        {
            id: 3,
            colors: ['yellow', 'red', 'red', 'red', 'yellow', 'yellow', 'yellow', 'yellow', 'red'],
            isCorrect: false
        }
    ];

    selectedId: number | null = null;
    feedbackState: 'correct' | 'wrong' | null = null;

    get showHint(): boolean {
        return this.hintService.shouldShowHint(ID);
    }

    get isNextUnlocked(): boolean {
        return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<ShapeColorState>(ID);
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
        if (this.feedbackState === 'correct' || this.gs.isCompleted(ID)) return;

        // Radio button mantığı
        if (this.selectedId === id) {
            this.selectedId = null;
        } else {
            this.selectedId = id;
        }

        this.feedbackState = null;
        this.persist();
    }

    clearSelection(): void {
        this.selectedId = null;
        this.feedbackState = null;
        this.options.forEach(o => {
            o.isShaking = false;
        });
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    checkAnswer(): void {
        if (this.selectedId === null) {
            this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
            return;
        }

        if (this.selectedId === null) return;

        const selected = this.options.find(o => o.id === this.selectedId)!;

        if (selected.isCorrect) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Tebrikler! Doğru renk dizilimini buldun.');
        } else {
            this.feedbackState = 'wrong';
            this.hintService.registerError(ID);

            selected.isShaking = true;
            setTimeout(() => (selected.isShaking = false), 500);

            this.fb.showFeedback('error', 'Yanlış seçim, referans tabloya dikkatli bak.');
        }
        this.persist();
    }

    goPrev(): void {
        this.router.navigate(['/board-letter-matching']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/sequence-rule-breaker']);
    }
}
