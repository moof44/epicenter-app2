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
  standalone: true,
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
    
    this.badgeService.getBadges().pipe(take(1)).subscribe(badges => {
      this.availableBadges = badges.filter(b => b.type === 'ADMINISTRATIVE' || b.type === 'ACHIEVEMENT');
    });
  }

  async loadMember(id: string) {
    this.loading = true;
    try {
      const member = await this.memberService.getMemberOnce(id);
      if (member) {
        this.member = member;
        this.form.patchValue(member);
      }
    } catch (err) {
      console.error('Failed to load member:', err);
    } finally {
      this.loading = false;
    }
  }

  async createPortalAccount() {
    if (!this.memberId) return;
    this.portalLoading = true;
    try {
      const createMemberPortalAccount = httpsCallable(this.functions, 'createMemberPortalAccount');
      await createMemberPortalAccount({ memberId: this.memberId });
      await this.loadMember(this.memberId);
      alert('Portal account created successfully!');
    } catch (err: any) {
      console.error(err);
      alert('Failed to create portal account: ' + (err.message || err));
    } finally {
      this.portalLoading = false;
    }
  }

  async resetPortalPassword() {
    if (!this.memberId) return;
    if (!confirm('Are you sure you want to reset this member\'s portal PIN back to their birthday?')) return;
    this.portalLoading = true;
    try {
      const resetMemberPortalPassword = httpsCallable(this.functions, 'resetMemberPortalPassword');
      await resetMemberPortalPassword({ memberId: this.memberId });
      alert('Temporary PIN reset successfully to birthday (MMDDYYYY)!');
    } catch (err: any) {
      console.error(err);
      alert('Failed to reset PIN: ' + (err.message || err));
    } finally {
      this.portalLoading = false;
    }
  }

  async togglePortalStatus() {
    if (!this.memberId || !this.member) return;
    const currentStatus = this.member.portalStatus || 'Active';
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    const actionName = newStatus === 'Active' ? 'activate' : 'deactivate';

    if (!confirm(`Are you sure you want to ${actionName} portal access for this member?`)) return;
    
    this.portalLoading = true;
    try {
      const setMemberPortalStatus = httpsCallable(this.functions, 'setMemberPortalStatus');
      await setMemberPortalStatus({ memberId: this.memberId, status: newStatus });
      await this.loadMember(this.memberId);
      alert(`Portal access successfully ${newStatus.toLowerCase()}d!`);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to ${actionName} portal access: ` + (err.message || err));
    } finally {
      this.portalLoading = false;
    }
  }

  showQRCode() {
    if (!this.member) return;
    this.dialog.open(QRDialog, {
      data: {
        member: this.member,
        value: this.member.id
      }
    });
  }

  async onSubmit() {
    if (this.form.invalid) return;

    this.loading = true;
    const val = this.form.value;

    try {
      if (this.isEditMode && this.memberId) {
        await this.memberService.updateMember(this.memberId, val);
      } else {
        await this.memberService.addMember(val);
      }
      this.router.navigate(['/members']);
    } catch (err) {
      console.error('Failed to save member:', err);
    } finally {
      this.loading = false;
    }
  }

  cancel() {
    this.location.back();
  }
}
