import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const customerCareRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/campaign-hub/campaign-hub.component').then((m) => m.CampaignHubComponent),
    canActivate: [roleGuard],
    data: { roles: ['ADMIN', 'MANAGER', 'CUSTOMER_CARE'] }
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./pages/campaign-creator/campaign-creator.component').then((m) => m.CampaignCreatorComponent),
    canActivate: [roleGuard],
    data: { roles: ['ADMIN', 'MANAGER'] }
  },
  {
    path: 'campaigns/:id',
    loadComponent: () =>
      import('./pages/calling-workspace/calling-workspace.component').then((m) => m.CallingWorkspaceComponent),
    canActivate: [roleGuard],
    data: { roles: ['ADMIN', 'MANAGER', 'CUSTOMER_CARE'] }
  },
  {
    path: 'campaigns/:id/report',
    loadComponent: () =>
      import('./pages/campaign-report/campaign-report.component').then((m) => m.CampaignReportComponent),
    canActivate: [roleGuard],
    data: { roles: ['ADMIN', 'MANAGER', 'CUSTOMER_CARE'] }
  }
];
