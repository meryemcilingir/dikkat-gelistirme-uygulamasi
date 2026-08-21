import { Component, OnInit, inject } from '@angular/core';
import { ReviewModeService } from '../../core/services/review-mode.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

type Sym = '+' | '-' | null;
type Feedback = 'correct' | 'wrong' | null;

interface SymbolGridState {
    userGrid: Sym[][];
    feedbackGrid: Feedback[][];
    mistakeCount: number;
}

const ID = 'symbol-grid-copy';

@Component({
    selector: 'app-symbol-grid-copy',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './symbol-grid-copy.component.html',
    styleUrl: './symbol-grid-copy.component.scss'
})
export class SymbolGridCopyComponent implements OnInit {
    reviewMode = inject(ReviewModeService);

    readonly referenceGrid: ReadonlyArray<ReadonlyArray<'+' | '-'>> = [
        ['+', '-', '+'],
        ['-', '+', '-'],
        ['+', '-', '+']
    ];

    userGrid: Sym[][] = [
        [null, null, null],
        [null, null, null],
        [null, null, null]
    ];

    feedbackGrid: Feedback[][] = [
        [null, null, null],
        [null, null, null],
        [null, null, null]
    ];

    /**
     * 2 yanlıştan sonra doğru cevabın soluk gösterildiği hücreler.
     */
    ghostGrid: boolean[][] = [
        [false, false, false],
        [false, false, false],
        [false, false, false]
    ];

    /**
     * Aktif seçili sembol — flower-coloring'deki selectedColor gibi.
     * Kullanıcı önce aşağıdan bir sembol seçer, sonra grid'de tıklayınca bu sembol oraya yerleşir.
     */
    selectedSymbol: '+' | '-' | null = null;

    mistakeCount = 0;

    // Rows array for @for iteration
    readonly rows = [0, 1, 2];
    readonly cols = [0, 1, 2];

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) {}

    get showHint(): boolean {
        return this.hintService.shouldShowHint(ID) || this.mistakeCount >= 2;
    }

    get isNextUnlocked(): boolean {
        return this.gs.isCompleted(ID);
    }

    isHintCell(row: number, col: number): boolean {
        if (!this.showHint) return false;
        return this.feedbackGrid[row][col] === 'wrong' || this.userGrid[row][col] === null;
    }

    /**
     * Ghost hint: 2 yanlıştan sonra hatalı hücrelerde doğru sembolü soluk gösterir.
     */
    getGhostSymbol(row: number, col: number): string | null {
        if (!this.ghostGrid[row][col]) return null;
        if (this.userGrid[row][col] !== null) return null; // Kullanıcı doldurduysa ghost gizle
        return this.referenceGrid[row][col] === '+' ? '+' : '−';
    }

    ngOnInit(): void {
        const saved = this.gs.getData<SymbolGridState>(ID);
        if (saved) {
            this.userGrid = saved.userGrid || this.userGrid;
            this.feedbackGrid = saved.feedbackGrid || this.feedbackGrid;
            this.mistakeCount = saved.mistakeCount ?? 0;
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            userGrid: this.userGrid,
            feedbackGrid: this.feedbackGrid,
            mistakeCount: this.mistakeCount
        });
    }

    /**
     * Aşağıdaki sembol butonuna basıldığında çağılır.
     * Aynı sembole tekrar basılırsa seçim kalkar (toggle).
     */
    onSymbolSelect(symbol: '+' | '-'): void {
        if (this.isNextUnlocked) return;

        if (this.selectedSymbol === symbol) {
            // Zaten seçili — seçimi kaldır
            this.selectedSymbol = null;
        } else {
            this.selectedSymbol = symbol;
        }
    }

    /**
     * Grid hücresine tıklandığında çağılır.
     * Eğer bir sembol seçiliyse, o sembolü hücreye yerleştirir.
     * Seçili sembol yoksa uyarı gösterir.
     */
    onCellClick(row: number, col: number): void {
        if (this.isNextUnlocked) return;

        if (!this.selectedSymbol) {
            this.fb.showFeedback('error', 'Lütfen önce aşağıdan bir sembol seçin!');
            return;
        }

        this.userGrid[row][col] = this.selectedSymbol;
        // Clear feedback for edited cell
        this.feedbackGrid[row][col] = null;
        this.persist();
    }

    checkAnswer(): void {
        const allFilled = this.userGrid.every(row => row.every(cell => cell !== null));
        if (!allFilled) {
            this.fb.showFeedback('error', 'Lütfen tüm kutucukları doldurun!');
            return;
        }

        let allCorrect = true;
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                if (this.userGrid[r][c] === this.referenceGrid[r][c]) {
                    this.feedbackGrid[r][c] = 'correct';
                } else {
                    this.feedbackGrid[r][c] = 'wrong';
                    allCorrect = false;
                }
            }
        }

        if (allCorrect) {
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Tebrikler! Kareyi doğru tamamladın!');
        } else {
            this.mistakeCount++;
            this.hintService.registerError(ID);

            if (this.mistakeCount >= 2) {
                // 2. yanlıştan sonra: hatalı hücreleri temizle, doğru cevabı ghost olarak göster
                for (let r = 0; r < 3; r++) {
                    for (let c = 0; c < 3; c++) {
                        if (this.feedbackGrid[r][c] === 'wrong') {
                            this.userGrid[r][c] = null;           // Yanlış cevabı sil
                            this.ghostGrid[r][c] = true;          // Ghost hint'i aç
                            this.feedbackGrid[r][c] = null;       // Feedback'i temizle
                        }
                    }
                }
                this.fb.showFeedback('error', 'İpucu gösteriliyor! Soluk sembolleri takip ederek doğru cevabı girin.');
            } else {
                this.fb.showFeedback('error', 'Bazı kutucuklar yanlış. Kontrol et!');
            }
        }

        this.persist();
    }

    clearSelection(): void {
        this.userGrid = [
            [null, null, null],
            [null, null, null],
            [null, null, null]
        ];
        this.feedbackGrid = [
            [null, null, null],
            [null, null, null],
            [null, null, null]
        ];
        this.ghostGrid = [
            [false, false, false],
            [false, false, false],
            [false, false, false]
        ];
        this.selectedSymbol = null;
        this.mistakeCount = 0;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    goPrev(): void {
        this.router.navigate(['/pencil-matching']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/ball-matching']);
    }
}
