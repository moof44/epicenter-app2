import { Injectable, inject, computed } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signOut, authState, setPersistence, browserLocalPersistence, browserSessionPersistence } from '@angular/fire/auth';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { toSignal } from '@angular/core/rxjs-interop';
import { from, Observable, of } from 'rxjs';
import { tap, switchMap, shareReplay, distinctUntilChanged, map } from 'rxjs/operators';
import { User as AppUser } from '../models/user.model';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private auth = inject(Auth);
    private firestore = inject(Firestore);
    private router = inject(Router);
    private snackBar = inject(MatSnackBar);

    // Observable pipeline: Auth User -> Firestore Profile
    user$ = authState(this.auth).pipe(
        switchMap(user => {
            if (!user) return of(null);
            // Fetch full profile from Firestore to get roles
            return docData(doc(this.firestore, 'users', user.uid));
        }),
        shareReplay(1)
    );

    // Signal of the current user profile (including roles)
    userProfile = toSignal(this.user$ as Observable<AppUser | null>, { initialValue: null });

    // Computed signal to check if user is logged in
    isLoggedIn = computed(() => !!this.userProfile());

    // Computed signal to check if user is ADMIN
    isAdmin = computed(() => {
        const user = this.userProfile();
        return user?.roles?.includes('ADMIN') ?? false;
    });

    /**
     * Checks if the user has at least one of the required roles.
     * @param requiredRoles Array of roles to check against.
     */
    hasAnyRole(requiredRoles: string[]): boolean {
        const user = this.userProfile();
        if (!user || !user.roles) return false;
        return requiredRoles.some(role => user.roles.includes(role));
    }

    login(email: string, password: string, rememberMe = false): Observable<any> {
        return from(
            setPersistence(this.auth, rememberMe ? browserLocalPersistence : browserSessionPersistence)
                .then(() => signInWithEmailAndPassword(this.auth, email, password))
        );
    }

    logout(): Observable<void> {
        return from(signOut(this.auth)).pipe(
            tap(() => this.router.navigate(['/login']))
        );
    }

    constructor() {
        // Global Listener for Emergency Logout
        // Only react when minAuthTimestamp actually changes (not on every Firestore snapshot re-emit).
        // Use getIdTokenResult(false) to read the cached token instead of forcing a network refresh,
        // which previously caused a feedback loop: listener emit → token refresh → Firestore reconnect → re-emit.
        docData(doc(this.firestore, 'system/settings')).pipe(
            map((settings: any) => {
                if (!settings?.minAuthTimestamp) return null;
                return settings.minAuthTimestamp.toMillis
                    ? settings.minAuthTimestamp.toMillis()
                    : new Date(settings.minAuthTimestamp).getTime();
            }),
            distinctUntilChanged()
        ).subscribe((minAuthTime: number | null) => {
            if (!minAuthTime) return;

            this.auth.currentUser?.getIdTokenResult(false).then(idTokenResult => {
                const authTime = new Date(idTokenResult.authTime).getTime();

                if (authTime < minAuthTime) {
                    this.logout().subscribe();
                }
            });
        });

        // Active Status Protection — force logout when isActive flips to false
        this.user$.pipe(
            map((profile: any) => profile?.isActive),
            distinctUntilChanged()
        ).subscribe((isActive: boolean | undefined) => {
            // Only react to explicit false (not undefined/null from logout or legacy users)
            if (isActive === false && this.auth.currentUser) {
                this.snackBar.open(
                    'Your account has been deactivated. Contact an administrator.',
                    'Close',
                    { duration: 8000, panelClass: ['error-snackbar'] }
                );
                this.logout().subscribe();
            }
        });
    }
}
