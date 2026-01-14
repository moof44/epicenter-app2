import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SettingsService } from '../../../../core/services/settings.service';
import { fadeIn } from '../../../../core/animations/animations';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
    selector: 'app-general-settings',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatSnackBarModule
    ],
    templateUrl: './general-settings.html',
    styleUrl: './general-settings.css',
    animations: [fadeIn]
})
export class GeneralSettingsComponent implements OnInit {
    private fb = inject(FormBuilder);
    private settingsService = inject(SettingsService);
    private snackBar = inject(MatSnackBar);
    private functions = inject(Functions);
    authService = inject(AuthService); // Public for template

    settingsForm: FormGroup = this.fb.group({
        monthlyQuota: [0, [Validators.required, Validators.min(0)]]
    });

    isSaving = false;
    isLoggingOut = false;

    async ngOnInit() {
        try {
            const settings = await this.settingsService.getSettingsOnce();
            this.settingsForm.patchValue(settings);
        } catch (error) {
            console.error('Error loading settings:', error);
            this.snackBar.open('Error loading settings', 'Close', { duration: 3000 });
        }
    }

    async saveSettings() {
        if (this.settingsForm.invalid) return;

        this.isSaving = true;
        try {
            await this.settingsService.saveSettings(this.settingsForm.value);
            this.snackBar.open('Settings saved successfully', 'Close', { duration: 3000 });
        } catch (error) {
            console.error('Error saving settings:', error);
            this.snackBar.open('Error saving settings', 'Close', { duration: 3000 });
        } finally {
            this.isSaving = false;
        }
    }

    async forceLogoutAll() {
        if (!confirm('ARE YOU SURE? This will immediately log out ALL users from ALL devices.')) {
            return;
        }

        this.isLoggingOut = true;
        const emergencyLogoutAll = httpsCallable(this.functions, 'emergencyLogoutAll');

        try {
            const result: any = await emergencyLogoutAll();
            this.snackBar.open(`Success: Force logged out ${result.data.userCount} users.`, 'Close', { duration: 5000 });
        } catch (error: any) {
            console.error('Force logout failed:', error);
            this.snackBar.open(`Failed: ${error.message}`, 'Close', { duration: 5000 });
        } finally {
            this.isLoggingOut = false;
        }
    }
}
