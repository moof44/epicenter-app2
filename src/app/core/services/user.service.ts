import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { from, Observable } from 'rxjs';
import { CreateUserDto } from '../models/user.model';

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private functions = inject(Functions);

    /**
     * Creates a new staff account by calling the Cloud Function.
     * @param data CreateUserDto object containing email, password, profile, and roles.
     * @returns Observable of the function execution result.
     */
    createUser(data: CreateUserDto): Observable<any> {
        const callable = httpsCallable(this.functions, 'createStaffAccount');
        return from(callable(data));
    }
}
