import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { take, switchMap } from 'rxjs/operators';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';

export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const firestore = inject(Firestore);
  const router = inject(Router);

  return authState(auth).pipe(
    take(1),
    switchMap(async (user) => {
      if (!user) {
        router.navigate(['/login']);
        return false;
      }

      try {
        // Read user document to check role
        const docRef = doc(firestore, `users/${user.uid}`);
        const snap = await getDoc(docRef);
        
        if (snap.exists()) {
          const userData = snap.data();
          const roles = userData['roles'] || [];
          if (roles.includes('MEMBER') && userData['isActive'] !== false) {
            return true;
          }
        }
        
        // Log out if unauthorized role (e.g. staff) tries to access portal
        await auth.signOut();
        router.navigate(['/login']);
        return false;
      } catch (err) {
        console.error('Auth guard validation failed:', err);
        router.navigate(['/login']);
        return false;
      }
    })
  );
};
