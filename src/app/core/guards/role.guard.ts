import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const snackBar = inject(MatSnackBar);

    const requiredRoles = route.data['roles'] as string[];

    // If no roles are required, allow access (or log warning)
    if (!requiredRoles || requiredRoles.length === 0) {
        return true;
    }

    // Check if user has permission
    if (authService.hasAnyRole(requiredRoles)) {
        return true;
    }

    // Permission denied handling
    const userRole = authService.userProfile()?.roles?.join(', ') || 'None';
    console.warn(`Access Denied to ${state.url}. Required: [${requiredRoles.join(', ')}]. Current: [${userRole}]`);

    snackBar.open('Access Denied: You do not have permission to view this page.', 'Close', {
        duration: 5000,
        panelClass: ['error-snackbar']
    });

    // Redirect to home or pos
    return router.createUrlTree(['/']);
};
