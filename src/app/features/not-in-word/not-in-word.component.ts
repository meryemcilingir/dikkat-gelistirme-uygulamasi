import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface LetterItem {
    id: number;
    char: string;
    color: string;
    isSelected: boolean;
}

interface NotInWordState {
    selections: boolean[];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'not-in-word';

@Component({
    selector: 'app-not-in-word',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './not-in-word.component.html',
    styleUrl: './not-in-word.component.scss'
})
export class NotInWordComponent implements OnInit {
    targetWord = 'OKUL';
    targetChars = new Set(['O', 'K', 'U', 'L']);

    letters: LetterItem[] = [
        { id: 0, char: 'a', color: '#4caf8a', isSelected: false },
        { id: 1, char: 'o', color: '#5b6fa6', isSelected: false },
        { id: 2, char: 'f', color: '#bf4f6b', isSelected: false },
        { id: 3, char: 'k', color: '#4caf8a', isSelected: false },
        { id: 4, char: 'u', color: '#bf4f6b', isSelected: false },
        { id: 5, char: 'h', color: '#5b6fa6', isSelected: false },
        { id: 6, char: 'l', color: '#4caf8a', isSelected: false },
        { id: 7, char: 'm', color: '#bf4f6b', isSelected: false },
        { id: 8, char: 'o', color: '#4caf8a', isSelected: false },
        { id: 9, char: 'e', color: '#5b6fa6', isSelected: false },
        { id: 10, char: 'k', color: '#bf4f6b', isSelected: false },
        { id: 11, char: 'n', color: '#4caf8a', isSelected: false },
        { id: 12, char: 'u', color: '#5b6fa6', isSelected: false },
        { id: 13, char: 'z', color: '#bf4f6b', isSelected: false }
    ];

    feedbackState: 'correct' | 'wrong' | null = null;

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) { }

    get showHints(): boolean {
        return this.hintService.shouldShowHint(ID);
    }

    get isNextUnlocked(): boolean {
        return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<NotInWordState>(ID);
        if (saved) {
            saved.selections.forEach((sel, i) => {
                if (this.letters[i]) this.letters[i].isSelected = sel;
            });
            this.feedbackState = saved.feedbackState;
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            selections: this.letters.map(l => l.isSelected),
            feedbackState: this.feedbackState
        });
    }

    toggleLetter(id: number): void {
        if (this.gs.isCompleted(ID) && this.feedbackState === 'correct') return;
        this.letters[id].isSelected = !this.letters[id].isSelected;
        this.feedbackState = null;
        this.persist();
    }

    clearSelections(): void {
        this.letters.forEach(l => l.isSelected = false);
        this.feedbackState = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    checkPattern(): void {
        if (!this.letters.some(i => i.isSelected)) {
            this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
            return;
        }

        const isCorrect = this.letters.every(l => {
            const isCharInWord = this.targetChars.has(l.char.toUpperCase());
            const shouldBeSelected = !isCharInWord;
            return l.isSelected === shouldBeSelected;
        });

        this.feedbackState = isCorrect ? 'correct' : 'wrong';

        if (isCorrect) {
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Harika! "OKUL" kelimesinde olmayan bütün harfleri buldun.');
        } else {
            this.hintService.registerError(ID);
            this.fb.showFeedback('error', 'Bazı harfler yanlış seçilmiş veya eksik, tekrar kontrol et.');
        }
        this.persist();
    }

    isHintAdd(id: number): boolean {
        if (!this.showHints) return false;
        const l = this.letters[id];
        const isCharInWord = this.targetChars.has(l.char.toUpperCase());
        return !isCharInWord && !l.isSelected;
    }

    isHintRemove(id: number): boolean {
        if (!this.showHints) return false;
        const l = this.letters[id];
        const isCharInWord = this.targetChars.has(l.char.toUpperCase());
        return isCharInWord && l.isSelected;
    }

    goPrev(): void {
        this.router.navigate(['/flower-coloring']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/finding-green-lines']);
    }
}
