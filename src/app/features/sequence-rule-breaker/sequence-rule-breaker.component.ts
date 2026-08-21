import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface ColumnItem {
    id: number;
    numbers: number[];
    isCorrect: boolean;
    isShaking?: boolean;
}

interface SequenceState {
    selectedId: number | null;
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'sequence-rule-breaker';

@Component({
    selector: 'app-sequence-rule-breaker',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './sequence-rule-breaker.component.html',
    styleUrl: './sequence-rule-breaker.component.scss'
})
export class SequenceRuleBreakerComponent implements OnInit {

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) { }

    columns: ColumnItem[] = [
        { id: 1, numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], isCorrect: false },
        { id: 2, numbers: [1, 2, 3, 5, 4, 6, 7, 8, 9, 10], isCorrect: true }, // Kuralı bozan bu! (4 ve 5 yer değiştirmiş)
        { id: 3, numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], isCorrect: false },
        { id: 4, numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], isCorrect: false },
        { id: 5, numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], isCorrect: false }
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
        const saved = this.gs.getData<SequenceState>(ID);
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

    selectColumn(id: number): void {
        if (this.feedbackState === 'correct' || this.gs.isCompleted(ID)) return;

        // Sadece 1 seçim yapılabilsin (Radio Buton)
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
        this.columns.forEach(c => {
            c.isShaking = false;
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

        const selected = this.columns.find(c => c.id === this.selectedId)!;

        // "isCorrect" true olan, dizilimi HATA barındıran sütundur ve beklenen cevap da budur.
        if (selected.isCorrect) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Tebrikler! Kuralı bozanı fark ettin.');
        } else {
            this.feedbackState = 'wrong';
            this.hintService.registerError(ID);

            selected.isShaking = true;
            setTimeout(() => (selected.isShaking = false), 500);

            this.fb.showFeedback('error', 'Sıralamayı tekrar kontrol etmelisin.');
        }
        this.persist();
    }

    goPrev(): void {
        this.router.navigate(['/shape-to-color-match']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/living-things']);
    }
}
