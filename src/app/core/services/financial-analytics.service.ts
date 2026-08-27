import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  where,
  getDocs,
  Timestamp
} from '@angular/fire/firestore';
import { firstValueFrom } from 'rxjs';
import { TransactionService } from './transaction.service';
import { PayablesService } from './payables.service';
import { CashRegisterService } from './cash-register.service';
import { OUTFLOW_CATEGORIES } from '../models/outflow.model';
import {
  FinancialHealthSummary,
  OutflowCategoryBreakdown,
  RecommendationCard
} from '../models/financial-health.model';

@Injectable({
  providedIn: 'root'
})
export class FinancialAnalyticsService {
  private firestore = inject(Firestore);
  private transactionService = inject(TransactionService);
  private payablesService = inject(PayablesService);
  private cashRegisterService = inject(CashRegisterService);

  async analyzeFinancialHealth(startDate: Date, endDate: Date): Promise<FinancialHealthSummary> {
    const transactions = await firstValueFrom(this.transactionService.getTransactions({
      startDate,
      endDate,
      limit: 3000
    }));

    const validTx = transactions.filter((t: any) => t.status !== 'VOID');
    const totalRevenue = validTx.reduce((sum: number, t: any) => sum + (t.total || 0), 0);

    const allBills = await firstValueFrom(this.payablesService.getBills$());
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let overdueCount = 0;
    let overdueSum = 0;

    allBills.forEach(b => {
      if (b.status !== 'PAID' && b.status !== 'CANCELLED') {
        if (new Date(b.dueDate).getTime() < today.getTime()) {
          overdueCount++;
          overdueSum += b.remainingBalance || 0;
        }
      }
    });

    const shiftsColl = collection(this.firestore, 'shifts');
    const shiftsQ = query(
      shiftsColl,
      where('startTime', '>=', Timestamp.fromDate(startDate)),
      where('startTime', '<=', Timestamp.fromDate(endDate))
    );

    const shiftsSnap = await getDocs(shiftsQ);
    const categoryTotals: Record<string, number> = {};

    OUTFLOW_CATEGORIES.forEach(c => {
      categoryTotals[c.category] = 0;
    });

    shiftsSnap.forEach(docSnap => {
      const shift = docSnap.data();
      const txs = shift['transactions'] || [];
      txs.forEach((tx: any) => {
        if ((tx.type === 'Expense' || tx.type === 'Float_Out') && !tx.voided) {
          const cat = tx.category || 'EXPENSE_MISC';
          categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(tx.amount || 0);
        }
      });
    });

    allBills.forEach(b => {
      (b.payments || []).forEach(p => {
        const pDate = new Date(p.paymentDate);
        if (pDate >= startDate && pDate <= endDate) {
          if (p.paymentSource !== 'DRAWER_CASH') {
            categoryTotals[b.category] = (categoryTotals[b.category] || 0) + Number(p.amount || 0);
          }
        }
      });
    });

    const totalOutflows = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
    const netProfit = totalRevenue - totalOutflows;
    const netProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const outflowBreakdown: OutflowCategoryBreakdown[] = OUTFLOW_CATEGORIES.map(meta => {
      const amt = categoryTotals[meta.category] || 0;
      const pct = totalOutflows > 0 ? (amt / totalOutflows) * 100 : 0;
      return {
        category: meta.category,
        label: meta.label,
        amount: amt,
        percentage: Number(pct.toFixed(1)),
        color: meta.color,
        icon: meta.icon
      };
    }).filter(b => b.amount > 0);

    const payrollAmt = (categoryTotals['SALARY_STAFF'] || 0) + (categoryTotals['SALARY_COMMISSION'] || 0) + (categoryTotals['SALARY_ADVANCE'] || 0);
    const payrollRatio = totalRevenue > 0 ? Number(((payrollAmt / totalRevenue) * 100).toFixed(1)) : 0;

    const utilAmt = (categoryTotals['UTILITY_ELECTRICITY'] || 0) + (categoryTotals['UTILITY_WATER'] || 0) + (categoryTotals['UTILITY_INTERNET'] || 0);
    const utilitiesRatio = totalRevenue > 0 ? Number(((utilAmt / totalRevenue) * 100).toFixed(1)) : 0;

    const cogsAmt = categoryTotals['PURCHASE_INVENTORY'] || 0;
    const cogsRatio = totalRevenue > 0 ? Number(((cogsAmt / totalRevenue) * 100).toFixed(1)) : 0;

    const daysInRange = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const avgDailyOutflow = totalOutflows / daysInRange;
    const activeShift = this.cashRegisterService.getCurrentShift();
    const currentTillCash = activeShift?.expectedClosingBalance || 0;
    const runwayDays = avgDailyOutflow > 0 ? Math.round(currentTillCash / avgDailyOutflow) : 999;

    let score = 100;
    if (netProfit < 0) score -= 30;
    else if (netProfitMargin < 15) score -= 15;

    if (payrollRatio > 40) score -= 15;
    if (utilitiesRatio > 15) score -= 15;
    if (overdueCount > 0) score -= 20;
    if (runwayDays < 15) score -= 15;

    score = Math.max(0, Math.min(100, score));

    let grade: 'A' | 'B' | 'C' | 'D' = 'A';
    if (score < 50) grade = 'D';
    else if (score < 70) grade = 'C';
    else if (score < 85) grade = 'B';

    const recommendations: RecommendationCard[] = [];

    if (netProfit < 0) {
      recommendations.push({
        id: 'rec_deficit',
        title: 'Projected Net Cash Deficit',
        severity: 'CRITICAL',
        icon: 'trending_down',
        category: 'Cash Flow',
        summary: 'Outgoing expenses exceed ingoing revenue by ₱' + Math.abs(netProfit).toLocaleString() + '.',
        impact: 'Risk of failing to cover upcoming payroll and utility deadlines.',
        actionText: 'Launch a 3-Day Flash Discount on 6-Month/Annual Membership renewals to generate immediate liquidity.',
        actionRoute: '/members'
      });
    }

    if (overdueCount > 0) {
      recommendations.push({
        id: 'rec_overdue',
        title: overdueCount + ' Overdue Payable(s) Require Immediate Settlement',
        severity: 'CRITICAL',
        icon: 'warning',
        category: 'Liabilities',
        summary: 'Totaling ₱' + overdueSum.toLocaleString() + ' in past-due utility/supplier obligations.',
        impact: 'Risk of service disconnection or supplier delivery freeze.',
        actionText: 'Open Bills & Payables Tracker to settle overdue liabilities or request term extension.',
        actionRoute: '/store/payables'
      });
    }

    if (utilitiesRatio > 15) {
      recommendations.push({
        id: 'rec_utilities',
        title: 'High Utilities-to-Revenue Ratio (' + utilitiesRatio + '%)',
        severity: 'WARNING',
        icon: 'bolt',
        category: 'Utilities',
        summary: 'Utilities are consuming ' + utilitiesRatio + '% of revenue (Gym Benchmark: 8% - 12%). Total spent: ₱' + utilAmt.toLocaleString() + '.',
        impact: 'High utility overhead directly erodes net profit margins.',
        actionText: 'Enforce AC thermostat limits (23°C-24°C) and automated AC shutdown during off-peak hours (1:00 PM – 4:00 PM).',
        actionRoute: '/store/cash'
      });
    }

    if (payrollRatio > 40) {
      recommendations.push({
        id: 'rec_payroll',
        title: 'Staff Labor Expense Exceeds Target (' + payrollRatio + '%)',
        severity: 'WARNING',
        icon: 'badge',
        category: 'Payroll',
        summary: 'Wages and commissions account for ' + payrollRatio + '% of total revenue (Gym Benchmark: 30% - 35%). Total: ₱' + payrollAmt.toLocaleString() + '.',
        impact: 'High labor cost reduces funds for gym maintenance and marketing.',
        actionText: 'Audit staff shift rosters against peak attendance hours and optimize trainer commission tier thresholds.',
        actionRoute: '/staff-attendance'
      });
    }

    if (netProfitMargin >= 25 && overdueCount === 0) {
      recommendations.push({
        id: 'rec_positive_surplus',
        title: 'Strong Operating Net Margin (' + netProfitMargin.toFixed(1) + '%)',
        severity: 'POSITIVE',
        icon: 'stars',
        category: 'Growth',
        summary: 'Gym is operating at a healthy ' + netProfitMargin.toFixed(1) + '% profit margin with ₱' + netProfit.toLocaleString() + ' net operating surplus.',
        impact: 'Excellent financial cushion for expansion or debt reduction.',
        actionText: 'Allocate 30% of surplus to emergency cash buffer reserve and consider pre-paying supplier liabilities for early discounts.',
        actionRoute: '/store/payables'
      });
    }

    return {
      startDate,
      endDate,
      totalRevenue,
      totalOutflows,
      netProfit,
      netProfitMargin: Number(netProfitMargin.toFixed(1)),
      outflowBreakdown,
      payrollAmount: payrollAmt,
      payrollRatio,
      utilitiesAmount: utilAmt,
      utilitiesRatio,
      cogsAmount: cogsAmt,
      cogsRatio,
      runwayDays,
      overdueBillsCount: overdueCount,
      overdueBillsAmount: overdueSum,
      healthGrade: grade,
      healthScore: score,
      recommendations
    };
  }
}