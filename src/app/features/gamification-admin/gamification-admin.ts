import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Firestore, doc, getDoc, collection, query, orderBy, limit, getDocs } from '@angular/fire/firestore';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-gamification-admin',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatProgressBarModule
  ],
  template: `
    <div class="economy-container">
      <!-- Page Header -->
      <div class="page-header">
        <div class="page-title">
          <h1>Gamification Economy</h1>
          <p>Monitor the global token pool, monthly budgets, and safety fallback logs.</p>
        </div>
        <button mat-flat-button color="primary" class="refresh-btn" (click)="loadEconomyData()">
          <mat-icon>refresh</mat-icon> Refresh Data
        </button>
      </div>

      @if (isLoading()) {
        <div class="loading-container">
          <mat-spinner diameter="50"></mat-spinner>
        </div>
      } @else {
        <!-- Global Pool Metrics -->
        <div class="metrics-grid">
          
          <!-- Initial Budget Card -->
          <div class="metric-card">
            <div class="card-icon-wrapper icon-blue">
              <mat-icon>account_balance</mat-icon>
            </div>
            <div class="metric-info">
              <div class="metric-label">Initial Budget</div>
              <div class="metric-value">{{ poolInitialBudget() | number }}</div>
            </div>
          </div>

          <!-- Current Balance Card -->
          <div class="metric-card">
            @if (poolBalance() <= 0) {
              <span class="status-badge">DEPLETED</span>
            }
            <div class="card-icon-wrapper" [class.icon-green]="poolBalance() > 0" [class.class-red]="poolBalance() <= 0" [ngClass]="poolBalance() <= 0 ? 'icon-red' : 'icon-green'">
              <mat-icon>toll</mat-icon>
            </div>
            <div class="metric-info">
              <div class="metric-label">Current Balance</div>
              <div class="metric-value" [class.depleted]="poolBalance() <= 0">{{ poolBalance() | number }}</div>
            </div>
          </div>

          <!-- Consumption Card -->
          <div class="metric-card">
            <div class="card-icon-wrapper icon-purple">
              <mat-icon>pie_chart</mat-icon>
            </div>
            <div class="metric-info">
              <div class="metric-label">Pool Consumed</div>
              <div class="metric-value">{{ percentConsumed }}%</div>
              
              <div class="progress-section">
                <div class="progress-bar-container">
                  <div class="progress-bar-fill" 
                       [ngStyle]="{ 'width': percentConsumed + '%', 'background-color': percentConsumed >= 95 ? '#ef4444' : (percentConsumed >= 75 ? '#eab308' : '#22c55e') }">
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Error Logs Section Header -->
        <div class="section-header">
          <h2>
            <mat-icon>warning</mat-icon> Safety Error Logs
          </h2>
          <span class="section-badge">Recent 50 logs</span>
        </div>

        <!-- Logs Container -->
        <div class="logs-card">
          @if (errorLogs().length === 0) {
            <div class="empty-state">
              <mat-icon>check_circle</mat-icon>
              <p>No gamification errors found! The system is running smoothly.</p>
            </div>
          } @else {
            <div class="logs-table-wrapper">
              <table class="logs-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action Type</th>
                    <th>Member ID</th>
                    <th>Error Details</th>
                  </tr>
                </thead>
                <tbody>
                  @for (log of errorLogs(); track log.id) {
                    <tr>
                      <td class="timestamp-cell">
                        {{ log.timestamp?.toDate() | date:'short' }}
                      </td>
                      <td>
                        <span class="action-badge" 
                              [ngClass]="{
                                'award': log.action === 'AWARD_GAMIFICATION',
                                'purchase': log.action === 'PURCHASE_STORE_REWARD',
                                'audit': log.action === 'ECONOMY_AUDIT_DISCREPANCY' || log.action === 'ECONOMY_AUDIT_FAILURE',
                                'fallback': log.action === 'FALLBACK_REWARD_FAILED'
                              }">
                          {{ log.action }}
                        </span>
                      </td>
                      <td class="uid-cell">
                        {{ log.uid || 'SYSTEM' }}
                      </td>
                      <td class="details-cell">
                        <p class="error-message">{{ log.errorMessage }}</p>
                        @if (log.data) {
                          <pre class="error-data-preview">{{ log.data | json }}</pre>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .economy-container {
        max-width: 1100px;
        margin: 0 auto;
        padding: 24px;
        background-color: var(--bg-color, #fafafa);
        color: var(--text-main, #1e293b);
    }

    .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 32px;
        flex-wrap: wrap;
        gap: 16px;
    }

    .page-title h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 700;
        color: var(--text-main);
    }

    .page-title p {
        margin: 4px 0 0;
        font-size: 14px;
        color: var(--text-secondary, #64748b);
    }

    .refresh-btn {
        min-height: 40px;
    }

    .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 24px;
        margin-bottom: 40px;
    }

    .metric-card {
        background: var(--surface-color, #ffffff);
        border-radius: var(--border-radius, 12px);
        box-shadow: var(--shadow-md, 0 4px 6px -1px rgb(0 0 0 / 0.1));
        border: 1px solid #e2e8f0;
        padding: 24px;
        display: flex;
        align-items: center;
        position: relative;
        overflow: hidden;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .metric-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
    }

    .card-icon-wrapper {
        width: 56px;
        height: 56px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 20px;
        flex-shrink: 0;
    }

    .card-icon-wrapper mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
    }

    .icon-blue { background-color: #eff6ff; color: #2563eb; }
    .icon-green { background-color: #ecfdf5; color: #059669; }
    .icon-red { background-color: #fef2f2; color: #dc2626; }
    .icon-purple { background-color: #faf5ff; color: #7c3aed; }

    .metric-info {
        flex: 1;
        min-width: 0;
    }

    .metric-label {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 4px;
    }

    .metric-value {
        font-size: 28px;
        font-weight: 700;
        color: var(--text-main);
        line-height: 1.2;
    }

    .metric-value.depleted {
        color: var(--danger-color, #ef4444);
    }

    .status-badge {
        position: absolute;
        top: 12px;
        right: 12px;
        background: #fee2e2;
        color: #991b1b;
        font-size: 11px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 9999px;
        letter-spacing: 0.05em;
    }

    .progress-section {
        margin-top: 12px;
    }

    .progress-bar-container {
        height: 8px;
        background: #e2e8f0;
        border-radius: 9999px;
        overflow: hidden;
        margin-bottom: 6px;
    }

    .progress-bar-fill {
        height: 100%;
        border-radius: 9999px;
        transition: width 0.5s ease-out;
    }

    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }

    .section-header h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .section-header h2 mat-icon {
        color: var(--danger-color);
    }

    .section-badge {
        background-color: #f1f5f9;
        color: #475569;
        padding: 4px 12px;
        border-radius: 9999px;
        font-size: 12px;
        font-weight: 600;
    }

    .logs-card {
        background: var(--surface-color, #ffffff);
        border-radius: var(--border-radius, 12px);
        box-shadow: var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.1));
        border: 1px solid #e2e8f0;
        overflow: hidden;
    }

    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 64px 16px;
        text-align: center;
        color: var(--text-secondary);
    }

    .empty-state mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: var(--success-color, #22c55e);
        margin-bottom: 12px;
    }

    .empty-state p {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
    }

    .logs-table-wrapper {
        overflow-x: auto;
        width: 100%;
    }

    .logs-table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
    }

    .logs-table th {
        background: #f8fafc;
        padding: 14px 20px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--text-secondary);
        border-bottom: 1px solid #e2e8f0;
    }

    .logs-table td {
        padding: 16px 20px;
        font-size: 14px;
        border-bottom: 1px solid #e2e8f0;
        vertical-align: top;
    }

    .logs-table tr:last-child td {
        border-bottom: none;
    }

    .logs-table tr:hover td {
        background-color: #f8fafc;
    }

    .timestamp-cell {
        white-space: nowrap;
        color: var(--text-secondary);
        font-size: 13px;
    }

    .action-badge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 9999px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.02em;
    }

    .action-badge.award { background-color: #fee2e2; color: #991b1b; }
    .action-badge.purchase { background-color: #ffedd5; color: #9a3412; }
    .action-badge.audit { background-color: #fef9c3; color: #854d0e; }
    .action-badge.fallback { background-color: #f3e8ff; color: #6b21a8; }

    .uid-cell {
        font-family: monospace;
        color: #475569;
        font-size: 13px;
    }

    .details-cell {
        max-width: 450px;
    }

    .error-message {
        color: var(--danger-color);
        font-weight: 600;
        margin: 0 0 6px 0;
    }

    .error-data-preview {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 8px 12px;
        font-size: 11px;
        color: #334155;
        font-family: monospace;
        white-space: pre-wrap;
        max-height: 120px;
        overflow-y: auto;
        margin: 0;
    }

    .loading-container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 300px;
    }

    @media (max-width: 768px) {
        .economy-container {
            padding: 16px;
        }
        
        .page-header {
            margin-bottom: 20px;
        }
        
        .metrics-grid {
            grid-template-columns: 1fr;
            gap: 16px;
        }
        
        .logs-table th, .logs-table td {
            padding: 12px 14px;
        }
    }
  `]
})
export class GamificationAdmin implements OnInit {
  private firestore = inject(Firestore);

  // Global Pool Signals
  poolBalance = signal<number>(0);
  poolInitialBudget = signal<number>(0);
  poolLastRefreshed = signal<Date | null>(null);
  
  // Error Logs Signals
  errorLogs = signal<any[]>([]);
  
  isLoading = signal<boolean>(true);

  ngOnInit() {
    this.loadEconomyData();
  }

  async loadEconomyData() {
    this.isLoading.set(true);
    try {
      // 1. Fetch Global Pool
      const poolRef = doc(this.firestore, 'system_config/gamification_pool');
      const poolDoc = await getDoc(poolRef);
      if (poolDoc.exists()) {
        const data = poolDoc.data();
        this.poolBalance.set(data['balance'] || 0);
        this.poolInitialBudget.set(data['initialBudget'] || 0);
        if (data['lastRefreshed']) {
            this.poolLastRefreshed.set(data['lastRefreshed'].toDate());
        }
      } else {
        this.poolBalance.set(0);
        this.poolInitialBudget.set(0);
        this.poolLastRefreshed.set(null);
      }

      // 2. Fetch Recent Gamification Errors
      const errorsRef = collection(this.firestore, 'system_logs/gamification_errors/errors');
      const q = query(errorsRef, orderBy('timestamp', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      
      const logs: any[] = [];
      snapshot.forEach(doc => {
        logs.push({ id: doc.id, ...doc.data() });
      });
      this.errorLogs.set(logs);

    } catch (err) {
      console.error('Failed to load economy data', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  get percentConsumed(): number {
    const budget = this.poolInitialBudget();
    const balance = this.poolBalance();
    if (budget <= 0) return 0;
    const consumed = budget - balance;
    return Math.max(0, Math.min(100, Math.round((consumed / budget) * 100)));
  }
}
