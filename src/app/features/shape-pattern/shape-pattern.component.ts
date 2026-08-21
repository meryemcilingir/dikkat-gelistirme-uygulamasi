import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export type ShapeType = 'square-green' | 'heart-pink' | 'triangle-yellow' | 'plus-black' | 'circle-blue';

interface OptionItem {
    id: number;
    sequence: ShapeType[];
    isCorrect: boolean;
    isShaking?: boolean;
}

interface ShapePatternState {
    selectedId: number | null;
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'shape-pattern';

@Component({
    selector: 'app-shape-pattern',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './shape-pattern.component.html',
    styleUrl: './shape-pattern.component.scss'
})
export class ShapePatternComponent implements OnInit {

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) { }

    readonly targetPattern: ShapeType[] = [
        'square-green', 'heart-pink', 'triangle-yellow', 'plus-black', 'heart-pink', 'plus-black', 'circle-blue'
    ];

    options: OptionItem[] = [
        // 1: Yanlış, daire baştan 3. sırada
        { id: 1, sequence: ['square-green', 'heart-pink', 'circle-blue', 'plus-black', 'triangle-yellow', 'heart-pink', 'plus-black'], isCorrect: false },
        // 2: Yanlış, tamamen farklı başlangıç
        { id: 2, sequence: ['triangle-yellow', 'heart-pink', 'plus-black', 'circle-blue', 'heart-pink', 'plus-black', 'square-green'], isCorrect: false },
        // 3: Yanlış, iki tane circle-blue var
        { id: 3, sequence: ['square-green', 'heart-pink', 'circle-blue', 'plus-black', 'triangle-yellow', 'heart-pink', 'circle-blue'], isCorrect: false },
        // 4: Yanlış, sadece son ikisi ters
        { id: 4, sequence: ['square-green', 'heart-pink', 'triangle-yellow', 'plus-black', 'heart-pink', 'circle-blue', 'plus-black'], isCorrect: false },
        // 5: Yanlış, artı işareti eksik
        { id: 5, sequence: ['square-green', 'heart-pink', 'triangle-yellow', 'plus-black', 'heart-pink', 'heart-pink', 'circle-blue'], isCorrect: false },
        // 6: Doğru
        { id: 6, sequence: [...this.targetPattern], isCorrect: true }
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
        const saved = this.gs.getData<ShapePatternState>(ID);
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

        // Radio button logic
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
            this.fb.showFeedback('success', 'Tebrikler! Doğru örüntüyü buldun.');
        } else {
            this.feedbackState = 'wrong';
            this.hintService.registerError(ID);

            selected.isShaking = true;
            setTimeout(() => (selected.isShaking = false), 500);

            this.fb.showFeedback('error', 'Yanlış örüntü, tekrar dene.');
        }
        this.persist();
    }

    goPrev(): void {
        this.router.navigate(['/letter-matching']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/board-letter-matching']);
    }
}
