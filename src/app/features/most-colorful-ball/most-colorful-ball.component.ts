import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { HintService } from '../../core/services/hint.service';
import { ActionButtonsComponent } from '../../shared/action-buttons/action-buttons.component';
import { ActivityHeaderComponent } from '../../shared/activity-header/activity-header.component';

export interface SoccerBall {
  id: number;
  patchColors: string[];   // renk dizisi (tek renk veya çoklu)
  colorCount: number;       // kaç farklı renk var
  isCorrect: boolean;
  isSelected: boolean;
  isWrong: boolean;
}

interface MostColorfulBallState {
  balls: SoccerBall[];
  isCompleted: boolean;
}

const ID = 'most-colorful-ball';

@Component({
  selector: 'app-most-colorful-ball',
  standalone: true,
  imports: [CommonModule, ActionButtonsComponent, ActivityHeaderComponent],
  templateUrl: './most-colorful-ball.component.html',
  styleUrl: './most-colorful-ball.component.scss'
})
export class MostColorfulBallComponent implements OnInit {

  balls: SoccerBall[] = [];
  isChecking = false;

  constructor(
    private router: Router,
    private gs: GameStateService,
    private fb: FeedbackService,
    private hintService: HintService
  ) {
    this.initBalls();
  }

  private initBalls(): void {
    // 5x5 grid - görseldeki düzen
    // Her top bir veya birden fazla yama rengine sahip
    // Doğru cevap: en çok renge sahip olan top (3 renk: sarı+kırmızı+mavi)
    const grid: { colors: string[] }[] = [
      // Satır 1
      { colors: ['#e53935'] },           // Kırmızı-siyah
      { colors: ['#fdd835'] },           // Sarı-siyah
      { colors: ['#5c6bc0'] },           // Mavi-siyah
      { colors: ['#43a047'] },           // Yeşil-siyah
      { colors: ['#795548'] },           // Kahverengi-siyah
      // Satır 2
      { colors: ['#43a047'] },           // Yeşil-siyah
      { colors: ['#e53935'] },           // Kırmızı-siyah
      { colors: ['#5c6bc0'] },           // Mavi-siyah
      { colors: ['#fdd835', '#e53935', '#5c6bc0'] }, // ⭐ DOĞRU: Sarı+Kırmızı+Mavi (3 renk!)
      { colors: ['#fdd835'] },           // Sarı-siyah
      // Satır 3
      { colors: ['#43a047'] },           // Yeşil-siyah
      { colors: ['#e53935'] },           // Kırmızı-siyah
      { colors: ['#e53935'] },           // Kırmızı-siyah
      { colors: ['#7b1fa2'] },           // Mor-siyah
      { colors: ['#212121'] },           // Siyah
      // Satır 4
      { colors: ['#795548'] },           // Kahverengi-siyah
      { colors: ['#43a047'] },           // Yeşil-siyah
      { colors: ['#795548'] },           // Kahverengi-siyah
      { colors: ['#fdd835'] },           // Sarı-siyah
      { colors: ['#e53935'] },           // Kırmızı-siyah
      // Satır 5
      { colors: ['#1a237e'] },           // Lacivert
      { colors: ['#795548'] },           // Kahverengi-siyah
      { colors: ['#fdd835'] },           // Sarı-siyah
      { colors: ['#e53935'] },           // Kırmızı-siyah
      { colors: ['#43a047'] },           // Yeşil-siyah
    ];

    this.balls = grid.map((item, index) => ({
      id: index,
      patchColors: item.colors,
      colorCount: item.colors.length,
      isCorrect: item.colors.length === 3,
      isSelected: false,
      isWrong: false
    }));
  }

  get showHint(): boolean {
    return this.hintService.shouldShowHint(ID);
  }

  get isNextUnlocked(): boolean {
    return this.gs.isCompleted(ID);
  }

  /**
   * 6 yama için renk döndürür: index 0 = merkez pentagon, 1-5 = çevre petaller.
   * Tek renkli toplarda tüm yamalara aynı renk verilir.
   * Çok renkli toplarda renkler petaller arasında döngüsel dağılır.
   */
  getPatchColor(ball: SoccerBall, patchIndex: number): string {
    if (ball.patchColors.length === 1) {
      return ball.patchColors[0];
    }
    return ball.patchColors[patchIndex % ball.patchColors.length];
  }

  ngOnInit(): void {
    const saved = this.gs.getData<MostColorfulBallState>(ID);
    if (saved?.balls?.length) {
      this.balls = saved.balls;
    }
  }

  persist(): void {
    this.gs.save(ID, {
      balls: this.balls,
      isCompleted: this.isNextUnlocked
    });
  }

  selectBall(ball: SoccerBall): void {
    if (this.isChecking || this.isNextUnlocked) return;

    // Önceki seçimi temizle
    this.balls.forEach(b => b.isSelected = false);
    ball.isSelected = true;
    this.persist();
  }

  checkAnswer(): void {
    if (!this.balls.some(b => b.isSelected)) {
      this.fb.showFeedback('error', 'Lütfen kontrol etmeden önce bir top seçin!');
      return;
    }

    const selectedBall = this.balls.find(b => b.isSelected);
    if (!selectedBall) return;

    if (selectedBall.isCorrect) {
      this.gs.markCompleted(ID);
      this.hintService.resetErrors(ID);
      this.fb.showFeedback('success', 'Harika! En çok renge sahip topu doğru buldunuz! 🎉');
      this.persist();
    } else {
      this.isChecking = true;
      this.hintService.registerError(ID);
      selectedBall.isWrong = true;
      this.persist();
      selectedBall.isSelected = false;
      this.fb.showFeedback('error', 'Bu top en çok renge sahip değil. Tekrar deneyin!');

      setTimeout(() => {
        selectedBall.isWrong = false;
        this.isChecking = false;
      }, 500);
    }
  }

  clearSelection(): void {
    this.balls.forEach(b => {
      b.isSelected = false;
      b.isWrong = false;
    });
    this.gs.clear(ID);
    this.hintService.resetErrors(ID);
  }

  goPrev(): void {
    this.router.navigate(['/ice-cream-shape']);
  }

  goNext(): void {
    if (!this.isNextUnlocked) return;
    this.router.navigate(['/cat-position']);
  }
}
