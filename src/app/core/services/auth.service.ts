import { Injectable, inject, computed } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signOut, authState } from '@angular/fire/auth';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { from, Observable, of } from 'rxjs';
import { tap, switchMap, shareReplay } from 'rxjs/operators';
import { User as AppUser } from '../models/user.model';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private auth = inject(Auth);
    private firestore = inject(Firestore);
    private router = inject(Router);

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

    login(email: string, password: string): Observable<any> {
        return from(signInWithEmailAndPassword(this.auth, email, password));
    }

    logout(): Observable<void> {
        return from(signOut(this.auth)).pipe(
            tap(() => this.router.navigate(['/login']))
        );
    }
}
