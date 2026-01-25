import { Routes } from '@angular/router';
import { MemberList } from './features/members/components/member-list/member-list';
import { MemberForm } from './features/members/components/member-form/member-form';
import { ProgressDashboard } from './features/progress/components/progress-dashboard/progress-dashboard';
import { ProgressForm } from './features/progress/components/progress-form/progress-form';

import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { roleGuard } from './core/guards/role.guard';

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
        canActivate: [authGuard, roleGuard],
        data: { animation: 'ListPage', roles: ['ADMIN', 'MANAGER', 'STAFF', 'TRAINER'] }
    },
    {
        path: 'members/add',
        component: MemberForm,
        canActivate: [authGuard, roleGuard],
        data: { animation: 'FormPage', roles: ['ADMIN', 'MANAGER', 'STAFF'] }
    },
    {
        path: 'members/edit/:id',
        component: MemberForm,
        canActivate: [authGuard, roleGuard],
        data: { animation: 'FormPage', roles: ['ADMIN', 'MANAGER', 'STAFF'] }
    },
    {
        path: 'members/:id/progress',
        component: ProgressDashboard,
        canActivate: [authGuard, roleGuard],
        data: { animation: 'DashboardPage', roles: ['ADMIN', 'MANAGER', 'STAFF', 'TRAINER'] }
    },
    {
        path: 'members/:id/progress/new',
        component: ProgressForm,
        canActivate: [authGuard, roleGuard],
        data: { animation: 'FormPage', roles: ['ADMIN', 'MANAGER', 'STAFF', 'TRAINER'] }
    },
    {
        path: 'attendance',
        loadComponent: () => import('./features/attendance/components/attendance-layout/attendance-layout').then(m => m.AttendanceLayout),
        canActivate: [authGuard, roleGuard],
        data: { animation: 'ListPage', roles: ['ADMIN', 'MANAGER', 'STAFF', 'TRAINER'] }
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
        canActivate: [authGuard, roleGuard],
        data: { animation: 'ListPage', roles: ['ADMIN'] }
    },
    {
        path: 'reports',
        loadComponent: () => import('./features/reports/pages/reports-dashboard/reports-dashboard').then(m => m.ReportsDashboardComponent),
        canActivate: [authGuard, roleGuard],
        data: { animation: 'DashboardPage', roles: ['ADMIN', 'MANAGER'] }
    },
    {
        path: 'settings',
        loadComponent: () => import('./features/settings/components/general-settings/general-settings').then(m => m.GeneralSettingsComponent),
        canActivate: [authGuard, roleGuard],
        data: { animation: 'FormPage', roles: ['ADMIN'] }
    },
];
