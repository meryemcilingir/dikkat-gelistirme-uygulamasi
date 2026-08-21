import { Component, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface ShapeColoringState {
    circles: boolean[];
    triangles: boolean[];
    hearts: boolean[];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'shape-coloring';

@Component({
    selector: 'app-shape-coloring',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './shape-coloring.component.html',
    styleUrl: './shape-coloring.component.scss'
})
export class ShapeColoringComponent implements OnInit {

    // State arrays for each shape type
    circles = [false, false, false, false, false, false, false, false]; // 8 circles
    triangles = [false, false, false, false, false, false];       // 6 triangles
    hearts = [false, false, false, false, false];                 // 5 hearts

    // Expected true/false states for correctness
    // 1. "İlk dört daireyi boyayın."
    readonly targetCircles = [true, true, true, true, false, false, false, false];
    // 2. "Sondan üç üçgeni boyayın."
    readonly targetTriangles = [false, false, false, true, true, true];
    // 3. "En ortadaki kalbi boyayın."
    readonly targetHearts = [false, false, true, false, false];

    feedbackState: 'correct' | 'wrong' | null = null;

    get showHints(): boolean {
        return this.hintService.shouldShowHint(ID);
    }

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService
    ) { }

    get isNextUnlocked(): boolean {
        return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<ShapeColoringState>(ID);
        if (saved) {
            this.circles = [...saved.circles];
            this.triangles = [...saved.triangles];
            this.hearts = [...saved.hearts];
            this.feedbackState = saved.feedbackState;
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            circles: this.circles,
            triangles: this.triangles,
            hearts: this.hearts,
            feedbackState: this.feedbackState
        });
    }

    toggleCircle(index: number): void {
        if (this.gs.isCompleted(ID) && this.feedbackState === 'correct') return;
        this.circles[index] = !this.circles[index];
        this.resetFeedback();
    }

    toggleTriangle(index: number): void {
        if (this.gs.isCompleted(ID) && this.feedbackState === 'correct') return;
        this.triangles[index] = !this.triangles[index];
        this.resetFeedback();
    }

    toggleHeart(index: number): void {
        if (this.gs.isCompleted(ID) && this.feedbackState === 'correct') return;
        this.hearts[index] = !this.hearts[index];
        this.resetFeedback();
    }

    private resetFeedback(): void {
        this.feedbackState = null;
        this.persist();
    }

    clearGrid(): void {
        this.circles.fill(false);
        this.triangles.fill(false);
        this.hearts.fill(false);
        this.feedbackState = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    checkPattern(): void {
        const circlesSelected = this.circles.some(c => c);
        const trianglesSelected = this.triangles.some(t => t);
        const heartsSelected = this.hearts.some(h => h);
        if (!circlesSelected && !trianglesSelected && !heartsSelected) {
            this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
            return;
        }
        if (!circlesSelected || !trianglesSelected || !heartsSelected) {
            this.fb.showFeedback('error', 'Lütfen her satırdan en az bir şekil boyayın!');
            return;
        }

        const circlesCorrect = this.circles.every((val, i) => val === this.targetCircles[i]);
        const trianglesCorrect = this.triangles.every((val, i) => val === this.targetTriangles[i]);
        const heartsCorrect = this.hearts.every((val, i) => val === this.targetHearts[i]);

        const isCorrect = circlesCorrect && trianglesCorrect && heartsCorrect;

        this.feedbackState = isCorrect ? 'correct' : 'wrong';

        if (isCorrect) {
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Harika! Bütün şekilleri doğru boyadın!');
        } else {
            this.hintService.registerError(ID);
            this.fb.showFeedback('error', 'Bazı şekiller yanlış, tekrar deneyelim.');
        }
        this.persist();
    }

    isHintAdd(type: 'circle' | 'triangle' | 'heart', index: number): boolean {
        if (!this.showHints) return false;
        if (type === 'circle') return !this.circles[index] && this.targetCircles[index];
        if (type === 'triangle') return !this.triangles[index] && this.targetTriangles[index];
        if (type === 'heart') return !this.hearts[index] && this.targetHearts[index];
        return false;
    }

    isHintRemove(type: 'circle' | 'triangle' | 'heart', index: number): boolean {
        if (!this.showHints) return false;
        if (type === 'circle') return this.circles[index] && !this.targetCircles[index];
        if (type === 'triangle') return this.triangles[index] && !this.targetTriangles[index];
        if (type === 'heart') return this.hearts[index] && !this.targetHearts[index];
        return false;
    }

    goPrev(): void {
        this.router.navigate(['/pattern-2']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/liquid-selection']);
    }
}
