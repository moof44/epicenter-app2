import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Auth, user } from '@angular/fire/auth';
import { AuthService } from '../services/auth.service';
import { of } from 'rxjs';
import { map, take, switchMap, filter, timeout, catchError } from 'rxjs/operators';

export const authGuard: CanActivateFn = (_route, _state) => {
    const auth = inject(Auth);
    const authService = inject(AuthService);
    const router = inject(Router);

    // Step 1: Fast Firebase Auth check (resolves immediately after login)
    return user(auth).pipe(
        take(1),
        switchMap(currentUser => {
            if (!currentUser) {
                // Not authenticated at all — redirect to login immediately
                return of(router.createUrlTree(['/login']));
            }

            // Step 2: User is authenticated. Check Firestore isActive status.
            // Protected with a timeout so it never hangs if Firestore IndexedDB cache is stalled.
            return authService.user$.pipe(
                filter((profile): profile is Record<string, any> => !!profile),
                take(1),
                timeout({
                    each: 2000,
                    with: () => of({ isActive: true }) // Graceful fallback to allow authenticated user
                }),
                map(profile => {
                    if (profile && profile['isActive'] === false) {
                        return router.createUrlTree(['/login']);
                    }
                    return true;
                }),
                catchError(() => of(true))
            );
        })
    );
};
