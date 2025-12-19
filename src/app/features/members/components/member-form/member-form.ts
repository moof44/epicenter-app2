import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MemberService } from '../../../../core/services/member.service';
import { Member } from '../../../../core/models/member.model';

import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { fadeIn } from '../../../../core/animations/animations';

@Component({
  selector: 'app-member-form',
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink, MatInputModule,
    MatSelectModule, MatButtonModule, MatCardModule, MatProgressSpinnerModule
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

  form: FormGroup;
  isEditMode = false;
  memberId: string | null = null;
  loading = false;

  constructor() {
    this.form = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      status: ['active'],
      goal: ['']
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
      this.form.patchValue(member);
      this.loading = false;
    });
  }

  async onSubmit() {
    if (this.form.invalid) return;

    this.loading = true;
    const data = this.form.value;

    try {
      if (this.isEditMode && this.memberId) {
        await this.memberService.updateMember(this.memberId, data);
      } else {
        await this.memberService.addMember({
          ...data,
          dateJoined: new Date()
        } as Member);
      }
      this.router.navigate(['/members']);
    } catch (error) {
      console.error(error);
      this.loading = false;
    }
  }
}
