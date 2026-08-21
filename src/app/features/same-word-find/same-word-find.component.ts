import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface WordOption {
    id: number;
    text: string;
    isCorrect: boolean;
    isSelected: boolean;
}

export interface WordSet {
    id: number;
    target: string;
    options: WordOption[];
    color: string;
}

interface SavedState {
    selections: { [optionId: number]: boolean };
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'same-word-find';

@Component({
    selector: 'app-same-word-find',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './same-word-find.component.html',
    styleUrl: './same-word-find.component.scss',
})
export class SameWordFindComponent implements OnInit {
    sets: WordSet[] = this.createFresh();
    feedbackState: 'correct' | 'wrong' | null = null;

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService,
    ) {}

    get showHint(): boolean { return this.hintService.shouldShowHint(ID); }
    get isNextUnlocked(): boolean {
        return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<SavedState>(ID);
        if (saved) {
            this.feedbackState = saved.feedbackState;
            this.sets.forEach(set => {
                set.options.forEach(opt => {
                    if (saved.selections[opt.id] !== undefined) {
                        opt.isSelected = saved.selections[opt.id];
                    }
                });
            });
        }
    }

    private createFresh(): WordSet[] {
        const data = [
            { id: 0, target: 'ARABA', alternatives: ['ARBA', 'ARAABA', 'ARIBA'], color: '#42a5f5' },
            { id: 1, target: 'KALEM', alternatives: ['KALAM', 'KELEM', 'KALEEM'], color: '#ef5350' },
            { id: 2, target: 'KİTAP', alternatives: ['KİPTA', 'KİTAAP', 'KİTAB'], color: '#66bb6a' }
        ];

        // Her set için doğru cevaplar farklı sabit pozisyonlarda - yenilemede değişmez
        const fixedOrders: WordOption[][] = [
            // ARABA: doğru→2. ve 4. şık
            [
                { id: 0, text: data[0].alternatives[0], isCorrect: false, isSelected: false }, // ARBA
                { id: 1, text: data[0].target,          isCorrect: true,  isSelected: false }, // ARABA ✓
                { id: 2, text: data[0].alternatives[1], isCorrect: false, isSelected: false }, // ARAABA
                { id: 3, text: data[0].target,          isCorrect: true,  isSelected: false }, // ARABA ✓
                { id: 4, text: data[0].alternatives[2], isCorrect: false, isSelected: false }, // ARIBA
            ],
            // KALEM: doğru→1. ve 4. şık
            [
                { id: 10, text: data[1].target,          isCorrect: true,  isSelected: false }, // KALEM ✓
                { id: 11, text: data[1].alternatives[0], isCorrect: false, isSelected: false }, // KALAM
                { id: 12, text: data[1].alternatives[1], isCorrect: false, isSelected: false }, // KELEM
                { id: 13, text: data[1].target,          isCorrect: true,  isSelected: false }, // KALEM ✓
                { id: 14, text: data[1].alternatives[2], isCorrect: false, isSelected: false }, // KALEEM
            ],
            // KİTAP: doğru→3. ve 5. şık
            [
                { id: 20, text: data[2].alternatives[0], isCorrect: false, isSelected: false }, // KİPTA
                { id: 21, text: data[2].alternatives[1], isCorrect: false, isSelected: false }, // KİTAAP
                { id: 22, text: data[2].target,          isCorrect: true,  isSelected: false }, // KİTAP ✓
                { id: 23, text: data[2].alternatives[2], isCorrect: false, isSelected: false }, // KİTAB
                { id: 24, text: data[2].target,          isCorrect: true,  isSelected: false }, // KİTAP ✓
            ],
        ];

        return data.map((d, i) => ({
            id: d.id,
            target: d.target,
            options: fixedOrders[i],
            color: d.color
        }));
    }

    private persist(): void {
        const selections: { [key: number]: boolean } = {};
        this.sets.forEach(s => s.options.forEach(o => selections[o.id] = o.isSelected));
        this.gs.save(ID, { selections, feedbackState: this.feedbackState });
    }

    toggle(opt: WordOption): void {
        if (this.feedbackState === 'correct') return;
        opt.isSelected = !opt.isSelected;
        this.feedbackState = null;
        this.persist();
    }

    clearAll(): void {
        this.sets = this.createFresh();
        this.feedbackState = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    checkAnswers(): void {
        const allAttempted = this.sets.every(s => s.options.some(o => o.isSelected));
        if (!allAttempted) {
            this.fb.showFeedback('error', 'Lütfen her grupta bir kelime seçin!');
            return;
        }

        let allCorrect = true;
        this.sets.forEach(s => {
            const setCorrect = s.options.every(o => o.isSelected === o.isCorrect);
            if (!setCorrect) allCorrect = false;
        });

        if (allCorrect) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Harika! Bütün aynı kelimeleri buldun! 📖');
        } else {
            this.hintService.registerError(ID);
            this.feedbackState = 'wrong';
            if (this.showHint) {
                this.sets.forEach(s => {
                    s.options.forEach(o => {
                        if (o.isSelected && !o.isCorrect) o.isSelected = false;
                    });
                });
            }
            this.fb.showFeedback('error', 'Bazı kelimeler yanlış seçilmiş, dikkatli tekrar oku!');
        }
        this.persist();
    }

    goPrev(): void { this.router.navigate(['/sort-by-size']); }
    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/count-given-color']);
    }
}
