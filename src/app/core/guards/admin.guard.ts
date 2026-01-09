import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (_route, _state) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const snackBar = inject(MatSnackBar);

    // Check if the user is an admin using the computed signal
    if (authService.isAdmin()) {
        return true;
    }

    // Permission denied handling
    snackBar.open('Permission Denied: Admins only.', 'Close', {
        duration: 5000,
        panelClass: ['error-snackbar']
    });

    // Redirect to dashboard (or home)
    return router.createUrlTree(['/']);
};
