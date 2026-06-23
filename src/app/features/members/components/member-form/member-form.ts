import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MemberService } from '../../../../core/services/member.service';
import { Member } from '../../../../core/models/member.model';
import { BadgeService } from '../../../../core/services/badge.service';
import { BadgeDefinition } from '../../../../core/models/badge.model';
import { take } from 'rxjs/operators';

import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { QRDialog } from '../../../../shared/components/qr-dialog/qr-dialog.component';
import { fadeIn } from '../../../../core/animations/animations';

@Component({
  selector: 'app-member-form',
  imports: [
    CommonModule, ReactiveFormsModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatCardModule, MatProgressSpinnerModule,
    MatDatepickerModule, MatNativeDateModule, MatIconModule, MatDialogModule
  ],
  templateUrl: './member-form.html',
  styleUrl: './member-form.css',
  animations: [fadeIn]
})
export class MemberForm implements OnInit {
  private fb = inject(FormBuilder);
  private memberService = inject(MemberService);
  private badgeService = inject(BadgeService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private dialog = inject(MatDialog);
  private functions = inject(Functions);

  form: FormGroup;
  isEditMode = false;
  memberId: string | null = null;
  loading = false;
  member: Member | null = null;
  portalLoading = false;
  availableBadges: BadgeDefinition[] = [];

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
      membershipStatus: ['Active', [Validators.required]],
      tags: [[]]
    });
  }

  ngOnInit() {
    this.memberId = this.route.snapshot.paramMap.get('id');
    if (this.memberId) {
      this.isEditMode = true;
      this.loadMember(this.memberId);
    }
    
    // Load administrative and achievement badges for tagging
    this.badgeService.getBadges().pipe(take(1)).subscribe(badges => {
      this.availableBadges = badges.filter(b => b.type === 'ADMINISTRATIVE' || b.type === 'ACHIEVEMENT');
    });
  }

  async loadMember(id: string) {
    this.loading = true;
    this.memberService.getMember(id).pipe(take(1)).subscribe(member => {
      if (member) {
        this.member = member;
        this.form.patchValue(member);
      }
      this.loading = false;
    });
  }

  async createPortalAccount() {
    if (!this.memberId) return;
    this.portalLoading = true;
    try {
      const createFn = httpsCallable(this.functions, 'createMemberPortalAccount');
      const result: any = await createFn({ memberId: this.memberId });
      if (result.data?.success) {
        this.loadMember(this.memberId);
      }
    } catch (error: any) {
      console.error('Failed to create portal account:', error);
      alert(error.message || 'Error creating portal account.');
    } finally {
      this.portalLoading = false;
    }
  }

  async showQR() {
    if (!this.memberId) return;
    this.portalLoading = true;
    try {
      const tokenFn = httpsCallable(this.functions, 'generatePortalLoginToken');
      const result: any = await tokenFn({ memberId: this.memberId });
      if (result.data?.success && result.data?.token) {
        const token = result.data.token;
        const loginUrl = `http://localhost:4201/login?token=${token}`;
        
        this.dialog.open(QRDialog, {
          data: {
            loginUrl,
            memberName: this.member?.name || 'Gym Member'
          },
          width: '340px'
        });
      }
    } catch (error: any) {
      console.error('Failed to generate portal login token:', error);
      alert(error.message || 'Error generating login code.');
    } finally {
      this.portalLoading = false;
    }
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
