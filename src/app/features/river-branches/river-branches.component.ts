import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface River {
    id: number;
    branches: number;   // kol sayısı
    isCorrect: boolean; // en çok kolu olan
    isShaking?: boolean;
}

interface RiverBranchesState {
    selectedId: number | null;
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'river-branches';

@Component({
    selector: 'app-river-branches',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './river-branches.component.html',
    styleUrl: './river-branches.component.scss'
})
export class RiverBranchesComponent implements OnInit {

    rivers: River[] = [
        { id: 0, branches: 3, isCorrect: false },
        { id: 1, branches: 5, isCorrect: false },
        { id: 2, branches: 2, isCorrect: false },
        { id: 3, branches: 4, isCorrect: false },
        { id: 4, branches: 3, isCorrect: false },
        { id: 5, branches: 6, isCorrect: true },  // en çok kol — doğru cevap
    ];

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

    ngOnInit(): void {
        const saved = this.gs.getData<RiverBranchesState>(ID);
        if (saved) {
            this.selectedId = saved.selectedId ?? null;
            this.feedbackState = saved.feedbackState ?? null;
        }
    }

    private persist(): void {
        this.gs.save(ID, { selectedId: this.selectedId, feedbackState: this.feedbackState });
    }

    selectRiver(id: number): void {
        if (this.feedbackState === 'correct') return;
        this.selectedId = this.selectedId === id ? null : id;
        this.feedbackState = null;
        this.persist();
    }

    checkAnswer(): void {
        if (this.selectedId === null) {
            this.fb.showFeedback('error', 'Lütfen bir nehir seçin.');
            return;
        }
        const river = this.rivers.find(r => r.id === this.selectedId)!;
        if (river.isCorrect) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Doğru! En çok kolu olan nehri buldun!');
        } else {
            this.feedbackState = 'wrong';
            this.hintService.registerError(ID);
            river.isShaking = true;
            this.fb.showFeedback('error', 'Yanlış! Kolları dikkatlice say.');
            setTimeout(() => (river.isShaking = false), 500);
        }
        this.persist();
    }

    clearSelection(): void {
        this.selectedId = null;
        this.feedbackState = null;
        this.rivers.forEach(r => r.isShaking = false);
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    goPrev(): void {
        this.router.navigate(['/orange-different']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/symbol-grid-matching']);
    }
}
