import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface TrafficSign {
    id: number;
    icon: string; // Emoji
    matchId: number; // The ID of the matching sign in the other column
}

interface MatchPair {
    leftId: number;
    rightId: number;
    isCorrect?: boolean;
}

interface TrafficSignMatchState {
    pairs: MatchPair[];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'traffic-sign-matching';

@Component({
    selector: 'app-traffic-sign-matching',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './traffic-sign-matching.component.html',
    styleUrl: './traffic-sign-matching.component.scss'
})
export class TrafficSignMatchingComponent implements OnInit {

    // Data definitions based on the screenshot (5 items on each side)
    // Data definitions based on the screenshot (5 items on each side)
    // Left column signs
    leftSigns: TrafficSign[] = [
        { id: 11, icon: '🚸', matchId: 24 }, // Okul geçidi
        { id: 12, icon: '⚠️', matchId: 21 }, // Dikkat
        { id: 13, icon: '🚯', matchId: 25 }, // Çöp atmak yasak
        { id: 14, icon: '⛔', matchId: 26 }, // Girilmez
        { id: 15, icon: '🚶', matchId: 22 }, // Yaya geçidi
    ];

    // Right column signs
    rightSigns: TrafficSign[] = [
        { id: 21, icon: '⚠️', matchId: 12 },
        { id: 22, icon: '🚶', matchId: 15 },
        { id: 24, icon: '🚸', matchId: 11 },
        { id: 25, icon: '🚯', matchId: 13 },
        { id: 26, icon: '⛔', matchId: 14 },
    ];

    pairs: MatchPair[] = [];
    selectedLeftId: number | null = null;
    selectedRightId: number | null = null;
    feedbackState: 'correct' | 'wrong' | null = null;
    hasChecked: boolean = false;

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

    // Returns left signs ordered: paired first (in order of pairing), then unpaired (in original order)
    get orderedLeftSigns(): TrafficSign[] {
        const paired = this.pairs.map(p => this.leftSigns.find(s => s.id === p.leftId)!);
        const unpaired = this.leftSigns.filter(s => !this.pairs.some(p => p.leftId === s.id));
        return [...paired, ...unpaired];
    }

    // Returns right signs ordered similarly to matching left ones.
    get orderedRightSigns(): TrafficSign[] {
        const paired = this.pairs.map(p => this.rightSigns.find(s => s.id === p.rightId)!);
        const unpaired = this.rightSigns.filter(s => !this.pairs.some(p => p.rightId === s.id));
        return [...paired, ...unpaired];
    }

    ngOnInit(): void {
        const saved = this.gs.getData<TrafficSignMatchState>(ID);
        if (saved) {
            this.pairs = saved.pairs || [];
            this.feedbackState = saved.feedbackState;
            if (this.feedbackState) {
                this.hasChecked = true;
            }
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            pairs: this.pairs,
            feedbackState: this.feedbackState
        });
    }

    selectLeft(id: number): void {
        if (this.feedbackState === 'correct' || this.isItemPaired(id, 'left')) return;

        // Toggle selection
        this.selectedLeftId = this.selectedLeftId === id ? null : id;
        this.tryFormPair();
    }

    selectRight(id: number): void {
        if (this.feedbackState === 'correct' || this.isItemPaired(id, 'right')) return;

        // Toggle selection
        this.selectedRightId = this.selectedRightId === id ? null : id;
        this.tryFormPair();
    }

    isItemPaired(id: number, side: 'left' | 'right'): boolean {
        if (side === 'left') {
            return this.pairs.some(p => p.leftId === id);
        } else {
            return this.pairs.some(p => p.rightId === id);
        }
    }

    private tryFormPair(): void {
        if (this.selectedLeftId !== null && this.selectedRightId !== null) {
            // Clear previous check states if altering pairs
            this.hasChecked = false;
            this.feedbackState = null;

            // Form pair
            this.pairs.push({
                leftId: this.selectedLeftId,
                rightId: this.selectedRightId
            });

            // Reset selection
            this.selectedLeftId = null;
            this.selectedRightId = null;

            this.persist();
        }
    }

    getPairTargetByItemId(id: number, side: 'left' | 'right'): MatchPair | undefined {
        if (side === 'left') {
            return this.pairs.find(p => p.leftId === id);
        }
        return this.pairs.find(p => p.rightId === id);
    }

    clearSelection(): void {
        this.pairs = [];
        this.selectedLeftId = null;
        this.selectedRightId = null;
        this.feedbackState = null;
        this.hasChecked = false;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    checkAnswer(): void {
        if (this.pairs.length === 0) {
            this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
            return;
        }

        // Only check if all items are paired
        if (this.pairs.length !== this.leftSigns.length) {
            this.fb.showFeedback('error', 'Lütfen tüm trafik işaretlerini eşleştirin.');
            return;
        }

        this.hasChecked = true;
        let allCorrect = true;

        // Evaluate each pair
        this.pairs.forEach(pair => {
            const leftSign = this.leftSigns.find(s => s.id === pair.leftId);
            if (leftSign && leftSign.matchId === pair.rightId) {
                pair.isCorrect = true;
            } else {
                pair.isCorrect = false;
                allCorrect = false;
            }
        });

        if (allCorrect) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Tebrikler! Tüm işaretleri doğru eşleştirdin.');
        } else {
            this.feedbackState = 'wrong';
            this.hintService.registerError(ID);
            this.fb.showFeedback('error', 'Bazı eşleştirmeler yanlış. Kırmızı olanları kontrol et.');

            // Remove wrong pairs after a short delay so user can try again
            setTimeout(() => {
                this.pairs = this.pairs.filter(p => p.isCorrect);
                this.hasChecked = false;
                this.feedbackState = null;
                this.persist();
            }, 1500);
        }

        this.persist();
    }

    goPrev(): void {
        this.router.navigate(['/living-things']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/abacus-counting']);
    }
}
