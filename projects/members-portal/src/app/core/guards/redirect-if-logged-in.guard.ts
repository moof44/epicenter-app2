import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { take, switchMap } from 'rxjs/operators';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';

export const redirectIfLoggedInGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const firestore = inject(Firestore);
  const router = inject(Router);

  return authState(auth).pipe(
    take(1),
    switchMap(async (user) => {
      if (!user) {
        return true;
      }

      try {
        const docRef = doc(firestore, `users/${user.uid}`);
        const snap = await getDoc(docRef);
        
        if (snap.exists()) {
          const userData = snap.data();
          const roles = userData['roles'] || [];
          if (roles.includes('MEMBER') && userData['isActive'] !== false) {
            router.navigate(['/dashboard']);
            return false;
          }
        }
        
        // If not a valid active member (e.g., staff member logged in), sign out
        await auth.signOut();
        return true;
      } catch (err) {
        console.error('Redirect guard check failed:', err);
        return true;
      }
    })
  );
};
