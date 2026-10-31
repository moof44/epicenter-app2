import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { CustomerCareService } from '../../../../core/services/customer-care.service';
import { AuthService } from '../../../../core/services/auth.service';
import {
  CallCampaignItem,
  CallStatus,
  PriorityLevel
} from '../../../../core/models/customer-care.model';

import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-calling-workspace',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './calling-workspace.component.html',
  styleUrl: './calling-workspace.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CallingWorkspaceComponent {
  private route = inject(ActivatedRoute);
  private customerCareService = inject(CustomerCareService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  campaignId = this.route.snapshot.paramMap.get('id') || '';

  // Live Campaign stream
  campaign$ = this.customerCareService.getCampaignLive(this.campaignId);
  campaign = toSignal(this.campaign$);

  // Live Items stream
  items$ = this.customerCareService.getCampaignItemsLive(this.campaignId);
  items = toSignal(this.items$, { initialValue: [] as CallCampaignItem[] });

  // Workspace state
  activeTab = signal<'TO_CONTACT' | 'FOLLOW_UP' | 'COMPLETED' | 'ALL'>('TO_CONTACT');
  selectedItemId = signal<string | null>(null);
  isLogging = signal<boolean>(false);
  isEditingBriefing = signal<boolean>(false);

  // Outcome Form
  outcomeForm: FormGroup = this.fb.group({
    channel: ['CALL', Validators.required],
    status: ['ANSWERED_AGREED', Validators.required],
    story: ['', [Validators.required, Validators.minLength(4)]]
  });

  // Briefing Edit Form (Admin/Manager only)
  briefingForm: FormGroup = this.fb.group({
    managerRemarks: [''],
    smsTemplateTaglish: [''],
    callScriptTaglish: ['']
  });

  filteredItems = computed(() => {
    const list = this.items();
    const tab = this.activeTab();

    if (tab === 'TO_CONTACT') {
      return list.filter((i) => !i.isContacted);
    }
    if (tab === 'FOLLOW_UP') {
      return list.filter(
        (i) =>
          i.isContacted &&
          (i.callStatus === 'NO_ANSWER' ||
            i.callStatus === 'CANNOT_BE_REACHED' ||
            i.callStatus === 'CALLBACK_REQUESTED')
      );
    }
    if (tab === 'COMPLETED') {
      return list.filter(
        (i) =>
          i.isContacted &&
          i.callStatus !== 'NO_ANSWER' &&
          i.callStatus !== 'CANNOT_BE_REACHED' &&
          i.callStatus !== 'CALLBACK_REQUESTED'
      );
    }
    return list;
  });

  activeItem = computed(() => {
    const id = this.selectedItemId();
    const list = this.items();
    if (id) {
      return list.find((i) => i.id === id) || list[0] || null;
    }
    // Default to first uncontacted item
    const uncontacted = list.find((i) => !i.isContacted);
    return uncontacted || list[0] || null;
  });

  get isManagerOrAdmin(): boolean {
    return this.authService.hasAnyRole(['ADMIN', 'MANAGER']);
  }

  get currentUserDisplayName(): string {
    return this.authService.userProfile()?.displayName || 'Staff';
  }

  selectItem(item: CallCampaignItem) {
    this.selectedItemId.set(item.id);
  }

  getInterpolatedSms(item: CallCampaignItem): string {
    const camp = this.campaign();
    if (!camp || !item) return '';
    return this.customerCareService.interpolateScript(
      camp.smsTemplateTaglish,
      item.memberSnapshot,
      this.currentUserDisplayName
    );
  }

  getInterpolatedCallScript(item: CallCampaignItem): string {
    const camp = this.campaign();
    if (!camp || !item) return '';
    return this.customerCareService.interpolateScript(
      camp.callScriptTaglish,
      item.memberSnapshot,
      this.currentUserDisplayName
    );
  }

  openSmsNative(item: CallCampaignItem) {
    const phone = item.memberSnapshot?.contactNumber;
    if (!phone) {
      this.snackBar.open('No contact number for this member.', 'Dismiss', { duration: 3000 });
      return;
    }
    const body = encodeURIComponent(this.getInterpolatedSms(item));
    // Set form to SMS & TEXT_SENT
    this.outcomeForm.patchValue({
      channel: 'SMS',
      status: 'TEXT_SENT',
      story: 'Sent SMS reminder using Taglish template.'
    });
    window.open(`sms:${phone}?body=${body}`, '_self');
  }

  openCallNative(item: CallCampaignItem) {
    const phone = item.memberSnapshot?.contactNumber;
    if (!phone) {
      this.snackBar.open('No contact number for this member.', 'Dismiss', { duration: 3000 });
      return;
    }
    this.outcomeForm.patchValue({
      channel: 'CALL'
    });
    window.open(`tel:${phone}`, '_self');
  }

  copyToClipboard(text: string, label: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    this.snackBar.open(`${label} copied to clipboard!`, 'OK', { duration: 2500 });
  }

  setQuickStatus(status: CallStatus) {
    this.outcomeForm.patchValue({ status });
  }

  async saveOutcome(nextMember = true) {
    const item = this.activeItem();
    if (!item) return;

    if (this.outcomeForm.invalid) {
      this.snackBar.open('Please write a brief story or remarks before saving.', 'Dismiss', { duration: 3000 });
      return;
    }

    this.isLogging.set(true);
    try {
      const user = this.authService.userProfile();
      const formVal = this.outcomeForm.value;

      await this.customerCareService.logCallOutcome(item.id, this.campaignId, {
        channel: formVal.channel,
        status: formVal.status,
        story: formVal.story,
        staffUid: user?.uid || 'staff',
        staffName: user?.displayName || 'Care Staff'
      });

      this.snackBar.open(`Logged outcome for ${item.memberSnapshot.name}`, 'OK', { duration: 2500 });

      // Reset story
      this.outcomeForm.patchValue({ story: '' });

      if (nextMember) {
        // Find next uncontacted item
        const uncontacted = this.items().find((i) => !i.isContacted && i.id !== item.id);
        if (uncontacted) {
          this.selectedItemId.set(uncontacted.id);
        }
      }
    } catch (err: any) {
      this.snackBar.open('Failed to save outcome: ' + err.message, 'Close', { duration: 5000 });
    } finally {
      this.isLogging.set(false);
    }
  }

  async togglePriority(item: CallCampaignItem, newPriority: PriorityLevel) {
    if (!this.isManagerOrAdmin) return;
    try {
      await this.customerCareService.updateItemPriority(item.id, this.campaignId, newPriority);
      this.snackBar.open('Priority updated.', 'OK', { duration: 2000 });
    } catch (err: any) {
      this.snackBar.open('Error updating priority: ' + err.message, 'Close', { duration: 3000 });
    }
  }

  openEditBriefing() {
    const camp = this.campaign();
    if (!camp) return;
    this.briefingForm.patchValue({
      managerRemarks: camp.managerRemarks || '',
      smsTemplateTaglish: camp.smsTemplateTaglish || '',
      callScriptTaglish: camp.callScriptTaglish || ''
    });
    this.isEditingBriefing.set(true);
  }

  async saveBriefing() {
    try {
      const val = this.briefingForm.value;
      await this.customerCareService.updateCampaignBriefingAndScripts(this.campaignId, val);
      this.snackBar.open('Briefing and scripts updated live!', 'OK', { duration: 3000 });
      this.isEditingBriefing.set(false);
    } catch (err: any) {
      this.snackBar.open('Failed to update: ' + err.message, 'Close', { duration: 3000 });
    }
  }

  mathAbs(val: number | null | undefined): number {
    return val != null ? Math.abs(val) : 0;
  }
}
