import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

interface ChildOption {
    id: number;
    name: string;
    emoji: string;
    mood: string;
    isHappy: boolean;
}

interface HappyChildrenState {
    selectedIds: number[];
    feedbackState: 'correct' | 'wrong' | null;
}

const ID = 'happy-children';

@Component({
    selector: 'app-happy-children',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
    templateUrl: './happy-children.component.html',
    styleUrl: './happy-children.component.scss'
})
export class HappyChildrenComponent implements OnInit {

    options: ChildOption[] = [
        { id: 1, name: 'Ali', emoji: '😟', mood: 'sad', isHappy: false },
        { id: 2, name: 'Can', emoji: '😊', mood: 'happy', isHappy: true },
        { id: 3, name: 'Elif', emoji: '😢', mood: 'crying', isHappy: false },
        { id: 4, name: 'Zeynep', emoji: '😄', mood: 'happy', isHappy: true },
    ];

    selectedIds: Set<number> = new Set();
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

    isSelected(id: number): boolean {
        return this.selectedIds.has(id);
    }

    ngOnInit(): void {
        const saved = this.gs.getData<HappyChildrenState>(ID);
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

    clearSelections(): void {
        this.selectedIds.clear();
        this.feedbackState = null;
        this.gs.clear(ID);
        this.hintService.resetErrors(ID);
    }

    checkAnswers(): void {
        if (this.selectedIds.size === 0) {
            this.fb.showFeedback('error', 'Lütfen mutlu olan çocukları seçin.');
            return;
        }

        const correctIds = this.options.filter(o => o.isHappy).map(o => o.id);
        const isCorrect = correctIds.length === this.selectedIds.size &&
            correctIds.every(id => this.selectedIds.has(id));

        this.feedbackState = isCorrect ? 'correct' : 'wrong';

        if (isCorrect) {
            this.gs.markCompleted(ID);
            this.hintService.resetErrors(ID);
            this.fb.showFeedback('success', 'Tebrikler! Mutlu çocukları doğru buldun!');
        } else {
            this.hintService.registerError(ID);
            this.fb.showFeedback('error', 'Bazı seçimler yanlış. Yüz ifadelerine dikkat et.');
        }
        this.persist();
    }

    isHintCorrect(id: number): boolean {
        if (!this.showHints) return false;
        const opt = this.options.find(o => o.id === id);
        return opt?.isHappy === true && !this.selectedIds.has(id);
    }

    isHintWrong(id: number): boolean {
        if (!this.showHints) return false;
        const opt = this.options.find(o => o.id === id);
        return opt?.isHappy === false && this.selectedIds.has(id);
    }

    goPrev(): void {
        this.router.navigate(['/shape-counting']);
    }

    goNext(): void {
        if (!this.isNextUnlocked) return;
        this.router.navigate(['/different-mountain']);
    }
}
