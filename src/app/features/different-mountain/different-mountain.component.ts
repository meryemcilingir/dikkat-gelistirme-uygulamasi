import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface MountainOption {
    id: number;
    isDifferent: boolean;
    isShaking?: boolean;
}

interface DifferentMountainState {
    selectedId: number | null;
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'different-mountain';

@Component({
    selector: 'app-different-mountain',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './different-mountain.component.html',
    styleUrl: './different-mountain.component.scss'
})
export class DifferentMountainComponent implements OnInit {

    options: MountainOption[] = [
        { id: 1, isDifferent: false },
        { id: 2, isDifferent: false },
        { id: 3, isDifferent: false },
        { id: 4, isDifferent: true },
    ];

    selectedId: number | null = null;
    feedbackState: 'correct' | 'wrong' | null = null;

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
        return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<DifferentMountainState>(ID);
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

    selectMountain(id: number): void {
        if (this.feedbackState === 'correct') return;
        this.selectedId = id;
        this.feedbackState = null;
        this.persist();
    }

    clearSelection(): void {
        this.selectedId = null;
        this.feedbackState = null;
        this.options.forEach(o => o.isShaking = false);
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    checkAnswer(): void {
        if (this.selectedId === null) return;

        const selected = this.options.find(o => o.id === this.selectedId)!;

        if (selected.isDifferent) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Tebrikler! Farklı dağı doğru buldun!');
        } else {
            this.feedbackState = 'wrong';
            this.hintService.registerError(ID);
            this.selectedId = null;
            selected.isShaking = true;
            this.fb.showFeedback('error', 'Yanlış seçim. Dağları dikkatlice karşılaştır.');
            setTimeout(() => (selected.isShaking = false), 500);
        }
        this.persist();
    }

    goPrev(): void {
        this.router.navigate(['/happy-children']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/letter-grid']);
    }
}
