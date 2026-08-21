import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface CatItem { id: number; isFlipped: boolean; isShaking?: boolean; }

const GAME: CatItem[] = [
    { id: 0, isFlipped: false },
    { id: 1, isFlipped: false },
    { id: 2, isFlipped: true }, // ← doğru cevap
    { id: 3, isFlipped: false },
    { id: 4, isFlipped: false },
];

interface OddDirState {
    selectedId: number;
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'odd-direction';

@Component({
    selector: 'app-odd-direction',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './odd-direction.component.html',
    styleUrl: './odd-direction.component.scss',
})
export class OddDirectionComponent implements OnInit {
    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) { }

    readonly cats = GAME;
    selectedId: number = -1;
    feedbackState: 'correct' | 'wrong' | null = null;

    get showHint(): boolean {
        return this.hintService.shouldShowHint(ID);
    }

    get isNextUnlocked(): boolean { return this.feedbackState === 'correct' || this.gs.isCompleted(ID); }
    get isLocked(): boolean { return this.feedbackState === 'correct'; }

    // ── Lifecycle ─────────────────────────────────────────
    ngOnInit(): void {
        const saved = this.gs.getData<OddDirState>(ID);
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

    // ── Etkileşim ─────────────────────────────────────────
    /** Bir kedi seçer; oyun kilitliyse işlem yapmaz */
    selectCat(id: number): void {
        if (this.isLocked) return;
        this.selectedId = id;
        this.feedbackState = null;
        this.cats.forEach(c => c.isShaking = false);
        this.persist();
    }

    /** Seçilen kediyi doğrular; 2 hatadan sonra ipucu gösterir */
    checkAnswer(): void {
        if (this.selectedId === -1) {
            this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
            return;
        }

        if (this.selectedId === -1) {
            this.feedbackState = 'wrong';
            this.fb.showFeedback('error', 'Önce bir kedi seç!');
            this.persist();
            return;
        }

        const correct = GAME.find(c => c.isFlipped);
        const isCorrect = correct?.id === this.selectedId;
        this.feedbackState = isCorrect ? 'correct' : 'wrong';

        if (isCorrect) {
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Tebrikler! Doğru kediyi buldun!');
        } else {
            this.hintService.registerError(ID);

            const selectedCat = this.cats.find(c => c.id === this.selectedId);
            if (selectedCat) {
                selectedCat.isShaking = true;
                setTimeout(() => {
                    selectedCat.isShaking = false;
                }, 500);
            }

            this.selectedId = -1;
            this.fb.showFeedback('error', 'Tekrar Denemelisin');
        }
        this.persist();
    }

    /** Tüm ilerlemeyi sıfırlar ve oyunu baştan başlatır */
    restartActivity(): void {
        this.selectedId = -1;
        this.feedbackState = null;
        this.cats.forEach(c => c.isShaking = false);
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    // ── Navigasyon ────────────────────────────────────────
    goPrev(): void { this.router.navigate(['/pattern']); }
    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/shade-sorting']);
    }
}
