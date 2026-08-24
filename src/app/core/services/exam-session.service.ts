import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, UrlTree } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { StudentExamState, ExamAttempt } from '../models/exam.model';

/**
 * Öğrencinin 150 soruluk sınav ilerlemesini backend ile senkron tutar.
 * Mevcut 150 oyun component'i HİÇ değiştirilmeden, sadece HintService (yanlış cevap)
 * ve GameStateService (doğru cevap) üzerinden merkezi olarak beslenir.
 *
 * Öğrenci artık cevabını tek seferde gönderir: doğru da olsa yanlış da olsa
 * tekrar deneme YOK, doğru/yanlış geri bildirimi öğrenciye gösterilmiyor.
 * `submitting` sinyali, cevap gönderilir gönderilmez (component kendi doğru/yanlış
 * görselini boyamadan ÖNCE, aynı senkron tick içinde) true olur; global bir
 * opak katman bu anı kapatarak öğrencinin sonucu görmesini engeller.
 */
@Injectable({ providedIn: 'root' })
export class ExamSessionService {
    private http = inject(HttpClient);
    private auth = inject(AuthService);

    private readonly _examState = signal<StudentExamState | null>(null);
    readonly examState = this._examState.asReadonly();

    private readonly _submitting = signal(false);
    readonly submitting = this._submitting.asReadonly();

    /**
     * "Cevabınız gönderildi" bildirimi — `submitting` ile AYNI anda başlar
     * ama ondan bağımsız, sabit bir süre boyunca açık kalır. `submitting`
     * yalnızca gerçek network+navigate süresi kadar açık (soru geçiş hızını
     * bozmamak için olabildiğince kısa); bildirimi de ona bağlarsak (soru
     * önceden yüklendiği için ~anlık kapanıyor) okunamadan kayboluyordu.
     * Blocker kalkınca kullanıcı zaten bir sonraki soruyla etkileşebilir —
     * bu bildirim yalnızca üstte kısa süre görünen, hiçbir şeyi engellemeyen
     * bir katman.
     */
    private readonly _toastVisible = signal(false);
    readonly toastVisible = this._toastVisible.asReadonly();
    private toastTimer: ReturnType<typeof setTimeout> | null = null;
    private static readonly TOAST_DURATION_MS = 1400;

    private loadPromise: Promise<StudentExamState> | null = null;

    /**
     * Şu anki sorunun görüntülenmeye başladığı an — yalnızca öğretmenin
     * inceleme ekranında gösterilecek "harcanan süre" için (öğrenciye hiç
     * gösterilmez). Sayfa yenilenirse (örn. sınavı yarıda bırakıp döndüğünde)
     * bu alan da sıfırlanır; böylece aradaki bekleme süresi kaydedilmez.
     */
    private questionStartedAtMs: number | null = null;
    private questionStartedPath: string | null = null;

    private currentQuestionPath(): string | null {
        const state = this._examState();
        if (!state) return null;
        if (state.attempt.status === 'Completed') return null;
        return state.questions[state.attempt.currentIndex] ?? null;
    }

    async ensureLoaded(force = false): Promise<StudentExamState | null> {
        const user = this.auth.currentUser();
        if (!user || user.role !== 'student') return null;
        if (this._examState() && !force) return this._examState();
        if (this.loadPromise && !force) return this.loadPromise;

        this.loadPromise = firstValueFrom(this.http.get<StudentExamState>('/api/student/exam'))
            .then(state => {
                this._examState.set(state);
                return state;
            })
            .finally(() => { this.loadPromise = null; });

        return this.loadPromise;
    }

    /** canActivateChild tarafından çağrılır: öğrenci sadece sırası gelen soruya girebilir. */
    async checkStudentNavigation(url: string, router: Router): Promise<boolean | UrlTree> {
        const state = await this.ensureLoaded();
        if (!state) return true; // öğrenci değil (guard zaten sadece student için çağrılır ama garanti olsun)

        const requestedPath = url.split('/').filter(Boolean).pop() || '';
        const { attempt, questions } = state;

        if (attempt.status === 'Completed') {
            if (requestedPath === 'end') return true;
            return router.createUrlTree(['/end']);
        }

        const allowedPath = questions[attempt.currentIndex];
        if (allowedPath !== this.questionStartedPath) {
            this.questionStartedPath = allowedPath;
            this.questionStartedAtMs = Date.now();
        }

        if (requestedPath === allowedPath) return true;
        return router.createUrlTree([`/${allowedPath}`]);
    }

    /**
     * O anki aktif soru için mi kontrol ediyoruz? Öyleyse görsel-gizleme katmanını
     * HEMEN (senkron) devreye sokar — component kendi doğru/yanlış görselini
     * boyamadan önce/aynı anda ekranı kapatmak için.
     * GameStateService.markCompleted içinden de senkron olarak çağrılır (public).
     */
    beginSubmitIfActive(activityPath: string): boolean {
        if (this.currentQuestionPath() !== activityPath) return false;
        this._submitting.set(true);
        this._toastVisible.set(true);
        if (this.toastTimer) clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => this._toastVisible.set(false), ExamSessionService.TOAST_DURATION_MS);
        return true;
    }

    /** HintService.registerError içinden çağrılır (yanlış cevap → tekrar deneme yok, direkt sonuçlanır). */
    recordWrongAttempt(activityPath: string, studentAnswer: unknown, router: Router): void {
        if (!this.beginSubmitIfActive(activityPath)) return;
        void this.finalizeAnswer(activityPath, studentAnswer, false, router);
    }

    /** GameStateService.markCompleted içinden çağrılır (doğru cevap). */
    recordSuccess(activityPath: string, studentAnswer: unknown, router: Router): void {
        if (!this.beginSubmitIfActive(activityPath)) return;
        void this.finalizeAnswer(activityPath, studentAnswer, true, router);
    }

    /**
     * Cevabı backend'e kaydeder, ilerlemeyi günceller ve (doğru/yanlış fark etmeksizin)
     * otomatik olarak sonraki soruya/sınav bitişine yönlendirir. Öğrenciye doğru/yanlış
     * bilgisi hiçbir noktada gösterilmez.
     */
    private async finalizeAnswer(
        activityPath: string,
        studentAnswer: unknown,
        isCorrect: boolean,
        router: Router
    ): Promise<void> {
        const state = this._examState();
        if (!state) {
            this._submitting.set(false);
            return;
        }

        const timeSpentSeconds = this.questionStartedPath === activityPath && this.questionStartedAtMs !== null
            ? Math.round((Date.now() - this.questionStartedAtMs) / 1000)
            : null;

        try {
            const res = await firstValueFrom(
                this.http.post<{ attempt: ExamAttempt }>('/api/student/exam/answer', {
                    questionIndex: state.attempt.currentIndex,
                    questionId: activityPath,
                    studentAnswer,
                    isCorrect,
                    attemptCount: 1,
                    timeSpentSeconds,
                })
            );

            this._examState.set({ ...state, attempt: res.attempt });

            // Yapay bir bekleme YOK — cevap kaydedilir kaydedilmez direkt sonraki
            // soruya geçilir (150 soru üzerinden birikince gözle görülür bir
            // gecikmeye dönüşüyordu). Kapatma katmanı yalnızca navigate()
            // gerçekten bitene kadar açık kalır: yeni soru component'i
            // lazy-loaded olduğu için (artık uygulama açılışında preload
            // edildiğinden neredeyse anlık) blocker'ı erken kaldırırsak eski
            // soru yok olmuş, yenisi henüz gelmemiş olur ve kısa bir boş ekran
            // anı oluşur.
            if (res.attempt.status === 'Completed') {
                await router.navigate(['/end']);
            } else {
                const next = state.questions[res.attempt.currentIndex];
                await router.navigate([`/${next}`]);
            }
            this._submitting.set(false);
        } catch {
            this._submitting.set(false);
        }
    }

    reset(): void {
        this._examState.set(null);
        this._submitting.set(false);
        this._toastVisible.set(false);
        if (this.toastTimer) clearTimeout(this.toastTimer);
    }
}
