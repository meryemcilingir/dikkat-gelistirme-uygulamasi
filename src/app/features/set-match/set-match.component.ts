import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export type Sym = 'tri' | 'circle' | 'plus' | 'x' | 'square';

export interface SetBox {
    id: number;
    symbols: Sym[];
    partnerId: number;
    pairedWith: number | null;
    isShaking: boolean;
}

interface SetMatchState {
    pairs: (number | null)[];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'set-match';

@Component({
    selector: 'app-set-match',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './set-match.component.html',
    styleUrl: './set-match.component.scss'
})
export class SetMatchComponent implements OnInit, OnDestroy {

    readonly symbols: Sym[] = ['tri', 'circle', 'plus', 'x', 'square'];

    // 4 eşleşen çift — her çiftin sembol çoğuğu (multiset) aynı, dizilim farklı
    boxes: SetBox[] = [
        // Çift A: 1▲ 1● 1+ 3✕ 1■
        { id: 0, symbols: ['tri', 'circle', 'plus', 'x', 'square', 'x', 'x'], partnerId: 3, pairedWith: null, isShaking: false },
        // Çift B: 1▲ 1● 3+ 1✕ 1■
        { id: 1, symbols: ['tri', 'plus', 'square', 'x', 'circle', 'x', 'tri'], partnerId: 7, pairedWith: null, isShaking: false },
        // Çift C: 1▲ 2● 1+ 2✕ 1■
        { id: 2, symbols: ['x', 'circle', 'x', 'tri', 'square', 'plus', 'x'], partnerId: 5, pairedWith: null, isShaking: false },
        // Çift A (eşi)
        { id: 3, symbols: ['tri', 'circle', 'plus', 'x', 'square', 'x', 'x'], partnerId: 0, pairedWith: null, isShaking: false },
        // Çift  (eşi)
        { id: 4, symbols: ['tri', 'circle', 'plus', 'plus', 'square', 'plus', 'x'], partnerId: 6, pairedWith: null, isShaking: false },
        // Çift C: 2▲ 1● 1+ 2✕ 1■
        { id: 5, symbols: ['x', 'circle', 'x', 'tri', 'square', 'plus', 'x'], partnerId: 2, pairedWith: null, isShaking: false },
        // Çift  (eşi)
        { id: 6, symbols: ['tri', 'circle', 'plus', 'plus', 'square', 'plus', 'x'], partnerId: 4, pairedWith: null, isShaking: false },
        // Çift B (eşi)
        { id: 7, symbols: ['tri', 'plus', 'square', 'x', 'circle', 'x', 'tri'], partnerId: 1, pairedWith: null, isShaking: false },
    ];


    pendingId: number | null = null;

    // İpucu: eksik/yanlış çiftleri sırayla vurgular
    hintPairIdx = 0;
    private hintTimer: any = null;

    // Her çift için renk slotu (pairedWith kurulduğunda atanır)
    private pairColorsByKey = new Map<string, string>();
    private readonly palette = ['#e74c3c', '#3498db', '#27ae60', '#f39c12'];

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
        const saved = this.gs.getData<SetMatchState>(ID);
        if (saved?.pairs) {
            saved.pairs.forEach((p, i) => {
                if (this.boxes[i]) this.boxes[i].pairedWith = p;
            });
            this.recomputeColors();
            this.feedbackState = saved.feedbackState ?? null;
        }
        this.startHintCycle();
    }

    private persist(): void {
        this.gs.save(ID, {
            pairs: this.boxes.map(b => b.pairedWith),
            feedbackState: this.feedbackState,
        });
    }

    private pairKey(a: number, b: number): string {
        return a < b ? `${a}-${b}` : `${b}-${a}`;
    }

    private recomputeColors(): void {
        this.pairColorsByKey.clear();
        const seen = new Set<string>();
        this.boxes.forEach(b => {
            if (b.pairedWith != null) {
                const key = this.pairKey(b.id, b.pairedWith);
                if (!seen.has(key)) {
                    seen.add(key);
                    this.pairColorsByKey.set(key, this.palette[this.pairColorsByKey.size % this.palette.length]);
                }
            }
        });
    }

    pairColor(box: SetBox): string | null {
        if (box.pairedWith == null) return null;
        return this.pairColorsByKey.get(this.pairKey(box.id, box.pairedWith)) ?? null;
    }

    isPending(box: SetBox): boolean {
        return this.pendingId === box.id;
    }

    // Henüz doğru eşleşmeyen çiftler — sırayla vurgulanacak
    get pendingCorrectPairs(): [number, number][] {
        const seen = new Set<number>();
        const pairs: [number, number][] = [];
        for (const b of this.boxes) {
            if (seen.has(b.id)) continue;
            if (b.pairedWith !== b.partnerId) {
                pairs.push([b.id, b.partnerId]);
                seen.add(b.id);
                seen.add(b.partnerId);
            }
        }
        return pairs;
    }

    isHintBox(box: SetBox): boolean {
        if (!this.showHint) return false;
        const pairs = this.pendingCorrectPairs;
        if (pairs.length === 0) return false;
        const [a, b] = pairs[this.hintPairIdx % pairs.length];
        return box.id === a || box.id === b;
    }

    private startHintCycle(): void {
        if (this.hintTimer) return;
        this.hintTimer = setInterval(() => {
            const pairs = this.pendingCorrectPairs;
            if (pairs.length === 0) {
                this.hintPairIdx = 0;
                return;
            }
            this.hintPairIdx = (this.hintPairIdx + 1) % pairs.length;
        }, 1800);
    }

    ngOnDestroy(): void {
        if (this.hintTimer) {
            clearInterval(this.hintTimer);
            this.hintTimer = null;
        }
    }

    onBoxClick(box: SetBox): void {
        if (this.isNextUnlocked) return;

        // Zaten eşleşmişse → çifti çöz
        if (box.pairedWith != null) {
            const partner = this.boxes.find(b => b.id === box.pairedWith);
            box.pairedWith = null;
            if (partner) partner.pairedWith = null;
            this.pendingId = null;
            this.feedbackState = null;
            this.recomputeColors();
            this.persist();
            return;
        }

        // Aynı kutuya tekrar tıklandı → seçimi iptal
        if (this.pendingId === box.id) {
            this.pendingId = null;
            return;
        }

        // İlk seçim
        if (this.pendingId == null) {
            this.pendingId = box.id;
            return;
        }

        // İkinci seçim → çift kur
        const first = this.boxes.find(b => b.id === this.pendingId);
        if (first) {
            first.pairedWith = box.id;
            box.pairedWith = first.id;
            this.recomputeColors();
        }
        this.pendingId = null;
        this.feedbackState = null;
        this.persist();
    }

    checkAnswer(): void {
        const allPaired = this.boxes.every(b => b.pairedWith != null);
        if (!allPaired) {
            this.fb.showFeedback('error', 'Lütfen tüm kutuları eşleştirin.');
            return;
        }

        let allCorrect = true;
        this.boxes.forEach(b => {
            if (b.pairedWith !== b.partnerId) {
                allCorrect = false;
                b.isShaking = true;
                setTimeout(() => { b.isShaking = false; }, 500);
            }
        });

        if (allCorrect) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Harika! Tüm kümeleri doğru eşleştirdin!');
        } else {
            this.feedbackState = 'wrong';
            this.hintService.registerError(ID);
            this.fb.showFeedback('error', 'Bazı eşleşmeler yanlış. Tekrar dene!');
        }
        this.persist();
    }

    clearSelection(): void {
        this.boxes.forEach(b => {
            b.pairedWith = null;
            b.isShaking = false;
        });
        this.pendingId = null;
        this.pairColorsByKey.clear();
        this.feedbackState = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    goPrev(): void {
        this.router.navigate(['/triangle-match']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/profession-matching']);
    }
}
