import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface SeqOption {
    id: number;
    symbols: string[];
    isCorrect: boolean;
    isShaking?: boolean;
}

interface SymbolSeqState {
    selectedId: number | null;
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'symbol-sequence-match';

@Component({
    selector: 'app-symbol-sequence-match',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './symbol-sequence-match.component.html',
    styleUrl: './symbol-sequence-match.component.scss'
})
export class SymbolSequenceMatchComponent implements OnInit {

    // Hedef dizi: ◆ ● ■ ◆ ● (5 sembol)
    readonly targetSymbols: string[] = ['◆', '●', '■', '◆', '●'];

    options: SeqOption[] = [
        { id: 1, symbols: ['◆', '●', '■', '●', '◆'], isCorrect: false }, // 4. ve 5. yer değiştirmiş
        { id: 2, symbols: ['●', '◆', '■', '◆', '●'], isCorrect: false }, // 1. ve 2. yer değiştirmiş
        { id: 3, symbols: ['◆', '●', '■', '◆', '●'], isCorrect: true  }, // DOĞRU
        { id: 4, symbols: ['◆', '●', '◆', '■', '●'], isCorrect: false }, // 3. ve 4. yer değiştirmiş
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

    ngOnInit(): void {
        const saved = this.gs.getData<SymbolSeqState>(ID);
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

    clearSelection(): void {
        this.selectedId = null;
        this.feedbackState = null;
        this.options.forEach(o => (o.isShaking = false));
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
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
            this.fb.showFeedback('success', 'Tebrikler! Doğru sembol dizisini buldun!');
        } else {
            this.feedbackState = 'wrong';
            this.hintService.registerError(ID);
            selected.isShaking = true;
            setTimeout(() => (selected.isShaking = false), 500);
            this.fb.showFeedback('error', 'Dikkatli bak! Sembollerin sırası farklı.');
        }
        this.persist();
    }

    goPrev(): void { this.router.navigate(['/number-color-match']); }
    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/shape-matrix']);
    }
}
