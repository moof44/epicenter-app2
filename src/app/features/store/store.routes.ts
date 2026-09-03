import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const storeRoutes: Routes = [
  {
    path: '',
    redirectTo: 'pos',
    pathMatch: 'full'
  },
  {
    path: 'pos',
    loadComponent: () => import('./components/pos/pos').then(m => m.POS),
    canActivate: [roleGuard],
    data: { animation: 'POSPage', roles: ['ADMIN', 'MANAGER', 'STAFF'] }
  },
  {
    path: 'manage',
    loadComponent: () => import('./components/product-management/product-management').then(m => m.ProductManagement),
    canActivate: [roleGuard],
    data: { animation: 'ManagePage', roles: ['ADMIN', 'MANAGER'] }
  },
  {
    path: 'history',
    loadComponent: () => import('./components/transaction-history/transaction-history').then(m => m.TransactionHistory),
    canActivate: [roleGuard],
    data: { animation: 'HistoryPage', roles: ['ADMIN', 'MANAGER', 'STAFF'] }
  },
  {
    path: 'stats',
    loadComponent: () => import('./components/sales-analytics/sales-analytics').then(m => m.SalesAnalytics),
    canActivate: [roleGuard],
    data: { animation: 'StatsPage', roles: ['ADMIN'] }
  },
  {
    path: 'cash',
    loadComponent: () => import('./components/cash-management/cash-management').then(m => m.CashManagement),
    canActivate: [roleGuard],
    data: { animation: 'CashPage', roles: ['ADMIN', 'MANAGER', 'STAFF'] }
  },
  {
    path: 'payables',
    loadComponent: () => import('./components/bills-payables/bills-payables.component').then(m => m.BillsPayablesComponent),
    canActivate: [roleGuard],
    data: { animation: 'PayablesPage', roles: ['ADMIN', 'MANAGER'] }
  },
  {
    path: 'commissions',
    loadComponent: () => import('./components/commission-center/commission-center').then(m => m.CommissionCenter),
    canActivate: [roleGuard],
    data: { animation: 'CommissionsPage', roles: ['ADMIN', 'MANAGER', 'STAFF', 'TRAINER'] }
  },
  {
    path: 'financial-health',
    loadComponent: () => import('./components/financial-health/financial-health.component').then(m => m.FinancialHealthComponent),
    canActivate: [roleGuard],
    data: { animation: 'HealthPage', roles: ['ADMIN', 'MANAGER'] }
  },
  {
    path: 'reports',
    loadComponent: () => import('./components/shift-history/shift-history').then(m => m.ShiftHistory),
    canActivate: [roleGuard],
    data: { animation: 'ReportsPage', roles: ['ADMIN'] }
  },
  {
    path: 'stock-take',
    loadComponent: () => import('./components/stock-take/stock-take.component').then(m => m.StockTakeComponent),
    canActivate: [roleGuard],
    data: { animation: 'StockTakePage', roles: ['ADMIN', 'MANAGER'] }
  },
  {
    path: 'restock',
    loadComponent: () => import('./components/purchase-entry/purchase-entry.component').then(m => m.PurchaseEntryComponent),
    canActivate: [roleGuard],
    data: { animation: 'RestockPage', roles: ['ADMIN', 'MANAGER'] }
  },
  {
    path: 'purchases',
    loadComponent: () => import('./components/purchase-history/purchase-history.component').then(m => m.PurchaseHistoryComponent),
    canActivate: [roleGuard],
    data: { animation: 'PurchaseHistoryPage', roles: ['ADMIN', 'MANAGER'] }
  },
  {
    path: 'purchase-requests',
    loadComponent: () => import('./components/purchase-requests/purchase-request-list.component').then(m => m.PurchaseRequestListComponent),
    canActivate: [roleGuard],
    data: { animation: 'PurchaseRequestsPage', roles: ['ADMIN', 'MANAGER', 'STAFF', 'TRAINER'] }
  },
  {
    path: 'inventory-history',
    loadComponent: () => import('./components/inventory-history/inventory-history').then(m => m.InventoryHistoryComponent),
    canActivate: [roleGuard],
    data: { animation: 'HistoryPage', roles: ['ADMIN', 'MANAGER'] }
  },
  {
    path: 'sales-by-user',
    loadComponent: () => import('./components/sales-by-user/sales-by-user').then(m => m.SalesByUserComponent),
    canActivate: [roleGuard],
    data: { animation: 'ReportsPage', roles: ['ADMIN'] }
  },
  {
    path: 'monthly-sales',
    loadComponent: () => import('./components/monthly-sales-report/monthly-sales-report').then(m => m.MonthlySalesReport),
    canActivate: [roleGuard],
    data: { animation: 'ReportsPage', roles: ['ADMIN'] }
  }
];
