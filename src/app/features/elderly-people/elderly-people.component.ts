import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface PersonItem {
    id: number;
    emoji: string;
    label: string;
    isElderly: boolean;
    selected: boolean;
}

interface PersonRow {
    id: number;
    people: PersonItem[];
}

interface ElderlyPeopleState {
    selections: boolean[][];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'elderly-people';

@Component({
    selector: 'app-elderly-people',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './elderly-people.component.html',
    styleUrl: './elderly-people.component.scss'
})
export class ElderlyPeopleComponent implements OnInit {
    rows: PersonRow[] = [
        {
            id: 1,
            people: [
                { id: 1, emoji: '👴', label: 'Dede', isElderly: true, selected: false },
                { id: 2, emoji: '👩', label: 'Genç Kadın', isElderly: false, selected: false },
                { id: 3, emoji: '👵', label: 'Nine', isElderly: true, selected: false }
            ]
        },
        {
            id: 2,
            people: [
                { id: 4, emoji: '👦', label: 'Çocuk', isElderly: false, selected: false },
                { id: 5, emoji: '🧓', label: 'Yaşlı', isElderly: true, selected: false },
                { id: 6, emoji: '👧', label: 'Kız Çocuk', isElderly: false, selected: false }
            ]
        }
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
        const saved = this.gs.getData<ElderlyPeopleState>(ID);
        if (saved) {
            saved.selections.forEach((rowSels, rIdx) => {
                rowSels.forEach((sel, cIdx) => {
                    if (this.rows[rIdx]?.people[cIdx]) {
                        this.rows[rIdx].people[cIdx].selected = sel;
                    }
                });
            });
            this.feedbackState = saved.feedbackState;
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            selections: this.rows.map(r => r.people.map(p => p.selected)),
            feedbackState: this.feedbackState
        });
    }

    togglePerson(rowIdx: number, personIdx: number): void {
        if (this.gs.isCompleted(ID) && this.feedbackState === 'correct') return;
        this.rows[rowIdx].people[personIdx].selected = !this.rows[rowIdx].people[personIdx].selected;
        this.feedbackState = null;
        this.persist();
    }

    clearSelections(): void {
        this.rows.forEach(r => r.people.forEach(p => p.selected = false));
        this.feedbackState = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    checkAnswers(): void {
        const anySelected = this.rows.some(r => r.people.some(p => p.selected));
        if (!anySelected) {
            this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce tüm yaşlıları seçin!');
            return;
        }

        const isCorrect = this.rows.every(row =>
            row.people.every(p => p.selected === p.isElderly)
        );

        this.feedbackState = isCorrect ? 'correct' : 'wrong';

        if (isCorrect) {
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Harika! Yaşlı kişileri doğru buldun!');
        } else {
            this.hintService.registerError(ID);
            this.fb.showFeedback('error', 'Bazı seçimler yanlış. Yaşlı olanları tekrar incele.');
        }
        this.persist();
    }

    isHintAdd(rowIdx: number, personIdx: number): boolean {
        if (!this.showHints) return false;
        const person = this.rows[rowIdx].people[personIdx];
        return person.isElderly && !person.selected;
    }

    isHintRemove(rowIdx: number, personIdx: number): boolean {
        if (!this.showHints) return false;
        const person = this.rows[rowIdx].people[personIdx];
        return !person.isElderly && person.selected;
    }

    goPrev(): void {
        this.router.navigate(['/fruit-size-ranking']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/find-different']);
    }
}
