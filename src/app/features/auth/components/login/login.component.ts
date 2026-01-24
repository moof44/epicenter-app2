import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatInputModule,
        MatButtonModule,
        MatFormFieldModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
        MatIconModule,
        MatCheckboxModule
    ],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private router = inject(Router);
    private snackBar = inject(MatSnackBar);

    isLoading = signal(false);
    hidePassword = signal(true);

    loginForm: FormGroup = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required]],
        rememberMe: [false]
    });

    togglePasswordVisibility(event: MouseEvent) {
        event.stopPropagation();
        this.hidePassword.update(value => !value);
    }

    onSubmit() {
        if (this.loginForm.invalid) {
            return;
        }

        this.isLoading.set(true);
        const { email, password, rememberMe } = this.loginForm.value;

        this.authService.login(email, password, rememberMe).subscribe({
            next: () => {
                this.isLoading.set(false);
                this.router.navigate(['/']); // Navigate to dashboard/home
            },
            error: (err: any) => {
                console.error('Login error', err);
                let message = 'Login failed. Please try again.';
                if (err.code === 'auth/invalid-credential') { // Modern firebase error
                    message = 'Invalid email or password.';
                } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                    message = 'Invalid email or password.';
                }

                this.snackBar.open(message, 'Close', {
                    duration: 5000,
                    panelClass: ['error-snackbar']
                });
                this.isLoading.set(false);
            }
        });
    }
}
