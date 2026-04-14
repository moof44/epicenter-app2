import { Injectable, inject, DestroyRef, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, merge, timer, Subject } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';

/**
 * Redirects to /dashboard after 15 minutes of inactivity.
 * Activity = mouse move, click, keydown, touchstart, scroll.
 * Only active when user is logged in and not already on /dashboard.
 */
@Injectable({
    providedIn: 'root',
})
export class IdleRedirectService {
    private router = inject(Router);
    private authService = inject(AuthService);
    private ngZone = inject(NgZone);
    private destroyRef = inject(DestroyRef);

    private readonly IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

    init(): void {
        // Run outside Angular zone to avoid triggering change detection on every mouse move
        this.ngZone.runOutsideAngular(() => {
            const activity$ = merge(
                fromEvent(document, 'mousemove'),
                fromEvent(document, 'click'),
                fromEvent(document, 'keydown'),
                fromEvent(document, 'touchstart'),
                fromEvent(document, 'scroll'),
            );

            activity$.pipe(
                switchMap(() => timer(this.IDLE_TIMEOUT_MS)),
                takeUntilDestroyed(this.destroyRef),
            ).subscribe(() => {
                this.ngZone.run(() => {
                    if (this.authService.isLoggedIn() && this.router.url !== '/dashboard') {
                        this.router.navigate(['/dashboard']);
                    }
                });
            });
        });
    }
}
