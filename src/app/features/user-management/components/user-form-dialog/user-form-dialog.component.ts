
import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { UserService } from '../../../../core/services/user.service';
import { CreateUserDto, User } from '../../../../core/models/user.model';
import { PreventDoubleClickDirective } from '../../../../shared/directives/prevent-double-click.directive';

@Component({
    selector: 'app-user-form-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatInputModule,
        MatFormFieldModule,
        MatSelectModule,
        MatSelectModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
        PreventDoubleClickDirective
    ],
    templateUrl: './user-form-dialog.component.html',
    styleUrls: ['./user-form-dialog.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserFormDialogComponent implements OnInit {
    private fb = inject(FormBuilder);
    private userService = inject(UserService);
    private dialogRef = inject(MatDialogRef<UserFormDialogComponent>);
    private snackBar = inject(MatSnackBar);
    private data = inject(MAT_DIALOG_DATA, { optional: true });

    isSubmitting = signal(false);
    isEditMode = signal(false);

    rolesList = ['ADMIN', 'MANAGER', 'STAFF', 'TRAINER'];

    userForm: FormGroup = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        password: [''],
        displayName: ['', [Validators.required]],
        roles: [[], [Validators.required]],
        phone: ['', [Validators.required]]
    });

    ngOnInit() {
        if (this.data && this.data.user) {
            this.isEditMode.set(true);
            const user = this.data.user as User;
            this.userForm.patchValue({
                email: user.email,
                displayName: user.displayName,
                roles: user.roles,
                phone: user.phone
            });

            // Disable email in edit mode (usually email is immutable for Auth ID)
            this.userForm.get('email')?.disable();

            // Password optional in edit mode
            this.userForm.get('password')?.setValidators([Validators.minLength(6)]);
            this.userForm.get('password')?.updateValueAndValidity();
        } else {
            // Create Mode validations
            this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
            this.userForm.get('password')?.updateValueAndValidity();
        }
    }

    onSubmit() {
        if (this.userForm.invalid) {
            return;
        }

        this.isSubmitting.set(true);
        this.userForm.disable();

        if (this.isEditMode()) {
            const user = this.data.user;
            const updateData: Partial<CreateUserDto> = {
                displayName: this.userForm.value.displayName,
                roles: this.userForm.value.roles,
                profileData: {
                    phone: this.userForm.value.phone
                }
            };

            // Only include password if user typed something new
            if (this.userForm.value.password) {
                updateData.password = this.userForm.value.password;
            }

            this.userService.updateUser(user.uid, updateData).subscribe({
                next: () => {
                    this.snackBar.open('User updated successfully!', 'Close', {
                        duration: 3000,
                        panelClass: ['success-snackbar']
                    });
                    this.isSubmitting.set(false);
                    this.dialogRef.close(true);
                },
                error: (err) => {
                    console.error('Error updating user', err);
                    this.snackBar.open('Failed to update user. Please try again.', 'Close', {
                        duration: 5000,
                        panelClass: ['error-snackbar']
                    });
                    this.isSubmitting.set(false);
                    this.userForm.enable();
                }
            });
            return;
        }

        const formValue = this.userForm.value;
        const createUserDto: CreateUserDto = {
            email: formValue.email,
            password: formValue.password,
            displayName: formValue.displayName,
            roles: formValue.roles,
            profileData: {
                phone: formValue.phone
            }
        };

        this.userService.createUser(createUserDto).subscribe({
            next: () => {
                this.snackBar.open('User created successfully!', 'Close', {
                    duration: 3000,
                    panelClass: ['success-snackbar']
                });
                this.isSubmitting.set(false);
                this.dialogRef.close(true);
            },
            error: (err) => {
                console.error('Error creating user', err);
                const errorMessage = err.message || 'Failed to create user. Please try again.';
                this.snackBar.open(errorMessage, 'Close', {
                    duration: 5000,
                    panelClass: ['error-snackbar']
                });
                this.isSubmitting.set(false);
                this.userForm.enable();
            }
        });
    }

    onCancel() {
        this.dialogRef.close();
    }
}
