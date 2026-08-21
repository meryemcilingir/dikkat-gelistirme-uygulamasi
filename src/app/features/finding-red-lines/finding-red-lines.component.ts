import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActivityService } from '../../core/services/activity.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface Line {
    id: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    color: string;
    isRed: boolean;
    isSelected: boolean;
}

interface Shape {
    type: 'square' | 'rectangle' | 'polygon';
    lines: Line[];
    viewBox: string;
}

interface RedLinesState {
    selections: { [id: string]: boolean };
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'finding-red-lines';

@Component({
    selector: 'app-finding-red-lines',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './finding-red-lines.component.html',
    styleUrl: './finding-red-lines.component.scss'
})
export class FindingRedLinesComponent implements OnInit {
    shapes: Shape[] = [
        {
            type: 'square',
            viewBox: '0 0 200 200',
            lines: [
                { id: 's1', x1: 20, y1: 20, x2: 20, y2: 180, color: '#e74c3c', isRed: true, isSelected: false }, // Left (Red)
                { id: 's2', x1: 20, y1: 20, x2: 180, y2: 20, color: '#e67e22', isRed: false, isSelected: false }, // Top
                { id: 's3', x1: 180, y1: 20, x2: 180, y2: 180, color: '#4caf8a', isRed: false, isSelected: false }, // Right (Green)
                { id: 's4', x1: 20, y1: 180, x2: 180, y2: 180, color: '#5b6fa6', isRed: false, isSelected: false } // Bottom
            ]
        },
        {
            type: 'rectangle',
            viewBox: '0 0 300 200',
            lines: [
                { id: 'r1', x1: 20, y1: 20, x2: 20, y2: 180, color: '#e74c3c', isRed: true, isSelected: false }, // Left (Red)
                { id: 'r2', x1: 20, y1: 20, x2: 280, y2: 20, color: '#5b6fa6', isRed: false, isSelected: false }, // Top
                { id: 'r3', x1: 280, y1: 20, x2: 280, y2: 180, color: '#e74c3c', isRed: true, isSelected: false }, // Right (Red)
                { id: 'r4', x1: 20, y1: 180, x2: 280, y2: 180, color: '#4caf8a', isRed: false, isSelected: false } // Bottom (Green)
            ]
        },
        {
            type: 'polygon', // Using polygon for a triangle
            viewBox: '0 0 200 200',
            lines: [
                { id: 't1', x1: 100, y1: 20, x2: 180, y2: 180, color: '#e67e22', isRed: false, isSelected: false }, // Right slant
                { id: 't2', x1: 180, y1: 180, x2: 20, y2: 180, color: '#4caf8a', isRed: false, isSelected: false },  // Bottom (Green)
                { id: 't3', x1: 20, y1: 180, x2: 100, y2: 20, color: '#e74c3c', isRed: true, isSelected: false }   // Left slant (Red)
            ]
        }
    ];

    feedbackState: 'correct' | 'wrong' | null = null;
    
    private router = inject(Router);
    private gs = inject(GameStateService);
    private fb = inject(FeedbackService);
    private hintService = inject(HintService);
    private activityService = inject(ActivityService);

    get showHints(): boolean {
        return this.hintService.shouldShowHint(ID);
    }

    get isNextUnlocked(): boolean {
        return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<RedLinesState>(ID);
        if (saved) {
            this.shapes.forEach(shape => {
                shape.lines.forEach(line => {
                    line.isSelected = !!saved.selections[line.id];
                });
            });
            this.feedbackState = saved.feedbackState;
        }
    }

    private persist(): void {
        const selections: { [id: string]: boolean } = {};
        this.shapes.forEach(shape => {
            shape.lines.forEach(line => {
                if (line.isSelected) selections[line.id] = true;
            });
        });

        this.gs.save(ID, {
            selections,
            feedbackState: this.feedbackState
        });
    }

    toggleLine(line: Line): void {
        if (this.gs.isCompleted(ID) && this.feedbackState === 'correct') return;
        line.isSelected = !line.isSelected;
        this.feedbackState = null;
        this.persist();
    }

    clearSelections(): void {
        this.shapes.forEach(shape => shape.lines.forEach(l => l.isSelected = false));
        this.feedbackState = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    checkAnswers(): void {
        if (!this.shapes.some(s => s.lines.some(l => l.isSelected))) {
            this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
            return;
        }

        let isCorrect = true;
        this.shapes.forEach(shape => {
            shape.lines.forEach(line => {
                if (line.isRed !== line.isSelected) {
                    isCorrect = false;
                }
            });
        });

        this.feedbackState = isCorrect ? 'correct' : 'wrong';

        if (isCorrect) {
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Harika! Bütün kırmızı çizgileri buldun.');
        } else {
            this.hintService.registerError(ID);
            this.fb.showFeedback('error', 'Bazı çizgiler yanlış veya eksik, tekrar kontrol et.');
        }
        this.persist();
    }

    isHintAdd(line: Line): boolean {
        if (!this.showHints) return false;
        return line.isRed && !line.isSelected;
    }

    isHintRemove(line: Line): boolean {
        if (!this.showHints) return false;
        return !line.isRed && line.isSelected;
    }

    goPrev(): void {
        this.activityService.prev();
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.activityService.next();
    }
}
