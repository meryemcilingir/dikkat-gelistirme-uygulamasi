import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface ProfessionItem {
    key: string;
    emoji?: string;
    label?: string;
    isSelected: boolean;
    isPaired: boolean;
}

interface MatchLine {
    leftIndex: number;
    rightIndex: number;
    key: string;
}

interface ProfessionMatchingState {
    leftItems: ProfessionItem[];
    rightItems: ProfessionItem[];
    matchLines: MatchLine[];
}

const ID = 'profession-matching';

@Component({
    selector: 'app-profession-matching',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './profession-matching.component.html',
    styleUrl: './profession-matching.component.scss'
})
export class ProfessionMatchingComponent implements OnInit {

    readonly CONTAINER_WIDTH = 540;
    readonly CONTAINER_HEIGHT = 440;
    readonly ITEM_HEIGHT = 110;
    readonly LEFT_ANCHOR_X = 160;
    readonly RIGHT_ANCHOR_X = 380;

    // Sol sütun: meslek görselleri (emoji)
    leftItems: ProfessionItem[] = [
        { key: 'ogretmen',  emoji: '👩‍🏫', isSelected: false, isPaired: false },
        { key: 'polis',     emoji: '👮',    isSelected: false, isPaired: false },
        { key: 'doktor',    emoji: '👩‍⚕️', isSelected: false, isPaired: false },
        { key: 'itfaiyeci', emoji: '🧑‍🚒', isSelected: false, isPaired: false },
    ];

    // Sağ sütun: karışık etiketler
    rightItems: ProfessionItem[] = [
        { key: 'doktor',    label: 'Doktor',    isSelected: false, isPaired: false },
        { key: 'itfaiyeci', label: 'İtfaiyeci', isSelected: false, isPaired: false },
        { key: 'ogretmen',  label: 'Öğretmen',  isSelected: false, isPaired: false },
        { key: 'polis',     label: 'Polis',     isSelected: false, isPaired: false },
    ];

    matchLines: MatchLine[] = [];
    selectedLeftIndex: number | null = null;

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) {}

    get isSubmitted(): boolean {
        return this.gs.isCompleted(ID);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<ProfessionMatchingState>(ID);
        if (saved) {
            this.leftItems = saved.leftItems || this.leftItems;
            this.rightItems = saved.rightItems || this.rightItems;
            this.matchLines = saved.matchLines || [];
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            leftItems: this.leftItems,
            rightItems: this.rightItems,
            matchLines: this.matchLines
        });
    }

    getItemCenterY(index: number): number {
        return index * this.ITEM_HEIGHT + this.ITEM_HEIGHT / 2;
    }

    getLineColor(key: string): string {
        const colorMap: Record<string, string> = {
            ogretmen:  '#eab308',
            polis:     '#2563eb',
            doktor:    '#16a34a',
            itfaiyeci: '#dc2626',
        };
        return colorMap[key] || '#334155';
    }

    selectLeft(index: number): void {
        if (this.isSubmitted) return;
        const item = this.leftItems[index];
        if (item.isPaired) return;

        if (this.selectedLeftIndex === index) {
            item.isSelected = false;
            this.selectedLeftIndex = null;
        } else {
            this.leftItems.forEach(b => b.isSelected = false);
            item.isSelected = true;
            this.selectedLeftIndex = index;
        }
    }

    /** Eşleşmeyi doğru/yanlış olduğuna bakmadan sessizce kaydeder — sonuç yalnızca Gönder'e basılınca belli olur. */
    selectRight(index: number): void {
        if (this.isSubmitted) return;
        if (this.selectedLeftIndex === null) return;
        const rightItem = this.rightItems[index];
        if (rightItem.isPaired) return;

        const leftItem = this.leftItems[this.selectedLeftIndex];
        const leftIndex = this.selectedLeftIndex;

        leftItem.isPaired = true;
        rightItem.isPaired = true;
        leftItem.isSelected = false;
        this.matchLines.push({ leftIndex, rightIndex: index, key: leftItem.key });
        this.selectedLeftIndex = null;
        this.persist();
    }

    checkAnswer(): void {
        if (this.matchLines.length === 0) {
            this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
            return;
        }
        if (this.matchLines.length < this.leftItems.length) {
            this.fb.showFeedback('error', 'Lütfen tüm meslekleri eşleştirin!');
            return;
        }

        const allCorrect = this.matchLines.every(
            l => this.leftItems[l.leftIndex].key === this.rightItems[l.rightIndex].key
        );

        if (allCorrect) {
            this.gs.markCompleted(ID);
            this.fb.showFeedback('success', 'Harika! Tüm meslekleri doğru eşleştirdin!');
        } else {
            this.hintService.registerError(ID);
        }
    }

    clearSelection(): void {
        this.leftItems.forEach(b => { b.isSelected = false; b.isPaired = false; });
        this.rightItems.forEach(b => { b.isSelected = false; b.isPaired = false; });
        this.matchLines = [];
        this.selectedLeftIndex = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    goPrev(): void {
        this.router.navigate(['/set-match']);
    }

    goNext(): void {
        if (!this.isSubmitted) return;
        this.router.navigate(['/fruit-basket']);
    }
}
