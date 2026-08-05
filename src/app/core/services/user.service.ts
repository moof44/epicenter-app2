import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { from, Observable, map } from 'rxjs';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { CreateUserDto, User } from '../models/user.model';

export const STAFF_ROLES = ['ADMIN', 'MANAGER', 'STAFF', 'TRAINER'];

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private functions = inject(Functions);
    private firestore = inject(Firestore);

    /**
     * Creates a new staff account by calling the Cloud Function.
     * @param data CreateUserDto object containing email, password, profile, and roles.
     * @returns Observable of the function execution result.
     */
    createUser(data: CreateUserDto): Observable<any> {
        const callable = httpsCallable(this.functions, 'createStaffAccount');
        return from(callable(data));
    }

    /**
     * Fetches all users from Firestore.
     * @returns Observable of users array.
     */
    getUsers(): Observable<User[]> {
        const usersCol = collection(this.firestore, 'users');
        return collectionData(usersCol, { idField: 'uid' }) as Observable<User[]>;
    }

    /**
     * Checks if a user is an internal staff user (ADMIN, MANAGER, STAFF, TRAINER).
     */
    isStaffUser(user: User): boolean {
        if (!user) return false;
        return !!(user.roles && user.roles.some(role => STAFF_ROLES.includes(role)));
    }

    /**
     * Checks if a user is a member portal user.
     */
    isMemberPortalUser(user: User): boolean {
        if (!user) return false;
        return user.roles?.includes('MEMBER') || !!(user as any).memberId;
    }

    /**
     * Fetches only internal staff users (ADMIN, MANAGER, STAFF, TRAINER).
     */
    getStaffUsers(): Observable<User[]> {
        return this.getUsers().pipe(
            map(users => (users || []).filter(user => this.isStaffUser(user)))
        );
    }

    /**
     * Fetches only member portal users.
     */
    getMemberPortalUsers(): Observable<User[]> {
        return this.getUsers().pipe(
            map(users => (users || []).filter(user => this.isMemberPortalUser(user)))
        );
    }

    /**
     * Updates a staff account by calling the Cloud Function.
     * @param uid The user ID to update.
     * @param data The partial data to update (password, displayName, roles, profileData).
     * @returns Observable of the function execution result.
     */
    updateUser(uid: string, data: Partial<CreateUserDto>): Observable<any> {
        const callable = httpsCallable(this.functions, 'updateStaffAccount');
        return from(callable({ uid, ...data }));
    }

    /**
     * Toggles the active status of a staff account.
     * @param uid The user ID.
     * @param isActive The new active status (true = active, false = disabled).
     * @returns Observable of the function execution result.
     */
    toggleUserStatus(uid: string, isActive: boolean): Observable<any> {
        const callable = httpsCallable(this.functions, 'toggleStaffStatus');
        return from(callable({ uid, isActive }));
    }
}
