import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface RotationOption {
    id: number;
    angle: number;
    isCorrect: boolean;
}

export interface RotationQuestion {
    id: number;
    shapeType: 'L' | 'T' | 'F' | 'Arrow';
    targetAngle: number;
    options: RotationOption[];
    selectedId: number | null;
    color: string;
}

interface SavedState {
    selections: (number | null)[];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'rotate-shape';

interface RotateQuestion {
    id: number;
    shapeType: 'L' | 'F' | 'T';
    targetAngle: number;
    options: { id: number; angle: number; isCorrect: boolean }[];
    selectedId: number | null;
    color: string;
}

const QUESTIONS_DATA: Omit<RotateQuestion, 'selectedId'>[] = [
    {
        id: 0,
        shapeType: 'L',
        targetAngle: 90,
        color: '#42a5f5',
        options: [
            { id: 0, angle: 0, isCorrect: false },
            { id: 1, angle: 180, isCorrect: false },
            { id: 2, angle: 90, isCorrect: true },
            { id: 3, angle: 270, isCorrect: false }
        ]
    },
    {
        id: 1,
        shapeType: 'F',
        targetAngle: 180,
        color: '#ef5350',
        options: [
            { id: 4, angle: 180, isCorrect: true },
            { id: 5, angle: 0, isCorrect: false },
            { id: 6, angle: 90, isCorrect: false },
            { id: 7, angle: 270, isCorrect: false }
        ]
    },
    {
        id: 2,
        shapeType: 'T',
        targetAngle: 270,
        color: '#66bb6a',
        options: [
            { id: 8, angle: 0, isCorrect: false },
            { id: 9, angle: 90, isCorrect: false },
            { id: 10, angle: 180, isCorrect: false },
            { id: 11, angle: 270, isCorrect: true }
        ]
    }
];

@Component({
    selector: 'app-rotate-shape',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './rotate-shape.component.html',
    styleUrl: './rotate-shape.component.scss',
})
export class RotateShapeComponent implements OnInit {
    questions: RotateQuestion[] = this.createFresh();
    feedbackState: 'correct' | 'wrong' | null = null;

    constructor(
        private router: Router,
        private gs: GameStateService,
        private fb: FeedbackService,
        private hintService: HintService,
    ) { }

    get showHint(): boolean { return this.hintService.shouldShowHint(ID); }
    get isNextUnlocked(): boolean {
        return this.feedbackState === 'correct' || this.gs.isCompleted(ID);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<SavedState>(ID);
        if (saved) {
            this.feedbackState = saved.feedbackState;
            saved.selections.forEach((sel, i) => {
                if (this.questions[i]) this.questions[i].selectedId = sel;
            });
        }
    }

    private createFresh(): RotateQuestion[] {
        return QUESTIONS_DATA.map(q => ({ ...q, selectedId: null }));
    }

    private persist(): void {
        this.gs.save(ID, {
            selections: this.questions.map(q => q.selectedId),
            feedbackState: this.feedbackState
        });
    }

    select(q: RotationQuestion, opt: RotationOption): void {
        if (this.feedbackState === 'correct') return;
        q.selectedId = opt.id;
        this.feedbackState = null;
        this.persist();
    }

    clearAll(): void {
        this.questions = this.createFresh();
        this.feedbackState = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    checkAnswers(): void {
        const allSelected = this.questions.every(q => q.selectedId !== null);
        if (!allSelected) {
            this.fb.showFeedback('error', 'Lütfen önce seçimlerinizi yapın!');
            return;
        }

        const allCorrect = this.questions.every(q => {
            const opt = q.options.find(o => o.id === q.selectedId);
            return opt?.isCorrect === true;
        });

        if (allCorrect) {
            this.feedbackState = 'correct';
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Harika! Bütün şekilleri doğru yönde eşleştirdin! 📐');
        } else {
            this.hintService.registerError(ID);
            this.feedbackState = 'wrong';

            if (this.showHint) {
                this.questions.forEach(q => {
                    const opt = q.options.find(o => o.id === q.selectedId);
                    if (opt && !opt.isCorrect) q.selectedId = null;
                });
            }

            this.fb.showFeedback('error', 'Bazı seçimlerin hatalı, tekrar dene!');
        }
        this.persist();
    }

    goPrev(): void { this.router.navigate(['/number-ordering']); }
    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/count-sides']);
    }
}
