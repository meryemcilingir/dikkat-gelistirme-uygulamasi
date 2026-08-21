import { Component, OnInit, inject } from '@angular/core';
import { ReviewModeService } from '../../core/services/review-mode.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface FlowerColoringState {
    flowerColors: { [key: string]: string };
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'flower-coloring';

@Component({
    selector: 'app-flower-coloring',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './flower-coloring.component.html',
    styleUrl: './flower-coloring.component.scss'
})
export class FlowerColoringComponent implements OnInit {
    reviewMode = inject(ReviewModeService);
    // Current selected color from palette
    selectedColor: string = '';

    // Flower parts and their colors
    // Keys: 'center', 'inner1' to 'inner5', 'petal1' to 'petal5'
    flowerColors: { [key: string]: string } = {
        center: '#ffffff',
        inner1: '#ffffff',
        inner2: '#ffffff',
        inner3: '#ffffff',
        inner4: '#ffffff',
        inner5: '#ffffff',
        petal1: '#ffffff',
        petal2: '#ffffff',
        petal3: '#ffffff',
        petal4: '#ffffff',
        petal5: '#ffffff'
    };

    // Reference colors (the goal) - Using thematic colors
    readonly targetColors: { [key: string]: string } = {
        center: '#ffca28', // Yellow
        inner1: '#bf4f6b', // Red (updated from #f06292)
        inner2: '#bf4f6b',
        inner3: '#bf4f6b',
        inner4: '#bf4f6b',
        inner5: '#bf4f6b',
        petal1: '#5b6fa6', // Blue (updated from #4fc3f7)
        petal2: '#5b6fa6',
        petal3: '#5b6fa6',
        petal4: '#5b6fa6',
        petal5: '#5b6fa6'
    };

    palette = [
        { name: 'Mavi', hex: '#5b6fa6' },
        { name: 'Kırmızı', hex: '#bf4f6b' },
        { name: 'Sarı', hex: '#ffca28' }
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
        const saved = this.gs.getData<FlowerColoringState>(ID);
        if (saved) {
            this.flowerColors = { ...saved.flowerColors };
            this.feedbackState = saved.feedbackState;
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            flowerColors: this.flowerColors,
            feedbackState: this.feedbackState
        });
    }

    selectPaletteColor(hex: string): void {
        this.selectedColor = hex;
    }

    paintPart(part: string): void {
        if (this.gs.isCompleted(ID) && this.feedbackState === 'correct') return;
        if (!this.selectedColor) {
            this.fb.showFeedback('error', 'Lütfen önce aşağıdan bir renk seçin!');
            return;
        }

        this.flowerColors[part] = this.selectedColor;
        this.feedbackState = null;
        this.persist();
    }

    clearColors(): void {
        Object.keys(this.flowerColors).forEach(k => this.flowerColors[k] = '#ffffff');
        this.feedbackState = null;
        this.selectedColor = '';
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    checkAnswers(): void {
        if (Object.keys(this.targetColors).some(key => this.flowerColors[key] === '#ffffff')) {
            this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce tüm bölümleri boyayın!');
            return;
        }

        const isCorrect = Object.keys(this.targetColors).every(
            key => this.flowerColors[key].toLowerCase() === this.targetColors[key].toLowerCase()
        );

        this.feedbackState = isCorrect ? 'correct' : 'wrong';

        if (isCorrect) {
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Harika! Çiçeği doğru renklendirdin.');
        } else {
            this.hintService.registerError(ID);
            this.fb.showFeedback('error', 'Bazı bölümler yanlış renkte, örnekteki renklere dikkat edelim.');
        }
        this.persist();
    }

    isHint(part: string): boolean {
        if (!this.showHints) return false;
        return this.flowerColors[part].toLowerCase() !== this.targetColors[part].toLowerCase();
    }

    goPrev(): void {
        this.router.navigate(['/triangle-size']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/not-in-word']);
    }
}
