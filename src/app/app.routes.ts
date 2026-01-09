import { Routes } from '@angular/router';
import { MemberList } from './features/members/components/member-list/member-list';
import { MemberForm } from './features/members/components/member-form/member-form';
import { ProgressDashboard } from './features/progress/components/progress-dashboard/progress-dashboard';
import { ProgressForm } from './features/progress/components/progress-form/progress-form';

import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
    { path: '', redirectTo: '/members', pathMatch: 'full' },
    {
        path: 'login',
        loadComponent: () => import('./features/auth/components/login/login.component').then(m => m.LoginComponent),
        data: { animation: 'LoginPage' }
    },
    {
        path: 'members',
        component: MemberList,
        canActivate: [authGuard],
        data: { animation: 'ListPage' }
    },
    {
        path: 'members/add',
        component: MemberForm,
        canActivate: [authGuard],
        data: { animation: 'FormPage' }
    },
    {
        path: 'members/edit/:id',
        component: MemberForm,
        canActivate: [authGuard],
        data: { animation: 'FormPage' }
    },
    {
        path: 'members/:id/progress',
        component: ProgressDashboard,
        canActivate: [authGuard],
        data: { animation: 'DashboardPage' }
    },
    {
        path: 'members/:id/progress/new',
        component: ProgressForm,
        canActivate: [authGuard],
        data: { animation: 'FormPage' }
    },
    {
        path: 'attendance',
        loadComponent: () => import('./features/attendance/components/attendance-layout/attendance-layout').then(m => m.AttendanceLayout),
        canActivate: [authGuard],
        data: { animation: 'ListPage' }
    },
    {
        path: 'store',
        loadChildren: () => import('./features/store/store.routes').then(m => m.storeRoutes),
        canActivate: [authGuard],
        data: { animation: 'StorePage' }
    },
    {
        path: 'users',
        loadComponent: () => import('./features/user-management/components/user-list/user-list.component').then(m => m.UserListComponent),
        canActivate: [authGuard, adminGuard],
        data: { animation: 'ListPage' }
    },
];
