import { Injectable } from '@angular/core';
import {
  DailyPerformanceResult,
  WeeklyPerformanceResult,
  MonthlyPerformanceResult
} from './reports.service';

export type ExportFormat = 'MARKDOWN' | 'JSON' | 'CLIPBOARD';

@Injectable({
  providedIn: 'root'
})
export class ReportAiExportService {

  // ────────────────────────────────────────────────────────────────────────────
  // 1. PUBLIC DISPATCHER
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Main entry point to export reports in the chosen format.
   */
  async exportReport(
    cadence: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM',
    data: any,
    format: ExportFormat,
    customMeta?: { startDate: string; endDate: string }
  ): Promise<{ success: boolean; message: string }> {
    if (!data) {
      return { success: false, message: 'No report data loaded to export.' };
    }

    try {
      if (format === 'JSON') {
        const filename = this.generateFilename(cadence, data, 'json', customMeta);
        const jsonContent = JSON.stringify(data, null, 2);
        this.triggerDownload(filename, jsonContent, 'application/json');
        return { success: true, message: `Exported raw JSON (${filename})` };
      }

      // Generate AI-optimized Markdown
      let markdown = '';
      if (cadence === 'DAILY') {
        markdown = this.formatDailyMarkdown(data as DailyPerformanceResult);
      } else if (cadence === 'WEEKLY') {
        markdown = this.formatWeeklyMarkdown(data as WeeklyPerformanceResult);
      } else if (cadence === 'MONTHLY') {
        markdown = this.formatMonthlyMarkdown(data as MonthlyPerformanceResult);
      } else {
        markdown = this.formatCustomMarkdown(data, customMeta);
      }

      if (format === 'CLIPBOARD') {
        const copied = await this.copyToClipboard(markdown);
        if (copied) {
          return { success: true, message: 'AI Prompt copied to clipboard! Ready to paste into ChatGPT / Claude / Gemini.' };
        } else {
          return { success: false, message: 'Failed to copy to clipboard. Browser permissions denied.' };
        }
      }

      // Otherwise format === 'MARKDOWN'
      const filename = this.generateFilename(cadence, data, 'md', customMeta);
      this.triggerDownload(filename, markdown, 'text/markdown;charset=utf-8');
      return { success: true, message: `Exported AI Briefing (${filename})` };
    } catch (err: any) {
      console.error('[ReportAiExportService] Export error:', err);
      return { success: false, message: `Export failed: ${err?.message || 'Unknown error'}` };
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 2. DAILY REPORT FORMATTER
  // ────────────────────────────────────────────────────────────────────────────

  formatDailyMarkdown(d: DailyPerformanceResult): string {
    const timestamp = new Date().toLocaleString();
    const avgTicket = d.transactionCount > 0 ? (d.grossRevenue / d.transactionCount).toFixed(2) : '0.00';
    const cashPct = d.grossRevenue > 0 ? ((d.paymentBreakdown.cash / d.grossRevenue) * 100).toFixed(1) : '0.0';
    const gcashPct = d.grossRevenue > 0 ? ((d.paymentBreakdown.gcash / d.grossRevenue) * 100).toFixed(1) : '0.0';
    const otherPct = d.grossRevenue > 0 ? ((d.paymentBreakdown.other / d.grossRevenue) * 100).toFixed(1) : '0.0';

    const topProdLines = d.topProducts.length > 0
      ? d.topProducts.slice(0, 10).map((p, idx) => `${idx + 1}. **${p.name}**: ${p.quantity} units | ₱${p.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`).join('\n')
      : '_No retail/service items recorded today._';

    const incidentLines = this.formatIncidentsAndAnomalies(d.systemAnomalies, d.manualIncidents);

    return `# EPICENTER GYM - DAILY OPERATIONAL & FINANCIAL AUDIT
**Date**: ${d.dateStr} | **Generated**: ${timestamp}
**System**: Epicenter Management OS v2.0

> **PROMPT FOR AI BUSINESS ANALYST**:
> You are an executive gym business consultant and financial auditor. Review the daily performance metrics below and provide:
> 1. **Executive Verdict & Operational Score (1-10)**: Summarize health, risks, and achievements.
> 2. **Financial Integrity Audit**: Evaluate register balance, cash vs. digital ratio, voided receipts, and potential leakage.
> 3. **Facility & Traffic Analysis**: Evaluate peak hour capacity, member volume, and unclosed sessions.
> 4. **Staff & Sales Efficiency**: Comment on staffing punctuality, retail movers, and desk performance.
> 5. **Action Plan for Tomorrow Morning**: 3 concrete, prioritized instructions for the opening manager.

---

## 1. FINANCIAL SUMMARY
- **Gross Revenue**: ₱${d.grossRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- **Net Revenue**: ₱${d.netRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- **Total Completed Transactions**: ${d.transactionCount}
- **Average Ticket Value**: ₱${avgTicket}
- **Payment Method Distribution**:
  - **Cash**: ₱${d.paymentBreakdown.cash.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${cashPct}%)
  - **GCash**: ₱${d.paymentBreakdown.gcash.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${gcashPct}%)
  - **Other / Cards**: ₱${d.paymentBreakdown.other.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${otherPct}%)
- **Voided Sales**: ${d.voidCount} receipt(s) totalling ₱${d.voidAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}

## 2. CASH REGISTER RECONCILIATION
- **Total Register Shifts**: ${d.cashRegister.shiftCount}
- **Register Status**: ${d.cashRegister.statusText}
- **Net Drawer Variance**: ${d.cashRegister.netDifference >= 0 ? '+' : ''}₱${d.cashRegister.netDifference.toLocaleString('en-US', { minimumFractionDigits: 2 })}
  - Total Shortage: -₱${d.cashRegister.totalShortage.toLocaleString('en-US', { minimumFractionDigits: 2 })}
  - Total Surplus: +₱${d.cashRegister.totalSurplus.toLocaleString('en-US', { minimumFractionDigits: 2 })}

## 3. FACILITY FOOT TRAFFIC & UTILIZATION
- **Total Check-Ins**: ${d.attendance.totalCheckIns}
- **Unique Members**: ${d.attendance.uniqueMembers}
- **Peak Hour**: ${d.attendance.peakHour || 'N/A'} (${d.attendance.peakCount} entries)
- **Overdue / Unclosed Workout Sessions**: ${d.attendance.overdueCount}

### Hourly Traffic Distribution (06:00 - 22:00)
| Hour | Check-in Count |
| :--- | :--- |
${d.attendance.hourlyDistribution.map(h => `| ${h.hour} | ${h.count} |`).join('\n')}

## 4. TOP PRODUCT & SERVICE SALES
${topProdLines}

## 5. STAFFING & OPERATIONS
- **Active On-Duty Staff**: ${d.staffing.activeStaffCount}
- **Tardy / Late Staff**: ${d.staffing.lateStaffCount}
- **Total Late Minutes Accumulated**: ${d.staffing.totalLateMinutes} mins

## 6. FLAGGED INCIDENTS & ANOMALIES
${incidentLines}
`;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 3. WEEKLY REPORT FORMATTER
  // ────────────────────────────────────────────────────────────────────────────

  formatWeeklyMarkdown(w: WeeklyPerformanceResult): string {
    const timestamp = new Date().toLocaleString();
    const growthStr = w.growthPct !== null ? `${w.growthPct >= 0 ? '+' : ''}${w.growthPct.toFixed(1)}%` : 'N/A (First recorded week)';

    const dayPaceTable = w.dayPace.map(dp => {
      const pacePct = dp.prevSales > 0 ? (((dp.currentSales - dp.prevSales) / dp.prevSales) * 100).toFixed(1) + '%' : 'N/A';
      return `| ${dp.dayName} (${dp.dateStr}) | ₱${dp.currentSales.toLocaleString('en-US', { minimumFractionDigits: 2 })} | ₱${dp.prevSales.toLocaleString('en-US', { minimumFractionDigits: 2 })} | ${pacePct} |`;
    }).join('\n');

    const leaderboardLines = w.staffLeaderboard.length > 0
      ? w.staffLeaderboard.map((s, idx) => `${idx + 1}. **${s.name}**: Sales ₱${s.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })} | Comm. ₱${s.totalCommission.toLocaleString('en-US', { minimumFractionDigits: 2 })}`).join('\n')
      : '_No staff sales attributed this week._';

    const incidentLines = this.formatIncidentsAndAnomalies(w.systemAnomalies, w.manualIncidents);

    return `# EPICENTER GYM - WEEKLY STRATEGIC & OPERATIONAL BRIEF
**Period**: ${w.startStr} to ${w.endStr} | **Generated**: ${timestamp}
**System**: Epicenter Management OS v2.0

> **PROMPT FOR AI BUSINESS ANALYST**:
> You are an executive gym business consultant and senior operations strategist. Review the 7-day weekly metrics below and provide:
> 1. **Executive Performance Diagnosis**: Growth rate analysis vs. previous week, pace trends, and total sales momentum.
> 2. **Staff Productivity & Sales Review**: Identify top revenue drivers, commission balance, and underperforming areas.
> 3. **Traffic Rhythm & Resource Scheduling**: Analyze busiest days, peak rush hours vs. lull hours, and recommend shift schedule tweaks.
> 4. **Cash Integrity & Risk Audit**: Total discrepancies, open incidents, and critical operational risks.
> 5. **Weekly Strategic Focus**: 3 strategic levers to maximize revenue and member engagement next week.

---

## 1. REVENUE PACING & BENCHMARKING
- **Total Week Revenue**: ₱${w.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- **Prior Week Revenue**: ₱${w.prevWeekRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- **Week-over-Week Growth**: ${growthStr}
- **Net Cash Discrepancy (All Shifts)**: ${w.netCashDiscrepancy >= 0 ? '+' : ''}₱${w.netCashDiscrepancy.toLocaleString('en-US', { minimumFractionDigits: 2 })}

### Day-by-Day Performance Pacing
| Day | Current Week | Prior Week | Pace Growth |
| :--- | :--- | :--- | :--- |
${dayPaceTable}

## 2. FOOT TRAFFIC & FACILITY UTILIZATION
- **Total Weekly Check-Ins**: ${w.totalCheckIns}
- **Weekly Active Unique Members**: ${w.weeklyActiveMembers}
- **Busiest Day**: ${w.busiestDay.dayName} (${w.busiestDay.dateStr}) with ${w.busiestDay.count} visits
- **Peak Rush Hour**: ${w.peakRushHour.hour} (~${w.peakRushHour.avgCount.toFixed(1)} visitors avg)
- **Lull / Slow Hour**: ${w.lullHour.hour} (~${w.lullHour.avgCount.toFixed(1)} visitors avg)

## 3. STAFF SALES LEADERBOARD
${leaderboardLines}

## 4. OPERATIONAL INCIDENTS & SAFETY TALLY
- **Total Logged Incidents**: ${w.incidentTally.total}
  - Open / Under Investigation: ${w.incidentTally.open}
  - Resolved: ${w.incidentTally.resolved}
  - Critical Severity: ${w.incidentTally.critical}

## 5. FLAGGED INCIDENTS & SYSTEM ANOMALIES
${incidentLines}
`;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 4. MONTHLY REPORT FORMATTER
  // ────────────────────────────────────────────────────────────────────────────

  formatMonthlyMarkdown(m: MonthlyPerformanceResult): string {
    const timestamp = new Date().toLocaleString();
    const fin = m.financialHealth;

    const streamsTable = m.revenueByStream.map(s => {
      return `| ${s.stream} | ₱${s.total.toLocaleString('en-US', { minimumFractionDigits: 2 })} | ${s.percentage.toFixed(1)}% |`;
    }).join('\n');

    let finSummary = '_Financial Health module details unavailable._';
    if (fin) {
      const outflowLines = fin.outflowBreakdown?.map(ob => `  - **${ob.label}**: ₱${ob.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${ob.percentage.toFixed(1)}%)`).join('\n') || '  - None';

      finSummary = `
- **Total Revenue (Inflows)**: ₱${fin.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- **Total Outflows (OPEX & Bills)**: ₱${fin.totalOutflows.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- **Net Profit**: ₱${fin.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })} (Net Margin: ${fin.netProfitMargin.toFixed(1)}%)
- **Health Score & Grade**: ${fin.healthScore}/100 (Grade ${fin.healthGrade})
- **Cash Runway Buffer**: ${fin.runwayDays.toFixed(1)} days of OPEX
- **Payroll**: ₱${fin.payrollAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${fin.payrollRatio.toFixed(1)}% of rev)
- **Utilities**: ₱${fin.utilitiesAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${fin.utilitiesRatio.toFixed(1)}% of rev)
- **COGS**: ₱${fin.cogsAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${fin.cogsRatio.toFixed(1)}% of rev)
- **Overdue Bills Alert**: ${fin.overdueBillsCount} bill(s) (₱${fin.overdueBillsAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })})
- **Expense Breakdown**:
${outflowLines}
`;
    }

    const unrenewedSample = m.unrenewedSummary.members.slice(0, 15).map((u, idx) => {
      return `| ${idx + 1} | ${u.memberName} | ${u.type} | ${u.daysAgo} days ago | ${u.contactNumber} |`;
    }).join('\n');

    const incidentLines = this.formatIncidentsAndAnomalies(m.systemAnomalies, m.manualIncidents);

    return `# EPICENTER GYM - MONTHLY EXECUTIVE & FINANCIAL AUDIT
**Month**: ${m.monthName} ${m.year} | **Generated**: ${timestamp}
**System**: Epicenter Management OS v2.0

> **PROMPT FOR AI BUSINESS ANALYST**:
> You are an executive gym consultant and chief financial advisor. Review the full-month financial and operational performance data below and provide:
> 1. **Executive Verdict & Financial Health Assessment**: Quota fulfillment, profit margins, and cost management.
> 2. **Revenue Diversification Analysis**: Evaluate reliance on memberships vs. personal training vs. retail/supplements.
> 3. **Member Retention & Churn Recovery Tactics**: Analyze the unrenewed members cohort and outline a win-back outreach strategy.
> 4. **Foot Traffic & Facility Efficiency**: Compare weekday vs. weekend patterns, peak hours, and capacity headroom.
> 5. **Month-Ahead Strategic Roadmap**: Top 3 high-impact recommendations for the Board of Directors and General Manager.

---

## 1. MONTHLY REVENUE & QUOTA PACING
- **Total Revenue**: ₱${m.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- **Monthly Revenue Target (Quota)**: ₱${m.monthlyQuota.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- **Quota Attainment**: ${m.quotaProgressPct.toFixed(1)}%
- **Projected Month-End Close**: ₱${m.projectedMonthEnd.toLocaleString('en-US', { minimumFractionDigits: 2 })}

## 2. COMPREHENSIVE FINANCIAL HEALTH & CASHFLOW
${finSummary}

## 3. REVENUE BY REVENUE STREAM
| Stream | Total (₱) | Share (%) |
| :--- | :--- | :--- |
${streamsTable || '| _No stream data_ | ₱0.00 | 0.0% |'}

## 4. GYM UTILIZATION & MEMBERSHIP BASE
- **Total Member Check-Ins**: ${m.totalCheckIns}
- **Unique Monthly Visitors**: ${m.uniqueVisitors}
- **New Members Acquired This Month**: ${m.newMembersCount}
- **Weekday Average Check-Ins**: ${m.weekdayAvgCheckIns.toFixed(1)} / day
- **Weekend Average Check-Ins**: ${m.weekendAvgCheckIns.toFixed(1)} / day

## 5. RETENTION ALERT: LAPSED / UNRENEWED MEMBERS
- **Total Lapsed Subscriptions**: ${m.unrenewedSummary.totalUnrenewed}
  - Lapsed Regular Memberships: ${m.unrenewedSummary.membershipLapsedCount}
  - Lapsed Personal Training Packages: ${m.unrenewedSummary.trainingLapsedCount}

### Priority Retention Targets (First 15 Members)
| # | Member Name | Type | Expired | Contact |
| :--- | :--- | :--- | :--- | :--- |
${unrenewedSample || '| - | _None detected_ | - | - | - |'}

## 6. OPERATIONAL INCIDENTS & AUDIT TALLY
- **Total Incidents Logged**: ${m.incidentAudit.total}
- **Incident Resolution Rate**: ${m.incidentAudit.resolutionRatePct.toFixed(1)}%

## 7. FLAGGED INCIDENTS & SYSTEM ANOMALIES
${incidentLines}
`;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 5. CUSTOM RANGE FORMATTER
  // ────────────────────────────────────────────────────────────────────────────

  formatCustomMarkdown(data: any, customMeta?: { startDate: string; endDate: string }): string {
    const timestamp = new Date().toLocaleString();
    const start = customMeta?.startDate || 'Custom Start';
    const end = customMeta?.endDate || 'Custom End';

    return `# EPICENTER GYM - CUSTOM PERFORMANCE AUDIT
**Date Range**: ${start} to ${end} | **Generated**: ${timestamp}
**System**: Epicenter Management OS v2.0

> **PROMPT FOR AI BUSINESS ANALYST**:
> Review the custom date range dataset below. Identify performance anomalies, peak utilization times, top revenue drivers, and highlight areas for operational optimization.

---

## RAW DATA SUMMARY
\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`
`;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 6. PRIVATE HELPERS (Incidents, Filenames, Browser Downloads, Clipboard)
  // ────────────────────────────────────────────────────────────────────────────

  private formatIncidentsAndAnomalies(anomalies: any[] = [], manual: any[] = []): string {
    if (anomalies.length === 0 && manual.length === 0) {
      return '_Zero incidents or system anomalies reported. Clean operational period._';
    }

    const items: string[] = [];

    anomalies.forEach(a => {
      const status = a.isResolved ? 'RESOLVED' : 'UNRESOLVED';
      items.push(`- **[${a.severity || 'MEDIUM'}] [${status}] System Anomaly**: ${a.title} - ${a.details || ''}`);
    });

    manual.forEach(m => {
      const status = m.status || 'OPEN';
      items.push(`- **[${m.severity || 'MEDIUM'}] [${status}] Manual Incident**: ${m.title} - ${m.description || ''} (Action: ${m.actionTaken || 'None'})`);
    });

    return items.join('\n');
  }

  private generateFilename(
    cadence: string,
    data: any,
    extension: 'md' | 'json',
    customMeta?: { startDate: string; endDate: string }
  ): string {
    if (cadence === 'DAILY') {
      const dateStr = data?.dateStr || new Date().toISOString().split('T')[0];
      return `Epicenter_Daily_Report_${dateStr}.${extension}`;
    }
    if (cadence === 'WEEKLY') {
      const start = data?.startStr || 'Week';
      const end = data?.endStr || '';
      return `Epicenter_Weekly_Report_${start}_to_${end}.${extension}`;
    }
    if (cadence === 'MONTHLY') {
      const year = data?.year || new Date().getFullYear();
      const monthNum = data?.month !== undefined ? String(data.month + 1).padStart(2, '0') : '00';
      return `Epicenter_Monthly_Report_${year}-${monthNum}.${extension}`;
    }
    const start = customMeta?.startDate || 'start';
    const end = customMeta?.endDate || 'end';
    return `Epicenter_Custom_Report_${start}_to_${end}.${extension}`;
  }

  private triggerDownload(filename: string, content: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private async copyToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      // Fallback for non-secure or older contexts
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    } catch (err) {
      console.warn('[ReportAiExportService] Clipboard write error:', err);
      return false;
    }
  }
}
