import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActivityService } from '../../core/services/activity.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';
import { SharedFeedbackComponent } from '../../shared/shared-feedback/shared-feedback.component';

interface ChildOption {
    id: number;
    name: string;
    emoji: string;
    mood: string;
    isSad: boolean;
}

interface SadExpressionsState {
    selectedIds: number[];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'sad-expressions';

@Component({
    selector: 'app-sad-expressions',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent, SharedFeedbackComponent],
    templateUrl: './sad-expressions.component.html',
    styleUrl: './sad-expressions.component.scss'
})
export class SadExpressionsComponent implements OnInit {

    options: ChildOption[] = [
        { id: 2, name: 'Can', emoji: '😊', mood: 'happy', isSad: false },
        { id: 3, name: 'Elif', emoji: '😢', mood: 'crying', isSad: true },
        { id: 4, name: 'Zeynep', emoji: '😄', mood: 'happy', isSad: false },
        { id: 1, name: 'Ali', emoji: '😟', mood: 'sad', isSad: true },
    ];

    selectedIds: Set<number> = new Set();
    feedbackState: 'correct' | 'wrong' | null = null;

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

    isSelected(id: number): boolean {
        return this.selectedIds.has(id);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<SadExpressionsState>(ID);
        if (saved) {
            this.selectedIds = new Set(saved.selectedIds);
            this.feedbackState = saved.feedbackState;
        }
    }

    private persist(): void {
        this.gs.save(ID, {
            selectedIds: Array.from(this.selectedIds),
            feedbackState: this.feedbackState
        });
    }

    toggleChild(id: number): void {
        if (this.gs.isCompleted(ID) && this.feedbackState === 'correct') return;

        if (this.selectedIds.has(id)) {
            this.selectedIds.delete(id);
        } else {
            this.selectedIds.add(id);
        }
        this.feedbackState = null;
        this.persist();
    }

    onReset(): void {
        this.selectedIds.clear();
        this.feedbackState = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    onCheck(): void {
        if (this.selectedIds.size === 0) {
            this.fb.showFeedback('error', 'Lütfen üzgün olan ifadeleri seçin.');
            return;
        }

        const correctIds = this.options.filter(o => o.isSad).map(o => o.id);
        const isCorrect = correctIds.length === this.selectedIds.size &&
            correctIds.every(id => this.selectedIds.has(id));

        this.feedbackState = isCorrect ? 'correct' : 'wrong';

        if (isCorrect) {
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Tebrikler! Üzgün ifadeleri doğru buldun!');
        } else {
            this.hintService.registerError(ID);
            this.fb.showFeedback('error', 'Bazı seçimler yanlış. Yüz ifadelerine dikkat et.');
        }
        this.persist();
    }

    isHintCorrect(id: number): boolean {
        if (!this.showHints) return false;
        const opt = this.options.find(o => o.id === id);
        return opt?.isSad === true && !this.selectedIds.has(id);
    }

    isHintWrong(id: number): boolean {
        if (!this.showHints) return false;
        const opt = this.options.find(o => o.id === id);
        return opt?.isSad === false && this.selectedIds.has(id);
    }

    prev(): void {
        this.activityService.prev();
    }

    next(): void {
        if (this.isNextUnlocked) {
            this.activityService.next();
        }
    }
}
