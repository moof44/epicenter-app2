import { Component, inject, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
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
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { fadeIn } from '../../../../core/animations/animations';

@Component({
  selector: 'app-progress-form',
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink, MatInputModule,
    MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule,
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
  private cdr = inject(ChangeDetectorRef);

  form: FormGroup;
  loading = false;
  uploadingImage = false;
  memberId: string | null = null;
  entryId: string | null = null;
  isEditMode = false;
  formTitle = 'New Measurement Entry';

  // Image Upload state
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  existingImageUrl: string | null = null;
  existingStoragePath: string | null = null;

  constructor() {
    this.form = this.fb.group({
      date: [new Date(), [Validators.required]],
      height: ['', [Validators.min(0)]],
      weight: ['', [Validators.min(0)]],
      bodyFat: ['', [Validators.min(0), Validators.max(100)]],
      subcutaneousFat: ['', [Validators.min(0), Validators.max(100)]],
      visceralFat: ['', [Validators.min(0)]],
      muscleMass: ['', [Validators.min(0), Validators.max(100)]],
      bmi: ['', [Validators.min(0)]],
      metabolism: ['', [Validators.min(0)]],
      bodyAge: ['', [Validators.min(0)]],
      sinistralFatFull: ['', [Validators.min(0), Validators.max(100)]],
      muscleFull: ['', [Validators.min(0), Validators.max(100)]],
      subcutaneousFatArms: ['', [Validators.min(0), Validators.max(100)]],
      muscleArms: ['', [Validators.min(0), Validators.max(100)]],
      subcutaneousFatTrunk: ['', [Validators.min(0), Validators.max(100)]],
      muscleTrunk: ['', [Validators.min(0), Validators.max(100)]],
      subcutaneousFatLegs: ['', [Validators.min(0), Validators.max(100)]],
      muscleLegs: ['', [Validators.min(0), Validators.max(100)]]
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

  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        this.snackBar.open('Please select a valid image file (JPG, PNG, WebP).', 'Close', { duration: 3000 });
        return;
      }
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
        this.cdr.markForCheck();
      };
      reader.readAsDataURL(file);
    }
  }

  removeSelectedImage() {
    this.selectedFile = null;
    this.imagePreview = null;
    this.existingImageUrl = null;
    this.cdr.markForCheck();
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
        this.existingImageUrl = entry.reportImageUrl || null;
        this.existingStoragePath = entry.storagePath || null;

        this.form.patchValue({
          date,
          height: entry.height ?? '',
          weight: entry.weight ?? '',
          bodyFat: entry.bodyFat ?? '',
          subcutaneousFat: entry.subcutaneousFat ?? '',
          visceralFat: entry.visceralFat ?? '',
          muscleMass: entry.muscleMass ?? '',
          bmi: entry.bmi ?? '',
          metabolism: entry.metabolism ?? '',
          bodyAge: entry.bodyAge ?? '',
          sinistralFatFull: entry.sinistralFatFull ?? '',
          muscleFull: entry.muscleFull ?? '',
          subcutaneousFatArms: entry.subcutaneousFatArms ?? '',
          muscleArms: entry.muscleArms ?? '',
          subcutaneousFatTrunk: entry.subcutaneousFatTrunk ?? '',
          muscleTrunk: entry.muscleTrunk ?? '',
          subcutaneousFatLegs: entry.subcutaneousFatLegs ?? '',
          muscleLegs: entry.muscleLegs ?? ''
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
      this.cdr.markForCheck();
    }
  }

  async onSubmit() {
    if (this.form.invalid || !this.memberId) return;

    this.loading = true;
    this.cdr.markForCheck();

    try {
      let reportImageUrl = this.existingImageUrl;
      let storagePath = this.existingStoragePath;

      // If a new image file was selected, upload it to Storage
      if (this.selectedFile) {
        this.uploadingImage = true;
        this.cdr.markForCheck();
        const uploadRes = await this.progressService.uploadReportImage(this.memberId, this.selectedFile);
        reportImageUrl = uploadRes.downloadUrl;
        storagePath = uploadRes.storagePath;
        this.uploadingImage = false;
      }

      // Build data payload omitting empty strings
      const raw = this.form.value;
      const data: Partial<Measurement> = {
        date: raw.date
      };

      if (reportImageUrl) data.reportImageUrl = reportImageUrl;
      if (storagePath) data.storagePath = storagePath;

      const numericKeys: (keyof Measurement)[] = [
        'height', 'weight', 'bodyFat', 'subcutaneousFat', 'visceralFat',
        'muscleMass', 'bmi', 'metabolism', 'bodyAge', 'sinistralFatFull',
        'muscleFull', 'subcutaneousFatArms', 'muscleArms', 'subcutaneousFatTrunk',
        'muscleTrunk', 'subcutaneousFatLegs', 'muscleLegs'
      ];

      for (const k of numericKeys) {
        const val = raw[k];
        if (val !== '' && val !== null && val !== undefined) {
          (data as any)[k] = Number(val);
        }
      }

      if (this.isEditMode && this.entryId) {
        await this.progressService.updateEntry(this.memberId, this.entryId, data);
        this.snackBar.open('Measurement entry updated!', 'Close', { duration: 2500 });
      } else {
        await this.progressService.addEntry(this.memberId, data as Measurement);
        this.snackBar.open('Measurement entry saved!', 'Close', { duration: 2500 });
      }

      this.router.navigate(['/members', this.memberId, 'progress']);
    } catch (err: any) {
      console.error('Error saving measurement:', err);
      this.snackBar.open('Failed to save entry: ' + (err.message || 'Error'), 'Close', { duration: 3500 });
    } finally {
      this.loading = false;
      this.uploadingImage = false;
      this.cdr.markForCheck();
    }
  }
}
