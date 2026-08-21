import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface BlockDef {
    color: string;
    innerShape?: 'circle' | 'triangle' | 'none'; // none by default for simple blocks
    innerColor?: string;
    transparent?: boolean; // Boşluk bloğu
    colSpan?: number; // Geniş bloklar için (ör. yatay dikdörtgen)
}

export interface OptionDef {
    id: number;
    blocks: BlockDef[];
    isCorrect: boolean;
    isShaking?: boolean;
}

interface TopViewState {
    selectedId: number | null;
}

const ID = 'top-view';

@Component({
    selector: 'app-top-view',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './top-view.component.html',
    styleUrl: './top-view.component.scss'
})
export class TopViewComponent implements OnInit {

    // Colors as specified
    readonly PINK = '#e84393';
    readonly GREEN = '#4cd137';
    readonly BLUE = '#3498db';
    readonly BROWN = '#795548';
    readonly WHITE = '#ffffff';
    readonly YELLOW = '#f1c40f';
    readonly RED = '#e74c3c'; // For inner markers
    readonly LIGHTBLUE = '#81ecec';

    // Master grid blocks (3 cols x 4 rows)
    masterLayout: BlockDef[] = [];

    // 6 Option columns
    options: OptionDef[] = [];

    selectedId: number | null = null;
    isChecking = false;

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) {
        this.initializeData();
    }

    get showHints(): boolean {
        return this.hintService.shouldShowHint(ID);
    }

    get isNextUnlocked(): boolean {
        return this.gs.isCompleted(ID);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<TopViewState>(ID);
        if (saved && saved.selectedId !== undefined) {
            this.selectedId = saved.selectedId;
        }
    }

    private initializeData(): void {
        // 1. Ana Şekil (Master Shape - Elevation View)
        // 5 columns x 3 rows grid
        // Row 1: Blue, Trans, Trans, Trans, Brown
        // Row 2: Green, Trans, Red Circle, Trans, Blue
        // Row 3: Green, White, Yellow, Pink (colspan 2)
        this.masterLayout = [
            { color: this.BLUE }, { color: 'transparent', transparent: true }, { color: 'transparent', transparent: true }, { color: 'transparent', transparent: true }, { color: this.BROWN },
            { color: this.GREEN }, { color: 'transparent', transparent: true }, { color: 'transparent', transparent: true, innerShape: 'circle', innerColor: this.RED }, { color: 'transparent', transparent: true }, { color: this.BLUE },
            { color: this.GREEN }, { color: this.WHITE }, { color: this.YELLOW }, { color: this.PINK, colSpan: 2 }
        ];

        // 2. Seçenekler (Altta) - 5 blocks horizontally each
        this.options = [
            {
                // Seçenek 1: yeşil, sarı(kırmızı daire), kahverengi, mavi, kırmızı -> pembe
                id: 1, isCorrect: false,
                blocks: [
                    { color: this.GREEN },
                    { color: this.YELLOW, innerShape: 'circle', innerColor: this.RED },
                    { color: this.BROWN },
                    { color: this.BLUE },
                    { color: this.PINK }
                ]
            },
            {
                // Seçenek 2 (DOĞRU CEVAP): mavi, beyaz, sarı(kırmızı daire), kırmızı -> pembe, kahverengi
                id: 2, isCorrect: true,
                blocks: [
                    { color: this.BLUE },
                    { color: this.WHITE },
                    { color: this.YELLOW, innerShape: 'circle', innerColor: this.RED },
                    { color: this.PINK },
                    { color: this.BROWN }
                ]
            },
            {
                // Seçenek 3: mavi, sarı(kırmızı daire), beyaz, mavi, kahverengi
                id: 3, isCorrect: false,
                blocks: [
                    { color: this.BLUE },
                    { color: this.YELLOW, innerShape: 'circle', innerColor: this.RED },
                    { color: this.WHITE },
                    { color: this.BLUE },
                    { color: this.BROWN }
                ]
            },
            {
                // Seçenek 4: kırmızı->pembe, kahverengi, beyaz(kırmızı üçgen), mavi zeminli kırmızı daire, mavi
                id: 4, isCorrect: false,
                blocks: [
                    { color: this.PINK },
                    { color: this.BROWN },
                    { color: this.WHITE, innerShape: 'triangle', innerColor: this.RED },
                    { color: this.BLUE, innerShape: 'circle', innerColor: this.RED }, // dairenin olduğu kare mavi
                    { color: this.BLUE }
                ]
            },
            {
                // Seçenek 5: kırmızı -> pembe, yeşil, beyaz(kırmızı daire), mavi, kahverengi
                id: 5, isCorrect: false,
                blocks: [
                    { color: this.PINK },
                    { color: this.GREEN },
                    { color: this.WHITE, innerShape: 'circle', innerColor: this.RED },
                    { color: this.BLUE },
                    { color: this.BROWN }
                ]
            },
            {
                // Seçenek 6: mavi, beyaz, pembe zeminli sarı daire, kırmızı -> pembe, kahverengi
                id: 6, isCorrect: false,
                blocks: [
                    { color: this.BLUE },
                    { color: this.WHITE },
                    { color: this.PINK, innerShape: 'circle', innerColor: this.YELLOW }, // sarı dairenin olduğu kare pembe
                    { color: this.PINK },
                    { color: this.BROWN }
                ]
            }
        ];
    }

    selectOption(opt: OptionDef): void {
        if (this.isNextUnlocked || this.isChecking) return;
        this.selectedId = opt.id;
        this.persist();
    }

    persist(): void {
        this.gs.save(ID, { selectedId: this.selectedId });
    }

    checkAnswer(): void {
        if (this.selectedId === null) {
            this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
            return;
        }

        if (!this.selectedId) {
            this.fb.showFeedback('error', 'Lütfen önce yukarıdaki görünümü eşleşen seçeneğe tıklayın!');
            return;
        }

        const selectedOption = this.options.find(o => o.id === this.selectedId);
        if (!selectedOption) return;

        if (selectedOption.isCorrect) {
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Harika! Yukarıdan görünümü doğru buldun.');
            this.persist();
        } else {
            this.isChecking = true;
            this.hintService.registerError(ID);
            selectedOption.isShaking = true;
            this.fb.showFeedback('error', 'Bu görünüm eşleşmiyor. Tekrar dene!');

            setTimeout(() => {
                selectedOption.isShaking = false;
                this.selectedId = null; // Reset selection
                this.isChecking = false;
                this.persist();
            }, 500);
        }
    }

    clearSelection(): void {
        this.selectedId = null;
        this.options.forEach(o => o.isShaking = false);
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    getOptionClasses(opt: OptionDef) {
        return {
            'selected': this.selectedId === opt.id,
            'shake': opt.isShaking,
            'hint': this.showHints && opt.isCorrect, // Dynamic hint mapping
            'hover': !this.isNextUnlocked
        };
    }

    goPrev(): void {
        this.router.navigate(['/rhythmic-counting']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/box-coloring']); // Update when next game is developed
    }
}
