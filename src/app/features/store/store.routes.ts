import { Routes } from '@angular/router';

export const storeRoutes: Routes = [
  {
    path: '',
    redirectTo: 'pos',
    pathMatch: 'full'
  },
  {
    path: 'pos',
    loadComponent: () => import('./components/pos/pos').then(m => m.POS),
    data: { animation: 'POSPage' }
  },
  {
    path: 'manage',
    loadComponent: () => import('./components/product-management/product-management').then(m => m.ProductManagement),
    data: { animation: 'ManagePage' }
  },
  {
    path: 'history',
    loadComponent: () => import('./components/transaction-history/transaction-history').then(m => m.TransactionHistory),
    data: { animation: 'HistoryPage' }
  },
  {
    path: 'stats',
    loadComponent: () => import('./components/sales-analytics/sales-analytics').then(m => m.SalesAnalytics),
    data: { animation: 'StatsPage' }
  },
  {
    path: 'cash',
    loadComponent: () => import('./components/cash-management/cash-management').then(m => m.CashManagement),
    data: { animation: 'CashPage' }
  },
  {
    path: 'reports',
    loadComponent: () => import('./components/shift-history/shift-history').then(m => m.ShiftHistory),
    data: { animation: 'ReportsPage' }
  }
];
