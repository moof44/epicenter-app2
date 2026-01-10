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
    path: 'inventory-history',
    loadComponent: () => import('./components/inventory-history/inventory-history').then(m => m.InventoryHistoryComponent),
    canActivate: [roleGuard],
    data: { animation: 'HistoryPage', roles: ['ADMIN', 'MANAGER'] }
  },
  {
    path: 'monthly-sales',
    loadComponent: () => import('./components/monthly-sales-report/monthly-sales-report').then(m => m.MonthlySalesReport),
    canActivate: [roleGuard],
    data: { animation: 'ReportsPage', roles: ['ADMIN'] }
  }
];
