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
  }
];
