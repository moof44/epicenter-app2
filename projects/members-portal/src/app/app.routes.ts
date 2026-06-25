import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { LoginComponent } from './features/auth/login.component';
import { AppLayoutComponent } from './core/layout/app-layout.component';
import { DashboardHomeComponent } from './features/dashboard-home.component';
import { ProgressComponent } from './features/progress.component';
import { AttendanceComponent } from './features/attendance.component';
import { ProfileComponent } from './features/profile.component';
import { WorkoutNotebookComponent } from './features/workout-notebook.component';
import { GymScheduleComponent } from './features/gym-schedule.component';
import { authGuard } from './core/guards/auth.guard';
import { redirectIfLoggedInGuard } from './core/guards/redirect-if-logged-in.guard';

export const routes: Routes = [
    { path: '', component: HomeComponent, canActivate: [redirectIfLoggedInGuard] },
    { path: 'login', component: LoginComponent, canActivate: [redirectIfLoggedInGuard] },
    {
        path: 'dashboard',
        component: AppLayoutComponent,
        canActivate: [authGuard],
        children: [
            { path: 'home', component: DashboardHomeComponent },
            { path: 'progress', component: ProgressComponent },
            { path: 'attendance', component: AttendanceComponent },
            { path: 'profile', component: ProfileComponent },
            { path: 'workout', component: WorkoutNotebookComponent },
            { path: 'schedule', component: GymScheduleComponent },
            { path: '', redirectTo: 'home', pathMatch: 'full' }
        ]
    },
    { path: '**', redirectTo: '' }
];
