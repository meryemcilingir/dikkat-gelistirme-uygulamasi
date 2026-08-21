import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface OrangeItem {
    id: number;
    isDifferent: boolean;
    isShaking?: boolean;
}

interface OrangeDifferentState {
    selectedId: number | null;
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'orange-different';

// 9 portakal: id 5 farklı (lekeli) — 2. satır sol
const ORANGES: OrangeItem[] = [
    { id: 0, isDifferent: false },
    { id: 1, isDifferent: false },
    { id: 2, isDifferent: false },
    { id: 3, isDifferent: false },
    { id: 4, isDifferent: false },
    { id: 5, isDifferent: true },  // farklı olan — lekeli
    { id: 6, isDifferent: false },
    { id: 7, isDifferent: false },
    { id: 8, isDifferent: false },
];

@Component({
    selector: 'app-orange-different',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './orange-different.component.html',
    styleUrl: './orange-different.component.scss'
})
export class OrangeDifferentComponent implements OnInit {

    oranges: OrangeItem[] = ORANGES.map(o => ({ ...o }));
    selectedId: number | null = null;
    feedbackState: 'correct' | 'wrong' | null = null;

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) {}

    get showHint(): boolean {
        return this.hintService.shouldShowHint(ID);
    }

    get isNextUnlocked(): boolean {
        return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
    }

    isHint(orange: OrangeItem): boolean {
        return this.showHint && orange.isDifferent && this.selectedId !== orange.id;
    }

    ngOnInit(): void {
        const saved = this.gs.getData<OrangeDifferentState>(ID);
        if (saved) {
            this.selectedId = saved.selectedId ?? null;
            this.feedbackState = saved.feedbackState ?? null;
        }
    }

    private persist(): void {
        this.gs.save(ID, { selectedId: this.selectedId, feedbackState: this.feedbackState });
    }

    onSelect(id: number): void {
        if (this.feedbackState === 'correct') return;
        this.selectedId = this.selectedId === id ? null : id;
        this.feedbackState = null;
        this.persist();
    }

    checkAnswer(): void {
        if (this.selectedId === null) {
            this.fb.showFeedback('error', 'Lütfen bir portakal seçin.');
            return;
        }

        const orange = this.oranges.find(o => o.id === this.selectedId)!;

        if (orange.isDifferent) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Doğru! Farklı portakalı buldun!');
        } else {
            this.feedbackState = 'wrong';
            this.hintService.registerError(ID);
            orange.isShaking = true;
            this.fb.showFeedback('error', 'Bu portakal farklı değil. Dikkatli bak!');
            setTimeout(() => (orange.isShaking = false), 500);
        }

        this.persist();
    }

    clearSelection(): void {
        this.selectedId = null;
        this.feedbackState = null;
        this.oranges.forEach(o => o.isShaking = false);
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    goPrev(): void {
        this.router.navigate(['/ball-matching']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/river-branches']);
    }
}
