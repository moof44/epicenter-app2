import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';

export const roleGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const snackBar = inject(MatSnackBar);

    const requiredRoles = route.data['roles'] as string[];

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
        return true;
    }

    return authService.user$.pipe(
        take(1),
        map(user => {
            // Check if user has permission
            if (user && user['roles'] && requiredRoles.some(role => user['roles'].includes(role))) {
                return true;
            }

            // Permission denied handling
            const userRole = user && user['roles'] ? user['roles'].join(', ') : 'None';
            console.warn(`Access Denied to ${state.url}. Required: [${requiredRoles.join(', ')}]. Current: [${userRole}]`);

            // Only show snackbar if user is actually logged in but lacks permission
            // If user is null (not logged in), they might just need to be redirected to login without an error
            if (user) {
                snackBar.open('Access Denied: You do not have permission to view this page.', 'Close', {
                    duration: 5000,
                    panelClass: ['error-snackbar']
                });
            }

            // Redirect to home or pos
            return router.createUrlTree(['/']);
        })
    );
};
