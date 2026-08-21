import { inject } from '@angular/core';
import { CanActivateFn, CanActivateChildFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ExamSessionService } from '../services/exam-session.service';
import { Role } from '../models/user.model';

export const authGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (auth.isLoggedIn()) return true;
    return router.createUrlTree(['/login']);
};

export function roleGuard(...roles: Role[]): CanActivateFn {
    return () => {
        const auth = inject(AuthService);
        const router = inject(Router);
        const user = auth.currentUser();
        if (!user) return router.createUrlTree(['/login']);
        if (!roles.includes(user.role)) return router.createUrlTree([auth.homePathFor(user)]);
        return true;
    };
}

/**
 * 150 soruluk sınav rotalarını (mevcut düz /pattern, /odd-direction ... yolları) sarmalar.
 * - Öğretmen/Yönetici: serbestçe gezinebilir (içerik önizleme).
 * - Öğrenci: sadece sırası gelen soruya erişebilir; sınav tamamlandıysa /end'e yönlenir.
 */
export const studentExamGuard: CanActivateChildFn = (_childRoute, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const user = auth.currentUser();
    if (!user) return router.createUrlTree(['/login']);
    if (user.role !== 'student') return true;

    const examSession = inject(ExamSessionService);
    return examSession.checkStudentNavigation(state.url, router);
};
