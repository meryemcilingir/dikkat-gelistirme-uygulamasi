import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface SizeItem {
    id: number;
    emoji: string;
    size: 'small' | 'medium' | 'large';
    correctOrder: number; // 1, 2, 3
    userValue: string;
}

export interface SizeSet {
    id: number;
    items: SizeItem[];
    color: string;
}

interface SavedState {
    values: { [itemId: number]: string };
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'sort-by-size';

@Component({
    selector: 'app-sort-by-size',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './sort-by-size.component.html',
    styleUrl: './sort-by-size.component.scss',
})
export class SortBySizeComponent implements OnInit {
    sets: SizeSet[] = this.createFresh();
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
                set.items.forEach(item => {
                    if (saved.values[item.id] !== undefined) {
                        item.userValue = saved.values[item.id];
                    }
                });
            });
        }
    }

    private createFresh(): SizeSet[] {
        const data = [
            { id: 0, emoji: '🎈', color: '#ec407a' },
            { id: 1, emoji: '🌳', color: '#66bb6a' },
            { id: 2, emoji: '🚗', color: '#42a5f5' }
        ];

        // Her set için sabit ama farklı görüntüleme sırası - yenilemede değişmez
        // Sıralar: [büyük, küçük, orta] / [orta, büyük, küçük] / [küçük, büyük, orta]
        const fixedOrders: Array<[number, number, number]> = [
            [2, 0, 1], // 🎈 Balon: büyük-küçük-orta
            [1, 2, 0], // 🌳 Ağaç: orta-büyük-küçük
            [0, 2, 1], // 🚗 Araba: küçük-büyük-orta
        ];

        return data.map((d, i) => {
            const all: SizeItem[] = [
                { id: d.id * 10 + 0, emoji: d.emoji, size: 'small',  correctOrder: 1, userValue: '' },
                { id: d.id * 10 + 1, emoji: d.emoji, size: 'medium', correctOrder: 2, userValue: '' },
                { id: d.id * 10 + 2, emoji: d.emoji, size: 'large',  correctOrder: 3, userValue: '' }
            ];
            const [a, b, c] = fixedOrders[i];
            return { id: d.id, items: [all[a], all[b], all[c]], color: d.color };
        });
    }

    private persist(): void {
        const values: { [key: number]: string } = {};
        this.sets.forEach(s => s.items.forEach(i => values[i.id] = i.userValue));
        this.gs.save(ID, { values, feedbackState: this.feedbackState });
    }

    onInput(item: SizeItem, val: string): void {
        if (this.feedbackState === 'correct') return;
        // Only allow 1, 2, 3
        const clean = val.replace(/[^1-3]/g, '').slice(0, 1);
        item.userValue = clean;
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
        const allAnswered = this.sets.every(s => s.items.every(i => i.userValue !== ''));
        if (!allAnswered) {
            this.fb.showFeedback('error', 'Lütfen tüm kutucukları (1, 2, 3) doldurun!');
            return;
        }

        const allSetsDistinct = this.sets.every(s => new Set(s.items.map(i => i.userValue)).size === 3);
        if (!allSetsDistinct) {
            this.fb.showFeedback('error', 'Her grupta 1, 2 ve 3 rakamlarının her birini birer kez kullanmalısın!');
            return;
        }

        let allCorrect = true;
        this.sets.forEach(s => {
            const vals = s.items.map(i => i.userValue);
            const isUnique = new Set(vals).size === 3;
            const isMatch = s.items.every(i => parseInt(i.userValue) === i.correctOrder);
            if (!isUnique || !isMatch) allCorrect = false;
        });

        if (allCorrect) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Harika! Nesneleri boyutlarına göre doğru sıraladın! 📏');
        } else {
            this.hintService.registerError(ID);
            this.feedbackState = 'wrong';

            if (this.showHint) {
                this.sets.forEach(s => {
                    s.items.forEach(i => {
                        if (i.userValue !== '' && parseInt(i.userValue) !== i.correctOrder) {
                            i.userValue = '';
                        }
                    });
                });
            }

            this.fb.showFeedback('error', 'Bazı sıralamalar hatalı, tekrar kontrol et!');
        }
        this.persist();
    }

    goPrev(): void { this.router.navigate(['/count-sides']); }
    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/same-word-find']);
    }
}
