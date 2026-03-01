import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ProgressService } from '../../../../core/services/progress.service';
import { Measurement } from '../../../../core/models/measurement.model';

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
    MatDatepickerModule, MatNativeDateModule
  ],
  templateUrl: './progress-form.html',
  styleUrl: './progress-form.css',
  animations: [fadeIn]
})
export class ProgressForm implements OnInit {
  private fb = inject(FormBuilder);
  private progressService = inject(ProgressService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  form: FormGroup;
  loading = false;
  memberId: string | null = null;

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
  }

  async onSubmit() {
    if (this.form.invalid || !this.memberId) return;

    this.loading = true;
    const data: Measurement = {
      ...this.form.value,
      // date is already in form.value 
    };

    try {
      await this.progressService.addEntry(this.memberId, data);
      this.router.navigate(['/members', this.memberId, 'progress']);
    } catch (error) {
      console.error(error);
      this.loading = false;
    }
  }
}
