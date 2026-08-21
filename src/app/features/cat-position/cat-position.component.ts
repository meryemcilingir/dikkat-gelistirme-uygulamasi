import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

/**
 * Sahne: Kedi ve masa konumu.
 * Her sahne için çocuk doğru sembolü (X / + / V) seçmeli.
 */
export interface CatScene {
  id: number;
  image: string;            // Resim dosya yolu
  label: string;            // Sahne açıklaması (erişilebilirlik için)
  correctSymbol: string;    // Doğru cevap: 'X' | '+' | 'V'
  selectedSymbol: string | null;  // Seçilen sembol
  isWrong: boolean;
}

interface CatPositionState {
  scenes: CatScene[];
  isCompleted: boolean;
}

const ID = 'cat-position';

@Component({
  selector: 'app-cat-position',
  standalone: true,
  imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
  templateUrl: './cat-position.component.html',
  styleUrl: './cat-position.component.scss'
})
export class CatPositionComponent implements OnInit {

  symbols = ['X', '+', 'V'];

  scenes: CatScene[] = [
    {
      id: 1,
      image: 'assets/kedi_masanin_ustunde.png',
      label: 'Masanın üstündeki kedi',
      correctSymbol: 'X',
      selectedSymbol: null,
      isWrong: false
    },
    {
      id: 2,
      image: 'assets/kedi_masanin_yaninda.png',
      label: 'Masanın yanındaki kedi',
      correctSymbol: '+',
      selectedSymbol: null,
      isWrong: false
    },
    {
      id: 3,
      image: 'assets/kedi_masanin_altinda.png',
      label: 'Masanın altındaki kedi',
      correctSymbol: 'V',
      selectedSymbol: null,
      isWrong: false
    }
  ];

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
    return this.gs.isCompleted(ID);
  }

  /** Tüm sahneler doğru seçildi mi? */
  get allCorrect(): boolean {
    return this.scenes.every(s => s.selectedSymbol === s.correctSymbol);
  }

  ngOnInit(): void {
    const saved = this.gs.getData<CatPositionState>(ID);
    if (saved?.scenes?.length) {
      this.scenes = saved.scenes;
    }
  }

  private persist(): void {
    this.gs.save(ID, {
      scenes: this.scenes,
      isCompleted: this.isNextUnlocked
    });
  }

  selectSymbol(scene: CatScene, symbol: string): void {
    if (this.isNextUnlocked) return;

    // Her sahne bağımsız çalışır — aynı sembol birden fazla sahnede seçilebilir
    scene.selectedSymbol = symbol;
    scene.isWrong = false;
    this.persist();
  }

  checkAnswer(): void {
    const unselected = this.scenes.filter(s => !s.selectedSymbol);
    if (unselected.length > 0) {
      this.fb.showFeedback('error', 'Lütfen her sahne için bir sembol seçin!');
      return;
    }

    if (this.allCorrect) {
      this.gs.markCompleted(ID);
      this.hintService.resetErrors(ID);
      this.fb.showFeedback('success', 'Mükemmel! Tüm kedilerin konumlarını doğru buldunuz! 🐱');
      this.persist();
    } else {
      this.hintService.registerError(ID);
      // Hatalı sahneleri titret
      this.scenes.forEach(s => {
        if (s.selectedSymbol !== s.correctSymbol) {
          s.isWrong = true;
          setTimeout(() => (s.isWrong = false), 500);
        }
      });
      this.fb.showFeedback('error', 'Bazı semboller yanlış. Tekrar deneyin!');
    }
  }

  clearSelection(): void {
    this.scenes.forEach(s => {
      s.selectedSymbol = null;
      s.isWrong = false;
    });
    this.gs.clear(ID);
    this.hintService.resetErrors(ID);
  }

  goPrev(): void {
    this.router.navigate(['/most-colorful-ball']);
  }

  goNext(): void {
    if (!this.isNextUnlocked) return;
    this.router.navigate(['/dot-grid-copy']);
  }
}
