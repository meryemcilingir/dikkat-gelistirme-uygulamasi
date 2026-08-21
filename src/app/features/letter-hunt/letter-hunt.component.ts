import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface LetterCell {
    id: number;
    letter: string;
    isTarget: boolean;
    isMarked: boolean;
    isShaking: boolean;
}

interface LetterHuntState { marks: boolean[]; }

const ID = 'letter-hunt';
const TARGET = 'a';

// Deterministic grid: 8 cols × 6 rows = 48 letters.
// Target 'a' appears exactly 10 times in fixed positions.
const LETTERS: string[] = [
    'e','r','a','s','k','o','n','l',
    'a','i','u','m','e','a','r','t',
    's','o','a','k','l','n','u','a',
    'r','a','e','t','o','k','i','s',
    'l','u','n','a','m','r','e','a',
    'k','s','o','i','a','t','l','u',
];

@Component({
    selector: 'app-letter-hunt',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './letter-hunt.component.html',
    styleUrl: './letter-hunt.component.scss'
})
export class LetterHuntComponent implements OnInit {

    target = TARGET;
    cells: LetterCell[] = LETTERS.map((l, i) => ({
        id: i,
        letter: l,
        isTarget: l === TARGET,
        isMarked: false,
        isShaking: false,
    }));

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) { }

    get showHint(): boolean { return this.hintService.shouldShowHint(ID); }
    get targetCount(): number { return this.cells.filter(c => c.isTarget).length; }
    get markedCount(): number { return this.cells.filter(c => c.isMarked).length; }
    get isNextUnlocked(): boolean { return this.gs.isCompleted(ID); }

    ngOnInit(): void {
        const saved = this.gs.getData<LetterHuntState>(ID);
        if (saved?.marks?.length) {
            this.cells.forEach((c, i) => { if (saved.marks[i] !== undefined) c.isMarked = saved.marks[i]; });
        }
    }

    onCellClick(cell: LetterCell): void {
        if (this.isNextUnlocked) return;
        cell.isMarked = !cell.isMarked;
        this.persist();
    }

    checkAnswer(): void {
        if (this.isNextUnlocked) return;
        if (this.markedCount === 0) {
            this.fb.showFeedback('error', `Önce bulduğun '${this.target}' harflerine tıkla.`);
            return;
        }

        const wrong = this.cells.filter(c => c.isMarked && !c.isTarget);
        const missing = this.cells.filter(c => c.isTarget && !c.isMarked);

        if (wrong.length === 0 && missing.length === 0) {
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', `Harika! Tüm '${this.target}' harflerini buldun!`);
            this.persist();
            return;
        }

        this.hintService.registerError(ID);
        if (wrong.length > 0) {
            wrong.forEach(c => c.isShaking = true);
            setTimeout(() => wrong.forEach(c => { c.isShaking = false; c.isMarked = false; }), 600);
        }
    }

    shouldHint(cell: LetterCell): boolean {
        if (!this.showHint || cell.isMarked) return false;
        const firstUnfound = this.cells.find(c => c.isTarget && !c.isMarked);
        return firstUnfound?.id === cell.id;
    }

    private persist(): void {
        this.gs.save(ID, { marks: this.cells.map(c => c.isMarked) });
    }

    clearSelection(): void {
        this.cells.forEach(c => { c.isMarked = false; c.isShaking = false; });
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    goPrev(): void { this.router.navigate(['/subtle-difference']); }
    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/missing-number']);
    }
}
