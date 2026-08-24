import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../services/auth.service';
import { of } from 'rxjs';
import { map, take, filter, timeout, catchError } from 'rxjs/operators';

export const roleGuard: CanActivateFn = (route, _state) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const snackBar = inject(MatSnackBar);

    const requiredRoles = route.data['roles'] as string[];

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
        return true;
    }

    // Fast-path: Instant synchronous role validation if profile is already in memory
    const cachedProfile = authService.userProfile();
    if (cachedProfile) {
        if (cachedProfile.isActive === false) {
            return router.createUrlTree(['/login']);
        }
        if (cachedProfile.roles && requiredRoles.some(role => cachedProfile.roles.includes(role))) {
            return true;
        }
        snackBar.open('Access Denied: You do not have permission to view this page.', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
        });
        return router.createUrlTree(['/']);
    }

    return authService.user$.pipe(
        filter((user): user is Record<string, any> => !!user),
        take(1),
        timeout({
            each: 2000,
            with: () => {
                const cached = authService.userProfile();
                return of(cached as Record<string, any>);
            }
        }),
        map(user => {
            // Block deactivated users
            if (user && user['isActive'] === false) {
                return router.createUrlTree(['/login']);
            }

            // Check if user has permission
            if (user && user['roles'] && requiredRoles.some(role => user['roles'].includes(role))) {
                return true;
            }

            // Permission denied handling
            if (user) {
                snackBar.open('Access Denied: You do not have permission to view this page.', 'Close', {
                    duration: 5000,
                    panelClass: ['error-snackbar']
                });
            }

            // Redirect to home or pos
            return router.createUrlTree(['/']);
        }),
        catchError(() => of(true))
    );
};
