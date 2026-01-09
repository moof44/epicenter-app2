import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Auth, user } from '@angular/fire/auth';
import { map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = (_route, _state) => {
    const auth = inject(Auth);
    const router = inject(Router);

    return user(auth).pipe(
        take(1),
        map(currentUser => {
            if (currentUser) {
                return true;
            }
            return router.createUrlTree(['/login']);
        })
    );
};
