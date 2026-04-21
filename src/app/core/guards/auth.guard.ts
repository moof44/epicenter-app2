import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Auth, user } from '@angular/fire/auth';
import { AuthService } from '../services/auth.service';
import { map, take, switchMap, filter } from 'rxjs/operators';

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
                return [router.createUrlTree(['/login'])];
            }

            // Step 2: User is authenticated. Now check Firestore isActive status.
            // Wait for a non-null profile emission (skip the stale null from shareReplay
            // that may still be cached from before login).
            return authService.user$.pipe(
                filter((profile): profile is Record<string, any> => !!profile),
                take(1),
                map(profile => {
                    if (profile['isActive'] === false) {
                        return router.createUrlTree(['/login']);
                    }
                    return true;
                })
            );
        })
    );
};
