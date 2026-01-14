import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MemberService } from '../../../../core/services/member.service';
import { Member } from '../../../../core/models/member.model';

import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { fadeIn } from '../../../../core/animations/animations';

@Component({
  selector: 'app-member-form',
  imports: [
    CommonModule, ReactiveFormsModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatCardModule, MatProgressSpinnerModule,
    MatDatepickerModule, MatNativeDateModule
  ],
  templateUrl: './member-form.html',
  styleUrl: './member-form.css',
  animations: [fadeIn]
})
export class MemberForm implements OnInit {
  private fb = inject(FormBuilder);
  private memberService = inject(MemberService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);

  form: FormGroup;
  isEditMode = false;
  memberId: string | null = null;
  loading = false;

  constructor() {
    this.form = this.fb.group({
      name: ['', [Validators.required]],
      address: ['', [Validators.required]],
      contactNumber: ['', [Validators.required]],
      gender: ['Male', [Validators.required]],
      birthday: [null, [Validators.required]],
      membershipExpiration: [null],
      trainingExpiration: [null],
      goal: [''],
      remarks: [''],
      membershipStatus: ['Active', [Validators.required]]
    });
  }

  ngOnInit() {
    this.memberId = this.route.snapshot.paramMap.get('id');
    if (this.memberId) {
      this.isEditMode = true;
      this.loadMember(this.memberId);
    }
  }

  async loadMember(id: string) {
    this.loading = true;
    this.memberService.getMember(id).subscribe(member => {
      // Convert timestamps to Date objects if needed for form
      const data = { ...member };
      if (data.birthday && data.birthday.seconds) {
        data.birthday = new Date(data.birthday.seconds * 1000);
      }
      if (data.membershipExpiration && data.membershipExpiration.seconds) {
        data.membershipExpiration = new Date(data.membershipExpiration.seconds * 1000);
      }
      if (data.trainingExpiration && data.trainingExpiration.seconds) {
        data.trainingExpiration = new Date(data.trainingExpiration.seconds * 1000);
      }
      this.form.patchValue(data);
      this.loading = false;
    });
  }

  cancel() {
    this.location.back();
  }

  async onSubmit() {
    if (this.form.invalid) return;

    this.loading = true;
    const data = this.form.value;

    try {
      if (this.isEditMode && this.memberId) {
        await this.memberService.updateMember(this.memberId, data);
      } else {
        await this.memberService.addMember(data as Member);
      }

      const returnUrl = this.route.snapshot.queryParams['returnUrl'];
      if (returnUrl) {
        this.router.navigate([returnUrl]);
      } else {
        this.router.navigate(['/members']);
      }
    } catch (error) {
      console.error(error);
      this.loading = false;
    }
  }
}
