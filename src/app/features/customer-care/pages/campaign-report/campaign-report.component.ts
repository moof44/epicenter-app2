import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { CustomerCareService } from '../../../../core/services/customer-care.service';
import { AuthService } from '../../../../core/services/auth.service';
import {
  CallCampaignItem,
  CallStatus
} from '../../../../core/models/customer-care.model';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-campaign-report',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './campaign-report.component.html',
  styleUrl: './campaign-report.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CampaignReportComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private customerCareService = inject(CustomerCareService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  campaignId = this.route.snapshot.paramMap.get('id') || '';

  campaign$ = this.customerCareService.getCampaignLive(this.campaignId);
  campaign = toSignal(this.campaign$);

  items$ = this.customerCareService.getCampaignItemsLive(this.campaignId);
  items = toSignal(this.items$, { initialValue: [] as CallCampaignItem[] });

  isCreatingFollowUp = signal<boolean>(false);

  // Conversion / Outcome Aggregations
  totalMembers = computed(() => this.campaign()?.stats?.totalMembers || 0);
  completedCount = computed(() => this.campaign()?.stats?.completedCount || 0);
  pendingCount = computed(() => this.campaign()?.stats?.pendingCount || 0);

  completionRate = computed(() => {
    const total = this.totalMembers();
    if (total === 0) return 0;
    return Math.min(100, Math.round((this.completedCount() / total) * 100));
  });

  statusBreakdown = computed(() => {
    return (
      this.campaign()?.stats?.statusBreakdown ||
      ({} as Record<CallStatus, number>)
    );
  });

  positiveResponses = computed(() => {
    const b = this.statusBreakdown();
    return (b.ANSWERED_AGREED || 0) + (b.ANSWERED_INTERESTED || 0) + (b.ANSWERED_FEEDBACK_GIVEN || 0);
  });

  unreachedResponses = computed(() => {
    const b = this.statusBreakdown();
    return (b.NO_ANSWER || 0) + (b.CANNOT_BE_REACHED || 0) + (b.CALLBACK_REQUESTED || 0);
  });

  negativeResponses = computed(() => {
    const b = this.statusBreakdown();
    return (b.REJECTED || 0) + (b.DO_NOT_CONTACT || 0);
  });

  // Staff Productivity Leaderboard
  staffLeaderboard = computed(() => {
    const counts: Record<string, { name: string; calls: number; agreements: number }> = {};
    for (const item of this.items()) {
      if (item.isContacted && item.calledByName) {
        if (!counts[item.calledByName]) {
          counts[item.calledByName] = { name: item.calledByName, calls: 0, agreements: 0 };
        }
        counts[item.calledByName].calls++;
        if (item.callStatus === 'ANSWERED_AGREED') {
          counts[item.calledByName].agreements++;
        }
      }
    }
    return Object.values(counts).sort((a, b) => b.calls - a.calls);
  });

  get isManagerOrAdmin(): boolean {
    return this.authService.hasAnyRole(['ADMIN', 'MANAGER']);
  }

  /**
   * 1-Click "Create Attempt #2 List" for all unreached members (Req 7, 8, 9).
   */
  async createAttempt2() {
    const camp = this.campaign();
    if (!camp) return;

    // Filter unreached members
    const unreachedItems = this.items().filter(
      (i) =>
        i.callStatus === 'NO_ANSWER' ||
        i.callStatus === 'CANNOT_BE_REACHED' ||
        i.callStatus === 'CALLBACK_REQUESTED' ||
        !i.isContacted
    );

    if (unreachedItems.length === 0) {
      this.snackBar.open('No unreachable or pending members found to re-target.', 'OK', { duration: 3000 });
      return;
    }

    this.isCreatingFollowUp.set(true);
    try {
      const user = this.authService.userProfile();
      const nextAttempt = (camp.attemptNumber || 1) + 1;

      const newCampaignId = await this.customerCareService.createCampaignWithItems(
        {
          title: `Attempt #${nextAttempt} - ${camp.title}`,
          objectiveType: 'FOLLOW_UP_ATTEMPT',
          objectiveDescription: `Follow-up outreach for members unreachable in ${camp.title}.`,
          managerRemarks: `Attempt #${nextAttempt}. Review Attempt 1 story before calling.`,
          smsTemplateTaglish: camp.smsTemplateTaglish,
          callScriptTaglish: camp.callScriptTaglish,
          attemptNumber: nextAttempt,
          parentCampaignId: camp.id,
          status: 'ACTIVE',
          createdByUid: user?.uid || 'admin',
          createdByName: user?.displayName || 'Admin',
          createdByRole: user?.roles?.[0] || 'ADMIN'
        },
        unreachedItems.map((i) => ({
          snapshot: i.memberSnapshot,
          priority: i.priority,
          priorityNote: `Attempt #${nextAttempt} Follow-Up`
        }))
      );

      this.snackBar.open(`Created Attempt #${nextAttempt} Campaign with ${unreachedItems.length} members!`, 'OK', {
        duration: 4000
      });

      this.router.navigate(['/customer-care/campaigns', newCampaignId]);
    } catch (err: any) {
      this.snackBar.open('Failed to create follow-up: ' + err.message, 'Close', { duration: 4000 });
    } finally {
      this.isCreatingFollowUp.set(false);
    }
  }
}
