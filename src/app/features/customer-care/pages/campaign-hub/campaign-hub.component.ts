import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CustomerCareService } from '../../../../core/services/customer-care.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CallCampaign } from '../../../../core/models/customer-care.model';
import { map } from 'rxjs';

@Component({
  selector: 'app-campaign-hub',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatTooltipModule
  ],
  templateUrl: './campaign-hub.component.html',
  styleUrl: './campaign-hub.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CampaignHubComponent {
  private customerCareService = inject(CustomerCareService);
  readonly authService = inject(AuthService);

  activeTab = signal<'ACTIVE' | 'ARCHIVED'>('ACTIVE');

  campaigns$ = this.customerCareService.getCampaignsLive();

  activeCampaigns$ = this.campaigns$.pipe(
    map((list) => list.filter((c) => c.status !== 'ARCHIVED'))
  );

  archivedCampaigns$ = this.campaigns$.pipe(
    map((list) => list.filter((c) => c.status === 'ARCHIVED'))
  );

  // High-level KPI aggregations
  totalCampaigns$ = this.campaigns$.pipe(map((list) => list.length));
  
  totalPending$ = this.activeCampaigns$.pipe(
    map((list) => list.reduce((sum, c) => sum + (c.stats?.pendingCount || 0), 0))
  );

  totalCompleted$ = this.campaigns$.pipe(
    map((list) => list.reduce((sum, c) => sum + (c.stats?.completedCount || 0), 0))
  );

  highPriorityPending$ = this.activeCampaigns$.pipe(
    map((list) => list.reduce((sum, c) => sum + (c.stats?.highPriorityCount || 0), 0))
  );

  get isManagerOrAdmin(): boolean {
    return this.authService.hasAnyRole(['ADMIN', 'MANAGER']);
  }

  getProgressPercentage(campaign: CallCampaign): number {
    const total = campaign.stats?.totalMembers || 0;
    if (total === 0) return 0;
    const completed = campaign.stats?.completedCount || 0;
    return Math.min(100, Math.round((completed / total) * 100));
  }
}
