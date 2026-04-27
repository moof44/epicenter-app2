import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ProgressService } from '../../../../core/services/progress.service';
import { Measurement } from '../../../../core/models/measurement.model';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { fadeIn } from '../../../../core/animations/animations';

@Component({
  selector: 'app-progress-form',
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink, MatInputModule,
    MatButtonModule, MatCardModule, MatProgressSpinnerModule,
    MatDatepickerModule, MatNativeDateModule, MatSnackBarModule
  ],
  templateUrl: './progress-form.html',
  styleUrl: './progress-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeIn]
})
export class ProgressForm implements OnInit {
  private fb = inject(FormBuilder);
  private progressService = inject(ProgressService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  form: FormGroup;
  loading = false;
  memberId: string | null = null;
  entryId: string | null = null;
  isEditMode = false;
  formTitle = 'New Measurement Entry';

  constructor() {
    this.form = this.fb.group({
      date: [new Date(), [Validators.required]],
      height: ['', [Validators.required, Validators.min(0)]],
      weight: ['', [Validators.required, Validators.min(0)]],
      bodyFat: ['', [Validators.required, Validators.min(0), Validators.max(100)]],
      subcutaneousFat: ['', [Validators.required, Validators.min(0), Validators.max(100)]],
      visceralFat: ['', [Validators.required, Validators.min(0)]],
      muscleMass: ['', [Validators.required, Validators.min(0), Validators.max(100)]],
      bmi: ['', [Validators.required, Validators.min(0)]],
      metabolism: ['', [Validators.required, Validators.min(0)]],
      bodyAge: ['', [Validators.required, Validators.min(0)]],
      sinistralFatFull: ['', [Validators.required, Validators.min(0), Validators.max(100)]],
      muscleFull: ['', [Validators.required, Validators.min(0), Validators.max(100)]],
      subcutaneousFatArms: ['', [Validators.required, Validators.min(0), Validators.max(100)]],
      muscleArms: ['', [Validators.required, Validators.min(0), Validators.max(100)]],
      subcutaneousFatTrunk: ['', [Validators.required, Validators.min(0), Validators.max(100)]],
      muscleTrunk: ['', [Validators.required, Validators.min(0), Validators.max(100)]],
      subcutaneousFatLegs: ['', [Validators.required, Validators.min(0), Validators.max(100)]],
      muscleLegs: ['', [Validators.required, Validators.min(0), Validators.max(100)]]
    });
  }

  ngOnInit() {
    this.memberId = this.route.snapshot.paramMap.get('id');
    this.entryId = this.route.snapshot.paramMap.get('entryId');

    if (this.entryId) {
      this.isEditMode = true;
      this.formTitle = 'Edit Measurement Entry';
      this.loadEntry();
    }
  }

  private async loadEntry(): Promise<void> {
    if (!this.memberId || !this.entryId) return;

    try {
      this.loading = true;
      const measurements = await firstValueFrom(this.progressService.getTimeSeries(this.memberId));
      const entry = measurements?.find(m => m.id === this.entryId);

      if (entry) {
        // Convert Firestore timestamp to Date if needed
        const date = entry.date instanceof Date ? entry.date : new Date(entry.date);
        this.form.patchValue({
          date,
          height: entry.height,
          weight: entry.weight,
          bodyFat: entry.bodyFat,
          subcutaneousFat: entry.subcutaneousFat,
          visceralFat: entry.visceralFat,
          muscleMass: entry.muscleMass,
          bmi: entry.bmi,
          metabolism: entry.metabolism,
          bodyAge: entry.bodyAge,
          sinistralFatFull: entry.sinistralFatFull,
          muscleFull: entry.muscleFull,
          subcutaneousFatArms: entry.subcutaneousFatArms,
          muscleArms: entry.muscleArms,
          subcutaneousFatTrunk: entry.subcutaneousFatTrunk,
          muscleTrunk: entry.muscleTrunk,
          subcutaneousFatLegs: entry.subcutaneousFatLegs,
          muscleLegs: entry.muscleLegs
        });
      } else {
        this.snackBar.open('Entry not found', 'Close', { duration: 3000 });
        this.router.navigate(['/members', this.memberId, 'progress']);
      }
    } catch {
      this.snackBar.open('Failed to load entry', 'Close', { duration: 3000 });
      this.router.navigate(['/members', this.memberId, 'progress']);
    } finally {
      this.loading = false;
    }
  }

  async onSubmit() {
    if (this.form.invalid || !this.memberId) return;

    this.loading = true;
    const data: Measurement = {
      ...this.form.value
    };

    try {
      if (this.isEditMode && this.entryId) {
        // Update existing entry
        await this.progressService.updateEntry(this.memberId, this.entryId, data);
        this.snackBar.open('Entry updated', 'Close', { duration: 2000 });
      } else {
        // Create new entry
        await this.progressService.addEntry(this.memberId, data);
        this.snackBar.open('Entry saved', 'Close', { duration: 2000 });
      }
      this.router.navigate(['/members', this.memberId, 'progress']);
    } catch {
      this.snackBar.open('Save failed', 'Close', { duration: 3000 });
      this.loading = false;
    }
  }
}
