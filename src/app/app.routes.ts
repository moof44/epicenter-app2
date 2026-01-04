import { Routes } from '@angular/router';
import { MemberList } from './features/members/components/member-list/member-list';
import { MemberForm } from './features/members/components/member-form/member-form';
import { ProgressDashboard } from './features/progress/components/progress-dashboard/progress-dashboard';
import { ProgressForm } from './features/progress/components/progress-form/progress-form';

export const routes: Routes = [
    { path: '', redirectTo: '/members', pathMatch: 'full' },
    { path: 'members', component: MemberList, data: { animation: 'ListPage' } },
    { path: 'members/add', component: MemberForm, data: { animation: 'FormPage' } },
    { path: 'members/edit/:id', component: MemberForm, data: { animation: 'FormPage' } },
    { path: 'members/:id/progress', component: ProgressDashboard, data: { animation: 'DashboardPage' } },
    { path: 'members/:id/progress/new', component: ProgressForm, data: { animation: 'FormPage' } },
    { 
        path: 'attendance', 
        loadComponent: () => import('./features/attendance/components/attendance-layout/attendance-layout').then(m => m.AttendanceLayout),
        data: { animation: 'ListPage' }
    },
    {
        path: 'store',
        loadChildren: () => import('./features/store/store.routes').then(m => m.storeRoutes),
        data: { animation: 'StorePage' }
    },
];
