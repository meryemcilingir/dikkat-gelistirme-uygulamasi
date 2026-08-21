import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export type DotColor = 'red' | 'blue' | 'yellow';

interface ColorOption {
    id: number;
    colors: DotColor[];
    isCorrect: boolean;
    isShaking?: boolean;
}

interface ColorPatternState {
    selectedId: number | null;
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'color-pattern-completion';

@Component({
    selector: 'app-color-pattern-completion',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './color-pattern-completion.component.html',
    styleUrl: './color-pattern-completion.component.scss'
})
export class ColorPatternCompletionComponent implements OnInit {

    // Desen: kırmızı, mavi, sarı, kırmızı, mavi → sıradaki iki: sarı, kırmızı
    readonly givenPattern: DotColor[] = ['red', 'blue', 'yellow', 'red', 'blue'];

    options: ColorOption[] = [
        { id: 1, colors: ['red', 'blue'],    isCorrect: false },
        { id: 2, colors: ['yellow', 'red'],  isCorrect: true  },
        { id: 3, colors: ['blue', 'yellow'], isCorrect: false },
        { id: 4, colors: ['red', 'yellow'],  isCorrect: false },
    ];

    selectedId: number | null = null;
    feedbackState: 'correct' | 'wrong' | null = null;

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) {}

    get showHint(): boolean { return this.hintService.shouldShowHint(ID); }
    get isNextUnlocked(): boolean {
        return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
    }
    get selectedColors(): DotColor[] | null {
        const opt = this.options.find(o => o.id === this.selectedId);
        return opt ? opt.colors : null;
    }

    ngOnInit(): void {
        const saved = this.gs.getData<ColorPatternState>(ID);
        if (saved) {
            this.selectedId = saved.selectedId;
            this.feedbackState = saved.feedbackState;
        }
    }

    private persist(): void {
        this.gs.save(ID, { selectedId: this.selectedId, feedbackState: this.feedbackState });
    }

    selectOption(id: number): void {
        if (this.feedbackState === 'correct' || this.gs.isCompleted(ID)) return;
        this.selectedId = this.selectedId === id ? null : id;
        this.feedbackState = null;
        this.persist();
    }

    checkAnswer(): void {
        if (this.selectedId === null) {
            this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
            return;
        }
        const selected = this.options.find(o => o.id === this.selectedId)!;
        if (selected.isCorrect) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Tebrikler! Renk örüntüsünü doğru tamamladın!');
        } else {
            this.feedbackState = 'wrong';
            this.hintService.registerError(ID);
            this.selectedId = null;
            selected.isShaking = true;
            setTimeout(() => (selected.isShaking = false), 500);
            this.fb.showFeedback('error', 'Yanlış seçim. Renk sırasına dikkat et!');
        }
        this.persist();
    }

    clearSelection(): void {
        this.selectedId = null;
        this.feedbackState = null;
        this.options.forEach(o => (o.isShaking = false));
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    goPrev(): void { this.router.navigate(['/arrow-grid-copy']); }
    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/number-grid-match']);
    }
}
