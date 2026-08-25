import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { UserService } from '../../../../core/services/user.service';
import { UserFormDialogComponent } from '../user-form-dialog/user-form-dialog.component';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { User } from '../../../../core/models/user.model';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

@Component({
    selector: 'app-user-list',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatTableModule,
        MatButtonModule,
        MatIconModule,
        MatDialogModule,
        MatChipsModule,
        MatMenuModule,
        MatSnackBarModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule
    ],
    templateUrl: './user-list.component.html',
    styleUrls: ['./user-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserListComponent {
    private userService = inject(UserService);
    private dialog = inject(MatDialog);
    private snackBar = inject(MatSnackBar);

    searchQuery$ = new BehaviorSubject<string>('');
    statusFilter$ = new BehaviorSubject<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');

    users$ = this.userService.getStaffUsers();

    filteredUsers$ = combineLatest([
        this.users$,
        this.searchQuery$,
        this.statusFilter$
    ]).pipe(
        map(([users, search, status]) => {
            let list = users || [];

            // Status Filter
            if (status === 'ACTIVE') {
                list = list.filter(u => u.isActive !== false);
            } else if (status === 'INACTIVE') {
                list = list.filter(u => u.isActive === false);
            }

            // Search Filter
            if (search && search.trim()) {
                const query = search.toLowerCase().trim();
                list = list.filter(u =>
                    (u.displayName && u.displayName.toLowerCase().includes(query)) ||
                    (u.email && u.email.toLowerCase().includes(query)) ||
                    (u.phone && u.phone.toLowerCase().includes(query))
                );
            }

            return list;
        })
    );

    displayedColumns: string[] = ['photo', 'displayName', 'roles', 'dailySalaryRate', 'status', 'actions'];

    getRoleColor(role: string): CreateRoleColor {
        switch (role) {
            case 'ADMIN': return 'warn';
            case 'MANAGER': return 'accent';
            case 'TRAINER': return 'primary';
            default: return undefined;
        }
    }

    isRoleAdmin(role: string): boolean {
        return role === 'ADMIN';
    }

    openAddUserDialog() {
        this.dialog.open(UserFormDialogComponent, {
            width: '500px',
            maxHeight: '90vh',
            disableClose: true
        });
    }

    editUser(user: User) {
        this.dialog.open(UserFormDialogComponent, {
            width: '500px',
            maxHeight: '90vh',
            disableClose: true,
            data: { user }
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
}

type CreateRoleColor = 'primary' | 'accent' | 'warn' | undefined;
