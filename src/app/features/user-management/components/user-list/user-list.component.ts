import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UserService } from '../../../../core/services/user.service';
import { UserFormDialogComponent } from '../user-form-dialog/user-form-dialog.component';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { User } from '../../../../core/models/user.model';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../../../../core/services/auth.service';
import { fadeIn } from '../../../../core/animations/animations';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatChipsModule,
    MatTooltipModule,
    MatMenuModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.css',
  animations: [fadeIn],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserListComponent {
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  searchQuery$ = new BehaviorSubject<string>('');
  statusFilter$ = new BehaviorSubject<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');
  roleFilter$ = new BehaviorSubject<string>('ALL');

  users$ = this.userService.getStaffUsers();

  totalCount$ = this.users$.pipe(map(list => list ? list.length : 0));
  activeCount$ = this.users$.pipe(map(list => list ? list.filter(u => u.isActive !== false).length : 0));
  trainersCount$ = this.users$.pipe(map(list => list ? list.filter(u => u.roles?.includes('TRAINER')).length : 0));
  staffCount$ = this.users$.pipe(map(list => list ? list.filter(u => u.roles?.includes('STAFF')).length : 0));
  adminsCount$ = this.users$.pipe(map(list => list ? list.filter(u => u.roles?.includes('ADMIN') || u.roles?.includes('MANAGER')).length : 0));

  filteredUsers$ = combineLatest([
    this.users$,
    this.searchQuery$,
    this.statusFilter$,
    this.roleFilter$
  ]).pipe(
    map(([users, search, status, role]) => {
      let list = users || [];

      // Status Filter
      if (status === 'ACTIVE') {
        list = list.filter(u => u.isActive !== false);
      } else if (status === 'INACTIVE') {
        list = list.filter(u => u.isActive === false);
      }

      // Role Filter
      if (role !== 'ALL') {
        list = list.filter(u => u.roles?.includes(role));
      }

      // Search Query Filter
      if (search && search.trim()) {
        const query = search.toLowerCase().trim();
        list = list.filter(u =>
          u.displayName?.toLowerCase().includes(query) ||
          u.email?.toLowerCase().includes(query) ||
          u.phone?.includes(query)
        );
      }

      return list;
    })
  );

  displayedColumns: string[] = [
    'photo',
    'displayName',
    'roles',
    'dailySalaryRate',
    'status',
    'actions'
  ];

  get isAdmin(): boolean {
    return this.authService.hasAnyRole(['ADMIN']);
  }

  get isManager(): boolean {
    return this.authService.hasAnyRole(['MANAGER']);
  }

  canEditUser(targetUser: User): boolean {
    if (!targetUser) return false;
    if (this.isAdmin) return true;
    if (this.isManager) {
      return !targetUser.roles?.includes('ADMIN');
    }
    return false;
  }

  canToggleStatus(targetUser: User): boolean {
    if (!targetUser) return false;
    if (this.isAdmin) return true;
    if (this.isManager) {
      return !targetUser.roles?.includes('ADMIN');
    }
    return false;
  }

  viewUserProfile(user: User) {
    this.router.navigate(['/users', user.uid, 'profile']);
  }

  openAddUserDialog() {
    this.dialog.open(UserFormDialogComponent, {
      width: '560px',
      maxHeight: '90vh',
      disableClose: true,
      panelClass: 'dark-pro-dialog'
    });
  }

  editUser(user: User) {
    this.dialog.open(UserFormDialogComponent, {
      width: '560px',
      maxHeight: '90vh',
      disableClose: true,
      data: { user },
      panelClass: 'dark-pro-dialog'
    });
  }

  toggleUserStatus(user: User) {
    const newStatus = !user.isActive;
    const action = newStatus ? 'activate' : 'deactivate';

    if (confirm(`Are you sure you want to ${action} ${user.displayName}?`)) {
      this.userService.toggleUserStatus(user.uid, newStatus).subscribe({
        next: () => {
          const message = `User ${action}d successfully`;
          this.snackBar.open(message, 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
        },
        error: (err) => {
          console.error(`Error ${action}ing user:`, err);
          this.snackBar.open(`Failed to ${action} user. Please try again.`, 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  setStatusFilter(status: 'ALL' | 'ACTIVE' | 'INACTIVE') {
    this.statusFilter$.next(status);
  }

  setRoleFilter(role: string) {
    this.roleFilter$.next(role);
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
