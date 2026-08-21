import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface OptionItem {
    id: number; symbol: string; bgColor: string; isCorrect: boolean;
    top: string; left: string; isShaking: boolean;
}

interface SymbolMatchState {
    selectedId: number | null;
    feedbackState: 'correct' | 'wrong' | null;
}

const CENTER = { symbol: 'T', bgColor: '#4caf8a' };

const RAW_OPTIONS = [
    { id: 0, symbol: 'E', bgColor: '#bf4f6b', isCorrect: false },
    { id: 1, symbol: 'T', bgColor: '#5b6fa6', isCorrect: true },
    { id: 2, symbol: 'K', bgColor: '#c0614c', isCorrect: false },
    { id: 3, symbol: 'F', bgColor: '#4caf8a', isCorrect: false },
    { id: 4, symbol: 'A', bgColor: '#96445a', isCorrect: false },
];

function computeOrbitPositions(count: number): { top: string; left: string }[] {
    const cx = 270, cy = 270, orbitR = 185, elemR = 67; // 540px canvas, 135px daireler
    return Array.from({ length: count }, (_, i) => {
        const rad = (90 - i * (360 / count)) * (Math.PI / 180);
        return {
            top: `${Math.round(cy - orbitR * Math.sin(rad) - elemR)}px`,
            left: `${Math.round(cx + orbitR * Math.cos(rad) - elemR)}px`,
        };
    });
}

const ID = 'symbol-matching';

@Component({
    selector: 'app-symbol-matching',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './symbol-matching.component.html',
    styleUrl: './symbol-matching.component.scss',
})
export class SymbolMatchingComponent implements OnInit {
    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) { }

    readonly center = CENTER;
    options: OptionItem[] = [];
    selectedId: number | null = null;
    feedbackState: 'correct' | 'wrong' | null = null;

    get showHint(): boolean {
        return this.hintService.shouldShowHint(ID);
    }

    get isNextUnlocked(): boolean {
        return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
    }

    ngOnInit(): void {
        const positions = computeOrbitPositions(RAW_OPTIONS.length);
        this.options = RAW_OPTIONS.map((o, i) => ({
            ...o, ...positions[i], isShaking: false,
        }));

        const saved = this.gs.getData<SymbolMatchState>(ID);
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

    /** Seçilen seçeneği işaretler */
    selectOption(id: number): void {
        if (this.feedbackState === 'correct') return;
        this.selectedId = id;
        this.feedbackState = null;
        this.persist();
    }

    /** Tüm seçimi ve ilerlemeyi temizler */
    clearSelection(): void {
        this.selectedId = null;
        this.feedbackState = null;
        this.options.forEach(o => (o.isShaking = false));
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    /** Seçilen seçeneği doğrular */
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
            this.fb.showFeedback('success', 'Tebrikler! Doğru sembolü buldun!');
        } else {
            this.feedbackState = 'wrong';
            this.hintService.registerError(ID);
            selected.isShaking = true;
            this.fb.showFeedback('error', 'Tekrar Denemelisin');
            setTimeout(() => (selected.isShaking = false), 500);
        }
        this.persist();
    }

    goPrev(): void { this.router.navigate(['/number-sequence']); }
    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/multi-condition-selection']);
    }
}
