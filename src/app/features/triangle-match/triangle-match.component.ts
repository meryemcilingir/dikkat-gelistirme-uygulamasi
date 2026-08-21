import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export type TrianglePos = 'roof' | 'top' | 'right' | 'bottom' | 'left';

export interface TriangleBox {
    id: number;
    preset: TrianglePos[];    // önceden boyalı (kilitli)
    added: TrianglePos[];     // kullanıcının eklediği
    isShaking: boolean;
}

interface TriangleMatchState {
    added: TrianglePos[][];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'triangle-match';
const TARGET: TrianglePos[] = ['left', 'right'];

@Component({
    selector: 'app-triangle-match',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './triangle-match.component.html',
    styleUrl: './triangle-match.component.scss'
})
export class TriangleMatchComponent implements OnInit {

    // Referans hedef: sol + sağ üçgen kırmızı (yatay kum saati)
    readonly target: TrianglePos[] = TARGET;

    readonly positions: TrianglePos[] = ['roof', 'top', 'right', 'bottom', 'left'];

    // viewBox 0 0 100 130
    // Kare: y=30..130, çatı: y=0..30 (apex 50,0)
    // Kare merkezi: (50, 80)
    readonly trianglePoints: Record<TrianglePos, string> = {
        roof:   '0,30 50,0 100,30',
        top:    '0,30 100,30 50,80',
        right:  '100,30 100,130 50,80',
        bottom: '100,130 0,130 50,80',
        left:   '0,130 0,30 50,80',
    };

    // Her kutu farklı önceden boyalı durumla gelir (hepsi hedefin alt kümesi — çözülebilir)
    boxes: TriangleBox[] = [
        { id: 0, preset: [],                  added: [], isShaking: false },
        { id: 1, preset: ['left'],            added: [], isShaking: false },
        { id: 2, preset: ['right'],           added: [], isShaking: false },
        { id: 3, preset: ['left', 'right'],   added: [], isShaking: false },
        { id: 4, preset: [],                  added: [], isShaking: false },
        { id: 5, preset: ['right'],           added: [], isShaking: false },
    ];

    feedbackState: 'correct' | 'wrong' | null = null;

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) {}

    get showHint(): boolean {
        return this.hintService.shouldShowHint(ID);
    }

    get isNextUnlocked(): boolean {
        return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<TriangleMatchState>(ID);
        if (saved?.added) {
            saved.added.forEach((arr, i) => {
                if (this.boxes[i]) this.boxes[i].added = [...arr];
            });
            this.feedbackState = saved.feedbackState ?? null;
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            added: this.boxes.map(b => b.added),
            feedbackState: this.feedbackState,
        });
    }

    isPreset(box: TriangleBox, pos: TrianglePos): boolean {
        return box.preset.includes(pos);
    }

    isFilled(box: TriangleBox, pos: TrianglePos): boolean {
        return box.preset.includes(pos) || box.added.includes(pos);
    }

    // Boyanması gereken ama boyanmamış üçgenleri ipucu olarak vurgula
    isHintTriangle(box: TriangleBox, pos: TrianglePos): boolean {
        if (!this.showHint) return false;
        if (this.isPreset(box, pos)) return false; // kilitli olan ipucu verilmez
        const shouldBe = this.target.includes(pos);
        const isNow = this.isFilled(box, pos);
        return shouldBe && !isNow;
    }

    toggleTriangle(box: TriangleBox, pos: TrianglePos): void {
        if (this.isNextUnlocked) return;
        if (this.isPreset(box, pos)) return; // kilitli, dokunulamaz
        const idx = box.added.indexOf(pos);
        if (idx >= 0) {
            box.added.splice(idx, 1);
        } else {
            box.added.push(pos);
        }
        this.feedbackState = null;
        this.persist();
    }

    private boxMatches(box: TriangleBox): boolean {
        const current = new Set<TrianglePos>([...box.preset, ...box.added]);
        if (current.size !== this.target.length) return false;
        return this.target.every(t => current.has(t));
    }

    checkAnswer(): void {
        if (!this.boxes.some(box => box.added.length > 0)) {
            this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
            return;
        }
        const hasEmptyTriangle = this.boxes.some(box => box.preset.length + box.added.length === 0);
        if (hasEmptyTriangle) {
            this.fb.showFeedback('error', 'Lütfen her üçgende en az bir bölüm boyayın!');
            return;
        }

        let allCorrect = true;
        this.boxes.forEach(box => {
            if (!this.boxMatches(box)) {
                allCorrect = false;
                box.isShaking = true;
                setTimeout(() => { box.isShaking = false; }, 500);
            }
        });

        if (allCorrect) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Harika! Tüm şekilleri doğru tamamladın!');
        } else {
            this.feedbackState = 'wrong';
            this.hintService.registerError(ID);
            this.fb.showFeedback('error', 'Bazı şekiller eksik. Referansla karşılaştır!');
        }
        this.persist();
    }

    clearSelection(): void {
        this.boxes.forEach(b => {
            b.added = [];
            b.isShaking = false;
        });
        this.feedbackState = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    goPrev(): void {
        this.router.navigate(['/fruit-subtraction']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/set-match']);
    }
}
