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
    letter: string;
    isSelected: boolean;
    pairedWith: number | null;
    pairIndex: number | null;
}

interface BoardLetterState {
    firstSelection: number | null;
    lettersState: { id: number, pairedWith: number | null, pairIndex: number | null }[];
}

const ID = 'board-letter-matching';

// Öğrencinin oluşturduğu eşleşmeleri birbirinden ayırt etmek için döngüsel renk/rakam paleti
export const PAIR_BADGE_COLORS = ['#e91e63', '#3f51b5', '#00897b', '#f9a825'];

@Component({
    selector: 'app-board-letter-matching',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './board-letter-matching.component.html',
    styleUrl: './board-letter-matching.component.scss'
})
export class BoardLetterMatchingComponent implements OnInit {

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) { }

    letters: LetterItem[] = [
        { id: 1, letter: 'A', isSelected: false, pairedWith: null, pairIndex: null },
        { id: 2, letter: 'N', isSelected: false, pairedWith: null, pairIndex: null },
        { id: 3, letter: 'E', isSelected: false, pairedWith: null, pairIndex: null },
        { id: 4, letter: 'İ', isSelected: false, pairedWith: null, pairIndex: null },
        { id: 5, letter: 'T', isSelected: false, pairedWith: null, pairIndex: null }, // Çeldirici
        { id: 6, letter: 'A', isSelected: false, pairedWith: null, pairIndex: null },
        { id: 7, letter: 'E', isSelected: false, pairedWith: null, pairIndex: null },
        { id: 8, letter: 'N', isSelected: false, pairedWith: null, pairIndex: null },
        { id: 9, letter: 'İ', isSelected: false, pairedWith: null, pairIndex: null }
    ];

    firstSelection: number | null = null;

    get showHint(): boolean {
        return this.hintService.shouldShowHint(ID);
    }

    /** Kaç çift (doğru/yanlış fark etmeksizin) eşleştirilmiş. */
    get pairsFormed(): number {
        return this.letters.filter(l => l.pairedWith !== null).length / 2;
    }

    get activeHintLetter(): string | null {
        if (!this.showHint) return null;

        // Eğer ilk seçim yapılmışsa, aranacak olan eş harf odur
        if (this.firstSelection !== null) {
            const first = this.letters.find(l => l.id === this.firstSelection);
            if (first) return first.letter;
        }

        // Eğer henüz seçim yapılmamışsa, eşleşmemiş olan ilk harf çiftini bul
        const unpairedLetters = this.letters.filter(l => l.pairedWith === null);

        for (const l1 of unpairedLetters) {
            const pairCount = unpairedLetters.filter(l2 => l2.letter === l1.letter).length;
            if (pairCount > 1) {
                return l1.letter; // Eşi olan ilk harfi hedef yap
            }
        }

        return null;
    }

    /** Yalnızca "Gönder" gerçekten tıklanıp checkAnswer() tamamlandıktan SONRA true olur. */
    get isNextUnlocked(): boolean {
        return this.gs.isCompleted(ID);
    }

    get isSubmitted(): boolean {
        return this.gs.isCompleted(ID);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<BoardLetterState>(ID);
        if (saved) {
            this.firstSelection = saved.firstSelection;

            if (saved.lettersState) {
                saved.lettersState.forEach(ls => {
                    const l = this.letters.find(x => x.id === ls.id);
                    if (l) {
                        l.pairedWith = ls.pairedWith;
                        l.pairIndex = ls.pairIndex ?? null;
                    }
                });
            }

            // İlk seçim açıksa onun isSelected'ini TRUE yapmamız lazım state kurtarımı için.
            if (this.firstSelection !== null) {
                const f = this.letters.find(l => l.id === this.firstSelection);
                if (f) f.isSelected = true;
            }
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            firstSelection: this.firstSelection,
            lettersState: this.letters.map(l => ({ id: l.id, pairedWith: l.pairedWith, pairIndex: l.pairIndex }))
        });
    }

    /** Eşleşen harfin rozet rengini döndürür — öğretmen incelemesinde hangi harflerin eşleştiğini ayırt etmek için. */
    pairBadgeColor(item: LetterItem): string {
        if (item.pairIndex === null) return '#94a3b8';
        return PAIR_BADGE_COLORS[item.pairIndex % PAIR_BADGE_COLORS.length];
    }

    /** İki harfi doğru/yanlış olduğuna bakmadan sessizce eşleştirir — sonuç yalnızca Gönder'e basılınca belli olur. */
    selectLetter(id: number): void {
        if (this.gs.isCompleted(ID)) return;

        const letter = this.letters.find(l => l.id === id);
        if (!letter || letter.pairedWith !== null) return;

        if (this.firstSelection === id) {
            // Aynı harfe tekrar tıklanınca seçimi geri al
            letter.isSelected = false;
            this.firstSelection = null;
            this.persist();
            return;
        }

        if (this.firstSelection === null) {
            this.firstSelection = id;
            letter.isSelected = true;
            this.persist();
        } else {
            const firstLetter = this.letters.find(l => l.id === this.firstSelection)!;
            const newIndex = this.pairsFormed;
            firstLetter.pairedWith = id;
            firstLetter.pairIndex = newIndex;
            letter.pairedWith = this.firstSelection;
            letter.pairIndex = newIndex;
            firstLetter.isSelected = false;
            this.firstSelection = null;
            this.persist();
        }
    }

    clearSelection(): void {
        this.firstSelection = null;
        this.letters.forEach(l => {
            l.isSelected = false;
            l.pairedWith = null;
            l.pairIndex = null;
        });
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    checkAnswer(): void {
        if (this.pairsFormed === 0 && this.firstSelection === null) {
            this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
            return;
        }

        if (this.pairsFormed < 4) {
            this.fb.showFeedback('error', 'Lütfen tüm harfleri eşleştirin!');
            return;
        }

        const seen = new Set<number>();
        let allCorrect = true;
        this.letters.forEach(l => {
            if (l.pairedWith !== null && !seen.has(l.id)) {
                const partner = this.letters.find(x => x.id === l.pairedWith)!;
                seen.add(l.id);
                seen.add(partner.id);
                if (l.letter !== partner.letter) allCorrect = false;
            }
        });

        if (allCorrect) {
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Harika yetenek! Bütün eşleri buldun.');
        } else {
            this.hintService.registerError(ID);
            this.fb.showFeedback('error', 'Bazı eşleşmeler yanlış. Aynı harflerin üzerine teker teker tıkla.');
        }
        this.persist();
    }

    goPrev(): void {
        this.router.navigate(['/shape-pattern']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/shape-to-color-match']);
    }
}
