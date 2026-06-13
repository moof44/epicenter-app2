import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { Auth } from '@angular/fire/auth';

const mockAuthStatus = { currentUser: null as any };

vi.mock('@angular/fire/auth', () => ({
    Auth: class {},
    user: vi.fn(() => of(mockAuthStatus.currentUser))
}));

describe('authGuard', () => {
    let routerMock: any;
    let authServiceMock: any;

    beforeEach(() => {
        routerMock = {
            createUrlTree: vi.fn().mockReturnValue({} as UrlTree)
        };

        authServiceMock = {
            user$: of(null)
        };
        
        mockAuthStatus.currentUser = null;

        TestBed.configureTestingModule({
            providers: [
                { provide: Auth, useValue: {} },
                { provide: Router, useValue: routerMock },
                { provide: AuthService, useValue: authServiceMock }
            ]
        });
    });

    it('should allow access if user is logged in and active', async () => {
        mockAuthStatus.currentUser = { uid: '123' };
        authServiceMock.user$ = of({ uid: '123', isActive: true });
        
        const result = await (TestBed.runInInjectionContext(() => 
            authGuard({} as any, {} as any)
        ) as any).toPromise();

        expect(result).toBe(true);
    });

    it('should allow access if user is logged in and isActive is undefined (legacy user)', async () => {
        mockAuthStatus.currentUser = { uid: '123' };
        authServiceMock.user$ = of({ uid: '123' }); // isActive is undefined
        
        const result = await (TestBed.runInInjectionContext(() => 
            authGuard({} as any, {} as any)
        ) as any).toPromise();

        expect(result).toBe(true);
    });

    it('should redirect to login if user is logged in but inactive', async () => {
        mockAuthStatus.currentUser = { uid: '123' };
        authServiceMock.user$ = of({ uid: '123', isActive: false });
        const loginUrlTree = {} as UrlTree;
        routerMock.createUrlTree.mockReturnValue(loginUrlTree);
        
        const result = await (TestBed.runInInjectionContext(() => 
            authGuard({} as any, {} as any)
        ) as any).toPromise();

        expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login']);
        expect(result).toBe(loginUrlTree);
    });

    it('should redirect to login if user is not logged in', async () => {
        mockAuthStatus.currentUser = null;
        authServiceMock.user$ = of(null);
        const loginUrlTree = {} as UrlTree;
        routerMock.createUrlTree.mockReturnValue(loginUrlTree);
        
        const result = await (TestBed.runInInjectionContext(() => 
            authGuard({} as any, {} as any)
        ) as any).toPromise();

        expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login']);
        expect(result).toBe(loginUrlTree);
    });
});
