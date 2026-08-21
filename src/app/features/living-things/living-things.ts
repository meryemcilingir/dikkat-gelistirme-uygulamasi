import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface LivingThingItem {
  id: number;
  name: string;
  emoji: string;
  isLiving: boolean;
  isSelected: boolean;
  isShaking: boolean;
}

export interface LivingThingsState {
  selectedIds: number[];
}

const ID = 'living-things';

@Component({
  selector: 'app-living-things',
  standalone: true,
  imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
  templateUrl: './living-things.html',
  styleUrl: './living-things.scss'
})
export class LivingThingsComponent implements OnInit {

  constructor(
    private router: Router,
    private gs: GameStateService,
    private fb: FeedbackService,
    private hintService: HintService
  ) { }

  items: LivingThingItem[] = [
    { id: 1, name: 'Kedi', emoji: '🐱', isLiving: true, isSelected: false, isShaking: false },
    { id: 2, name: 'Masa', emoji: '🪑', isLiving: false, isSelected: false, isShaking: false },
    { id: 3, name: 'Ampul', emoji: '💡', isLiving: false, isSelected: false, isShaking: false },
    { id: 4, name: 'Ev', emoji: '🏠', isLiving: false, isSelected: false, isShaking: false },
    { id: 5, name: 'Balık', emoji: '🐠', isLiving: true, isSelected: false, isShaking: false },
    { id: 6, name: 'İnek', emoji: '🐮', isLiving: true, isSelected: false, isShaking: false },
  ];

  selectedIds: number[] = [];

  get showHint(): boolean {
    return this.hintService.shouldShowHint(ID);
  }

  get isNextUnlocked(): boolean {
    return this.gs.isCompleted(ID);
  }

  ngOnInit(): void {
    const saved = this.gs.getData<LivingThingsState>(ID);
    if (saved && saved.selectedIds) {
      this.selectedIds = saved.selectedIds;
      this.items.forEach(item => {
        item.isSelected = this.selectedIds.includes(item.id);
      });
    }
  }

  private persist(): void {
    this.gs.save(ID, {
      selectedIds: this.selectedIds
    });
  }

  toggleSelection(item: LivingThingItem): void {
    if (this.isNextUnlocked) return;

    if (!item.isSelected && this.selectedIds.length >= 3) {
      return; // Sadece 3 hakka izin ver. Seçili ise kaldırabilir.
    }

    item.isSelected = !item.isSelected;

    if (item.isSelected) {
      this.selectedIds.push(item.id);
    } else {
      this.selectedIds = this.selectedIds.filter(id => id !== item.id);
    }

    this.persist();
  }

  checkAnswer(): void {
        if (this.selectedIds.length === 0) {
            this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir seçim yapın!');
            return;
        }

    if (this.selectedIds.length === 0) {
      this.fb.showFeedback('error', 'Henüz hiçbir canlı varlık seçmedin!');
      return;
    }

    // Seçilen öğeleri bul
    const selectedItems = this.items.filter(item => this.selectedIds.includes(item.id));

    // Hatalı seçim var mı? (Cansız seçilmiş mi?)
    const wrongSelections = selectedItems.filter(item => !item.isLiving);

    // Eksik seçim var mı? (Toplam 3 canlı seçilmeli)
    const isComplete = selectedItems.length === 3 && wrongSelections.length === 0;

    if (isComplete) {
      this.hintService.resetErrors(ID);
      this.gs.markCompleted(ID);
      this.fb.showFeedback('success', 'Harika! Tüm canlı varlıkları doğru buldun.');
    } else {
      this.hintService.registerError(ID);

      // Yanlış olanları titreştir (Cansız seçilenler varsa)
      if (wrongSelections.length > 0) {
        wrongSelections.forEach(item => {
          // Yanlış seçimi kaldır
          item.isSelected = false;
          this.selectedIds = this.selectedIds.filter(id => id !== item.id);

          // Yanlış seçilenlere titreme efekti ver
          item.isShaking = true;
          setTimeout(() => item.isShaking = false, 500);
        });

        // State'i güncelle
        this.persist();

        this.fb.showFeedback('error', 'Dikkatli bak! Seçtiklerinden bazıları cansız varlıklar.');
      } else {
        // Yanlış yok ama eksik
        this.fb.showFeedback('error', 'Seçtiğin varlıklar canlı, ancak bulman gereken başka canlılar da var!');
      }
    }
  }

  clearSelection(): void {
    this.selectedIds = [];
    this.items.forEach(item => {
      item.isSelected = false;
      item.isShaking = false;
    });
    this.gs.clear(ID);
    this.hintService.resetErrors(ID);
  }

  goPrev(): void {
    this.router.navigate(['/sequence-rule-breaker']);
  }

  goNext(): void {
    if (!this.isNextUnlocked) return;
    this.router.navigate(['/traffic-sign-matching']);
  }
}
