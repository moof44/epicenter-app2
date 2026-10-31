import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { CustomerCareService } from '../../../../core/services/customer-care.service';
import { AuthService } from '../../../../core/services/auth.service';
import {
  CAMPAIGN_GOAL_PRESETS,
  CampaignObjectiveType,
  MemberCallSnapshot,
  PriorityLevel,
  CampaignFilterCriteria
} from '../../../../core/models/customer-care.model';

interface MemberPreviewRow {
  snapshot: MemberCallSnapshot;
  selected: boolean;
  priority: PriorityLevel;
  priorityNote: string;
}

@Component({
  selector: 'app-campaign-creator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './campaign-creator.component.html',
  styleUrl: './campaign-creator.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CampaignCreatorComponent implements OnInit {
  private fb = inject(FormBuilder);
  private customerCareService = inject(CustomerCareService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  currentStep = signal<1 | 2 | 3>(1); // 1: Objective & Scripts, 2: Multi-Filters, 3: Member Preview & Priority
  isScanning = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  readonly presets = CAMPAIGN_GOAL_PRESETS;
  readonly presetKeys: CampaignObjectiveType[] = [
    'EXPIRING_SOON',
    'RECENTLY_EXPIRED',
    'LOW_ATTENDANCE',
    'LONG_EXPIRED',
    'PT_ACTIVE_NUTRITION',
    'PT_EXPIRING_OR_EXPIRED',
    'PROMOTION',
    'FEEDBACK',
    'CONCERNS',
    'FOLLOW_UP_ATTEMPT'
  ];

  selectedObjective = signal<CampaignObjectiveType>('EXPIRING_SOON');

  campaignForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(4)]],
    objectiveType: ['EXPIRING_SOON', Validators.required],
    objectiveDescription: [''],
    managerRemarks: [''],
    smsTemplateTaglish: ['', Validators.required],
    callScriptTaglish: ['', Validators.required]
  });

  filterForm: FormGroup = this.fb.group({
    membershipStatus: ['Active'],
    expiringWithinDays: [7],
    expiredDaysMin: [null],
    expiredDaysMax: [null],
    trainingStatus: ['ANY'],
    trainingExpiringWithinDays: [7],
    checkInsLast30DaysMax: [null],
    goalKeyword: [''],
    gender: ['ALL'],
    excludeDoNotContact: [true]
  });

  previewRows = signal<MemberPreviewRow[]>([]);

  ngOnInit() {
    this.applyPreset(this.selectedObjective());
  }

  applyPreset(type: CampaignObjectiveType) {
    this.selectedObjective.set(type);
    const config = this.presets[type];
    if (!config) return;

    this.campaignForm.patchValue({
      title: config.title,
      objectiveType: type,
      objectiveDescription: config.description,
      managerRemarks: config.defaultManagerRemarks,
      smsTemplateTaglish: config.smsTemplateTaglish,
      callScriptTaglish: config.callScriptTaglish
    });

    // Patch default filters for this preset
    if (config.defaultFilters) {
      const f = config.defaultFilters;
      this.filterForm.patchValue({
        membershipStatus: f.membershipStatuses ? f.membershipStatuses[0] : 'ANY',
        expiringWithinDays: f.expiringWithinDays ?? null,
        expiredDaysMin: f.expiredDaysMin ?? null,
        expiredDaysMax: f.expiredDaysMax ?? null,
        trainingStatus: f.trainingStatus ?? 'ANY',
        trainingExpiringWithinDays: f.trainingExpiringWithinDays ?? 7,
        checkInsLast30DaysMax: f.checkInsLast30DaysMax ?? null,
        excludeDoNotContact: f.excludeDoNotContact ?? true
      });
    }
  }

  goToStep2() {
    if (this.campaignForm.invalid) {
      this.snackBar.open('Please fill in Campaign Title and Scripts.', 'Dismiss', { duration: 3000 });
      return;
    }
    this.currentStep.set(2);
  }

  async goToStep3Preview() {
    this.isScanning.set(true);
    try {
      const fVal = this.filterForm.value;
      const criteria: CampaignFilterCriteria = {
        membershipStatuses: fVal.membershipStatus === 'ANY' ? [] : [fVal.membershipStatus],
        expiringWithinDays: fVal.expiringWithinDays != null ? Number(fVal.expiringWithinDays) : null,
        expiredDaysMin: fVal.expiredDaysMin != null ? Number(fVal.expiredDaysMin) : null,
        expiredDaysMax: fVal.expiredDaysMax != null ? Number(fVal.expiredDaysMax) : null,
        trainingStatus: fVal.trainingStatus,
        trainingExpiringWithinDays: fVal.trainingExpiringWithinDays != null ? Number(fVal.trainingExpiringWithinDays) : null,
        checkInsLast30DaysMax: fVal.checkInsLast30DaysMax != null ? Number(fVal.checkInsLast30DaysMax) : null,
        goalKeyword: fVal.goalKeyword,
        gender: fVal.gender,
        excludeDoNotContact: fVal.excludeDoNotContact
      };

      const matchedSnapshots = await this.customerCareService.filterMembersLocally(criteria);

      const rows: MemberPreviewRow[] = matchedSnapshots.map((m) => ({
        snapshot: m,
        selected: true,
        priority: 2, // Default NORMAL
        priorityNote: ''
      }));

      this.previewRows.set(rows);
      this.currentStep.set(3);
    } catch (err: any) {
      this.snackBar.open('Error scanning members: ' + err.message, 'Close', { duration: 4000 });
    } finally {
      this.isScanning.set(false);
    }
  }

  toggleSelectAll(checked: boolean) {
    this.previewRows.update((rows) => rows.map((r) => ({ ...r, selected: checked })));
  }

  toggleMemberSelection(index: number) {
    this.previewRows.update((rows) => {
      const updated = [...rows];
      updated[index].selected = !updated[index].selected;
      return updated;
    });
  }

  setPriority(index: number, priority: PriorityLevel) {
    this.previewRows.update((rows) => {
      const updated = [...rows];
      updated[index].priority = priority;
      return updated;
    });
  }

  getSelectedCount(): number {
    return this.previewRows().filter((r) => r.selected).length;
  }

  getHighPriorityCount(): number {
    return this.previewRows().filter((r) => r.selected && r.priority === 1).length;
  }

  mathAbs(num: number): number {
    return Math.abs(num);
  }

  async generateCampaign() {
    const selected = this.previewRows().filter((r) => r.selected);
    if (selected.length === 0) {
      this.snackBar.open('Please select at least 1 member for this campaign.', 'Dismiss', { duration: 3000 });
      return;
    }

    this.isSubmitting.set(true);
    try {
      const user = this.authService.userProfile();
      const cVal = this.campaignForm.value;

      const itemsToCreate = selected.map((r) => ({
        snapshot: r.snapshot,
        priority: r.priority,
        priorityNote: r.priorityNote
      }));

      const campaignId = await this.customerCareService.createCampaignWithItems(
        {
          title: cVal.title,
          objectiveType: cVal.objectiveType,
          objectiveDescription: cVal.objectiveDescription || '',
          managerRemarks: cVal.managerRemarks || '',
          smsTemplateTaglish: cVal.smsTemplateTaglish,
          callScriptTaglish: cVal.callScriptTaglish,
          attemptNumber: 1,
          status: 'ACTIVE',
          filtersUsed: this.filterForm.value,
          createdByUid: user?.uid || 'admin',
          createdByName: user?.displayName || 'Admin / Management',
          createdByRole: user?.roles?.[0] || 'ADMIN'
        },
        itemsToCreate
      );

      this.snackBar.open('Campaign generated successfully with ' + selected.length + ' members!', 'OK', {
        duration: 4000
      });

      this.router.navigate(['/customer-care/campaigns', campaignId]);
    } catch (err: any) {
      this.snackBar.open('Failed to generate campaign: ' + err.message, 'Close', { duration: 5000 });
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
