import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  where,
  getDocs,
  Timestamp
} from '@angular/fire/firestore';
import { TransactionService } from './transaction.service';
import { AttendanceService } from './attendance.service';
import { IncidentService } from './incident.service';
import { FinancialAnalyticsService } from './financial-analytics.service';
import { MemberRepository } from '../repositories/member.repository';
import { toLocalDateStr } from '../utils/date.utils';
import { firstValueFrom } from 'rxjs';
import { SystemAnomaly, IncidentReport } from '../models/incident.model';

export interface UnrenewedMember {
  memberId: string;
  memberName: string;
  contactNumber: string;
  type: 'MEMBERSHIP' | 'TRAINING' | 'BOTH';
  membershipExpiration?: Date | null;
  trainingExpiration?: Date | null;
  status: string;
  daysAgo: number;
}

export interface DailyPerformanceResult {
  dateStr: string;
  grossRevenue: number;
  netRevenue: number;
  paymentBreakdown: {
    cash: number;
    gcash: number;
    other: number;
  };
  transactionCount: number;
  voidCount: number;
  voidAmount: number;
  cashRegister: {
    shiftCount: number;
    totalShortage: number;
    totalSurplus: number;
    netDifference: number;
    statusText: string;
    shifts: any[];
  };
  attendance: {
    totalCheckIns: number;
    uniqueMembers: number;
    peakHour: string;
    peakCount: number;
    hourlyDistribution: { hour: string; count: number }[];
    overdueCount: number;
  };
  staffing: {
    activeStaffCount: number;
    lateStaffCount: number;
    totalLateMinutes: number;
  };
  systemAnomalies: SystemAnomaly[];
  manualIncidents: IncidentReport[];
  topProducts: { name: string; quantity: number; revenue: number }[];
}

export interface WeeklyPerformanceResult {
  startStr: string;
  endStr: string;
  totalRevenue: number;
  prevWeekRevenue: number;
  growthPct: number | null;
  dayPace: { dateStr: string; dayName: string; currentSales: number; prevSales: number }[];
  busiestDay: { dayName: string; dateStr: string; count: number };
  peakRushHour: { hour: string; avgCount: number };
  lullHour: { hour: string; avgCount: number };
  hourlyDistribution: { hour: string; totalCount: number; avgCount: number }[];
  weeklyActiveMembers: number;
  totalCheckIns: number;
  netCashDiscrepancy: number;
  incidentTally: {
    total: number;
    resolved: number;
    open: number;
    critical: number;
  };
  systemAnomalies: SystemAnomaly[];
  manualIncidents: IncidentReport[];
  staffLeaderboard: { name: string; totalSales: number; totalCommission: number }[];
}

export interface MonthlyPerformanceResult {
  year: number;
  month: number;
  monthName: string;
  totalRevenue: number;
  monthlyQuota: number;
  quotaProgressPct: number;
  projectedMonthEnd: number;
  financialHealth: FinancialHealthSummary | null;
  totalCheckIns: number;
  uniqueVisitors: number;
  newMembersCount: number;
  weekdayAvgCheckIns: number;
  weekendAvgCheckIns: number;
  topPeakHours: { hour: string; count: number }[];
  revenueByStream: { stream: string; total: number; percentage: number }[];
  incidentAudit: {
    total: number;
    byCategory: Record<string, number>;
    resolutionRatePct: number;
  };
  systemAnomalies: SystemAnomaly[];
  manualIncidents: IncidentReport[];
  unrenewedSummary: {
    totalUnrenewed: number;
    membershipLapsedCount: number;
    trainingLapsedCount: number;
    members: UnrenewedMember[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  private firestore = inject(Firestore);
  private transactionService = inject(TransactionService);
  private attendanceService = inject(AttendanceService);
  private incidentService = inject(IncidentService);
  private financialAnalyticsService = inject(FinancialAnalyticsService);
  private memberRepository = inject(MemberRepository);

  /**
   * 1. Volume or number of gym goers every day with time peak highlight (original method preserved)
   */
  async getVolumeAnalytics(startDate: Date, endDate: Date) {
    const startStr = toLocalDateStr(startDate);
    const endStr = toLocalDateStr(endDate);

    const records = await this.attendanceService.getAttendanceRange(startStr, endStr);

    const dailyCounts = new Map<string, number>();
    const dailyVisitors = new Set<string>();
    const hourlyCounts = new Map<string, number>();

    records.forEach(record => {
      const day = record.date;
      const visitorKey = `${day}_${record.memberId}`;

      if (!dailyVisitors.has(visitorKey)) {
        dailyVisitors.add(visitorKey);
        dailyCounts.set(day, (dailyCounts.get(day) || 0) + 1);
      }

      if (record.checkInTime) {
        const date = record.checkInTime instanceof Date ? record.checkInTime : new Date(record.checkInTime);
        const hour = date.getHours().toString().padStart(2, '0') + ':00';
        hourlyCounts.set(hour, (hourlyCounts.get(hour) || 0) + 1);
      }
    });

    const series = Array.from(dailyCounts.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const peakHours = Array.from(hourlyCounts.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => b.count - a.count);

    return {
      dailyVolume: series,
      peakHours: peakHours.slice(0, 5)
    };
  }

  /**
   * 2. Sales analytics (original method preserved)
   */
  async getSalesAnalytics(startDate: Date, endDate: Date) {
    const transactions = await firstValueFrom(this.transactionService.getTransactions({
      startDate,
      endDate,
      limit: 2500
    }));

    const salesPerDay = new Map<string, number>();
    const salesPerPerson = new Map<string, { name: string, total: number, count: number }>();
    const productSales = new Map<string, { name: string, quantity: number, revenue: number }>();
    const staffPerformance = new Map<string, number>();

    transactions.forEach(tx => {
      if (tx.status === 'VOID') return;

      const date = tx.date instanceof Date ? tx.date : (tx.date as any).toDate();
      const dateStr = toLocalDateStr(date);
      salesPerDay.set(dateStr, (salesPerDay.get(dateStr) || 0) + tx.totalAmount);

      const memberId = tx.memberId || 'WALK_IN';
      const memberName = tx.memberName || 'Walk-in';
      const personEntry = salesPerPerson.get(memberId) || { name: memberName, total: 0, count: 0 };
      personEntry.total += tx.totalAmount;
      personEntry.count += 1;
      salesPerPerson.set(memberId, personEntry);

      const creditedStaff = tx.attributedStaffName || tx.staffName;
      if (creditedStaff) {
        staffPerformance.set(creditedStaff, (staffPerformance.get(creditedStaff) || 0) + tx.totalAmount);
      }

      tx.items.forEach(item => {
        const prodEntry = productSales.get(item.productId) || { name: item.productName, quantity: 0, revenue: 0 };
        prodEntry.quantity += item.quantity;
        prodEntry.revenue += item.subtotal;
        productSales.set(item.productId, prodEntry);
      });
    });

    return {
      dailySales: Array.from(salesPerDay.entries()).map(([date, total]) => ({ date, total })).sort((a, b) => a.date.localeCompare(b.date)),
      topSpenders: Array.from(salesPerPerson.values()).sort((a, b) => b.total - a.total).slice(0, 10),
      topProducts: Array.from(productSales.values()).sort((a, b) => b.quantity - a.quantity),
      staffPerformance: Array.from(staffPerformance.entries()).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total)
    };
  }

  /**
   * 3. Member's Attendance Top Attendees (original method preserved)
   */
  async getTopAttendees(startDate: Date, endDate: Date) {
    const startStr = toLocalDateStr(startDate);
    const endStr = toLocalDateStr(endDate);

    const records = await this.attendanceService.getAttendanceRange(startStr, endStr);

    const memberCounts = new Map<string, { name: string, count: number, lastVisit: any }>();
    const dailyVisits = new Set<string>();

    records.forEach(r => {
      const visitKey = `${r.date}_${r.memberId}`;
      const entry = memberCounts.get(r.memberId) || { name: r.memberName, count: 0, lastVisit: null };

      if (!dailyVisits.has(visitKey)) {
        dailyVisits.add(visitKey);
        entry.count++;
      }

      if (!entry.lastVisit || (r.checkInTime.getTime() > entry.lastVisit.getTime())) {
        entry.lastVisit = r.checkInTime;
      }
      memberCounts.set(r.memberId, entry);
    });

    return Array.from(memberCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * ── Automated System Anomalies Aggregator ──
   * Scans shifts, staff attendance, overdue kiosk sessions, and voided sales within date range.
   */
  async getSystemAnomalies(startDate: Date, endDate: Date): Promise<SystemAnomaly[]> {
    const anomalies: SystemAnomaly[] = [];
    const startStr = toLocalDateStr(startDate);
    const endStr = toLocalDateStr(endDate);

    // 1. Cash Register Discrepancies (shifts collection)
    try {
      const shiftsCol = collection(this.firestore, 'shifts');
      const shiftsQ = query(
        shiftsCol,
        where('startTime', '>=', Timestamp.fromDate(startDate)),
        where('startTime', '<=', Timestamp.fromDate(endDate))
      );
      const shiftsSnap = await getDocs(shiftsQ);

      shiftsSnap.forEach(sDoc => {
        const data = sDoc.data();
        const diff = Number(data['difference'] || 0);
        if (diff !== 0 && data['status'] === 'CLOSED') {
          const shiftDate = data['startTime']?.toDate ? data['startTime'].toDate() : new Date();
          const isShort = diff < 0;
          anomalies.push({
            id: `diff_${sDoc.id}`,
            type: 'CASH_DISCREPANCY',
            title: isShort ? `Cash Drawer Shortage (₱${Math.abs(diff).toFixed(2)})` : `Cash Drawer Surplus (+₱${diff.toFixed(2)})`,
            timestamp: shiftDate,
            dateStr: toLocalDateStr(shiftDate),
            severity: Math.abs(diff) > 200 ? 'HIGH' : 'MEDIUM',
            details: `Shift operated by ${data['cashierName'] || data['openedBy'] || 'Staff'} ended with variance. Starting: ₱${data['startingCash'] || 0}, Ending: ₱${data['endingCash'] || 0}.`,
            amount: diff,
            personName: data['cashierName'] || data['openedBy'] || 'Staff',
            referenceId: sDoc.id,
            isResolved: false
          });
        }
      });
    } catch (err) {
      console.warn('[ReportsService] Error querying shifts anomalies:', err);
    }

    // 2. Staff Attendance Tardiness (staff_attendance collection)
    try {
      const staffCol = collection(this.firestore, 'staff_attendance');
      const staffQ = query(
        staffCol,
        where('date', '>=', startStr),
        where('date', '<=', endStr)
      );
      const staffSnap = await getDocs(staffQ);

      staffSnap.forEach(stDoc => {
        const sData = stDoc.data();
        let scheduledStart = sData['scheduledStartTime'] || '08:00';
        let late = Number(sData['lateMinutes'] || 0);

        // Gym operational hours are strictly 8:00 AM to 10:00 PM daily.
        // Defensively sanitize legacy '06:00' fallback: Kris and opening staff start at 08:00
        if (scheduledStart === '06:00') {
          scheduledStart = '08:00';
          const checkIn = sData['checkInTime']?.toDate ? sData['checkInTime'].toDate() : (sData['checkInTime'] ? new Date(sData['checkInTime']) : new Date());
          const [sH, sM] = scheduledStart.split(':').map(Number);
          const schedTime = new Date(checkIn);
          schedTime.setHours(sH, sM, 0, 0);
          const diffMins = Math.round((checkIn.getTime() - schedTime.getTime()) / 60000);
          late = diffMins > 0 ? diffMins : 0;
        }

        if (late > 0) {
          const checkIn = sData['checkInTime']?.toDate ? sData['checkInTime'].toDate() : (sData['checkInTime'] ? new Date(sData['checkInTime']) : new Date());
          anomalies.push({
            id: `tardy_${stDoc.id}`,
            type: 'STAFF_TARDINESS',
            title: `Tardy Arrival: ${sData['staffName']} (${late}m late)`,
            timestamp: checkIn,
            dateStr: sData['date'] || toLocalDateStr(checkIn),
            severity: late > 30 ? 'HIGH' : 'LOW',
            details: `Scheduled at ${scheduledStart}, checked in at ${checkIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
            personName: sData['staffName'],
            referenceId: stDoc.id,
            isResolved: sData['adjustmentStatus'] === 'APPROVED'
          });
        }
      });
    } catch (err) {
      console.warn('[ReportsService] Error querying staff attendance anomalies:', err);
    }

    // 3. Voided Transactions (transactions collection)
    try {
      const txs = await firstValueFrom(this.transactionService.getTransactions({
        startDate,
        endDate,
        limit: 1000
      }));

      txs.filter(t => t.status === 'VOID').forEach(vTx => {
        const txDate = vTx.date instanceof Date ? vTx.date : (vTx.date as any).toDate();
        anomalies.push({
          id: `void_${vTx.id}`,
          type: 'VOIDED_TRANSACTION',
          title: `Voided POS Sale (₱${vTx.totalAmount.toFixed(2)})`,
          timestamp: txDate,
          dateStr: toLocalDateStr(txDate),
          severity: vTx.totalAmount >= 1000 ? 'HIGH' : 'MEDIUM',
          details: `Receipt voided by ${vTx.staffName || 'Cashier'}. Items: ${vTx.items.map(i => i.productName).join(', ')}.`,
          amount: vTx.totalAmount,
          personName: vTx.staffName || undefined,
          referenceId: vTx.id,
          isResolved: true,
          resolutionText: 'Transaction voided and reversed'
        });
      });
    } catch (err) {
      console.warn('[ReportsService] Error querying voided transactions:', err);
    }

    // 4. Overdue Kiosk Check-ins (attendance collection)
    try {
      const attRecords = await this.attendanceService.getAttendanceRange(startStr, endStr);
      const now = new Date();

      attRecords.forEach(att => {
        if (att.checkInTime) {
          const checkIn = att.checkInTime instanceof Date ? att.checkInTime : new Date(att.checkInTime);
          const hasCheckedOut = Boolean(att.checkOutTime) || att.status === 'Checked Out';
          const diffMs = (att.checkOutTime ? new Date(att.checkOutTime).getTime() : now.getTime()) - checkIn.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);

          if (!hasCheckedOut && (diffHours >= 3 || att.date < toLocalDateStr(now))) {
            anomalies.push({
              id: `overdue_${att.id || att.memberId + att.date}`,
              type: 'OVERDUE_SESSION',
              title: `Unclosed Workout Session: ${att.memberName}`,
              timestamp: checkIn,
              dateStr: att.date,
              severity: 'LOW',
              details: `Member checked in at ${checkIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${att.lockerNumber ? ` (Locker #${att.lockerNumber})` : ''} without registered checkout.`,
              personName: att.memberName,
              referenceId: att.id,
              isResolved: false
            });
          }
        }
      });
    } catch (err) {
      console.warn('[ReportsService] Error querying overdue kiosk sessions:', err);
    }

    // Sort anomalies newest first
    return anomalies.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * ── DAILY PERFORMANCE VIEW ──
   * Aggregates single-day financial collections, cash drawer balance, foot traffic, and incidents.
   */
  async getDailyPerformance(date: Date): Promise<DailyPerformanceResult> {
    const dateStr = toLocalDateStr(date);
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

    const [txs, attendance, anomalies, manualIncidents] = await Promise.all([
      firstValueFrom(this.transactionService.getTransactions({ startDate: startOfDay, endDate: endOfDay, limit: 1000 })),
      this.attendanceService.getAttendanceRange(dateStr, dateStr),
      this.getSystemAnomalies(startOfDay, endOfDay),
      firstValueFrom(this.incidentService.getIncidentsByDateRange$(dateStr, dateStr))
    ]);

    // Financials
    let grossRevenue = 0;
    let cashSales = 0;
    let gcashSales = 0;
    let otherSales = 0;
    let voidCount = 0;
    let voidAmount = 0;
    const productMap = new Map<string, { name: string, quantity: number, revenue: number }>();

    txs.forEach(t => {
      if (t.status === 'VOID') {
        voidCount++;
        voidAmount += t.totalAmount;
        return;
      }

      grossRevenue += t.totalAmount;
      const pm = (t.paymentMethod || 'CASH').toUpperCase();
      if (pm === 'CASH') {
        cashSales += t.totalAmount;
      } else if (pm === 'GCASH') {
        gcashSales += t.totalAmount;
      } else {
        otherSales += t.totalAmount;
      }

      t.items.forEach(i => {
        const itemEntry = productMap.get(i.productId) || { name: i.productName, quantity: 0, revenue: 0 };
        itemEntry.quantity += i.quantity;
        itemEntry.revenue += i.subtotal;
        productMap.set(i.productId, itemEntry);
      });
    });

    // Cash Register Shifts
    const shiftAnomalies = anomalies.filter(a => a.type === 'CASH_DISCREPANCY');
    const totalShortage = shiftAnomalies.filter(s => (s.amount || 0) < 0).reduce((sum, s) => sum + Math.abs(s.amount || 0), 0);
    const totalSurplus = shiftAnomalies.filter(s => (s.amount || 0) > 0).reduce((sum, s) => sum + (s.amount || 0), 0);
    const netDifference = totalSurplus - totalShortage;

    let statusText = 'Balanced (Zero Discrepancy)';
    if (netDifference < 0) {
      statusText = `Short ₱${Math.abs(netDifference).toFixed(2)}`;
    } else if (netDifference > 0) {
      statusText = `Over +₱${netDifference.toFixed(2)}`;
    }

    // Foot traffic & hourly distribution
    const hourlyMap = new Map<string, number>();
    for (let h = 6; h <= 22; h++) {
      hourlyMap.set(h.toString().padStart(2, '0') + ':00', 0);
    }

    const uniqueMembers = new Set<string>();
    let overdueCount = 0;

    attendance.forEach(att => {
      uniqueMembers.add(att.memberId);
      if (att.checkInTime) {
        const dt = att.checkInTime instanceof Date ? att.checkInTime : new Date(att.checkInTime);
        const hr = dt.getHours().toString().padStart(2, '0') + ':00';
        if (hourlyMap.has(hr)) {
          hourlyMap.set(hr, (hourlyMap.get(hr) || 0) + 1);
        }
      }
    });

    overdueCount = anomalies.filter(a => a.type === 'OVERDUE_SESSION').length;

    let peakHour = '17:00';
    let peakCount = 0;
    hourlyMap.forEach((count, hr) => {
      if (count > peakCount) {
        peakCount = count;
        peakHour = hr;
      }
    });

    // Staffing
    const tardyAnomalies = anomalies.filter(a => a.type === 'STAFF_TARDINESS');
    const lateStaffCount = tardyAnomalies.length;
    const totalLateMinutes = tardyAnomalies.reduce((sum, t) => {
      const match = t.title.match(/(\d+)m late/);
      return sum + (match ? Number(match[1]) : 0);
    }, 0);

    return {
      dateStr,
      grossRevenue,
      netRevenue: grossRevenue - voidAmount,
      paymentBreakdown: {
        cash: cashSales,
        gcash: gcashSales,
        other: otherSales
      },
      transactionCount: txs.filter(t => t.status !== 'VOID').length,
      voidCount,
      voidAmount,
      cashRegister: {
        shiftCount: Math.max(shiftAnomalies.length, 1),
        totalShortage,
        totalSurplus,
        netDifference,
        statusText,
        shifts: []
      },
      attendance: {
        totalCheckIns: attendance.length,
        uniqueMembers: uniqueMembers.size,
        peakHour,
        peakCount,
        hourlyDistribution: Array.from(hourlyMap.entries()).map(([hour, count]) => ({ hour, count })),
        overdueCount
      },
      staffing: {
        activeStaffCount: Math.max(lateStaffCount, 1),
        lateStaffCount,
        totalLateMinutes
      },
      systemAnomalies: anomalies,
      manualIncidents,
      topProducts: Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 6)
    };
  }

  /**
   * ── WEEKLY PERFORMANCE VIEW ──
   * Aggregates 7-day revenue pace, peak hours curve, staff sales, and incident resolution scorecard.
   */
  async getWeeklyPerformance(startDate: Date, endDate: Date): Promise<WeeklyPerformanceResult> {
    const startStr = toLocalDateStr(startDate);
    const endStr = toLocalDateStr(endDate);

    // Prior 7-day period for week-over-week comparison
    const priorStart = new Date(startDate);
    priorStart.setDate(priorStart.getDate() - 7);
    const priorEnd = new Date(endDate);
    priorEnd.setDate(priorEnd.getDate() - 7);

    const [curTxs, prevTxs, attendance, anomalies, manualIncidents] = await Promise.all([
      firstValueFrom(this.transactionService.getTransactions({ startDate, endDate, limit: 3000 })),
      firstValueFrom(this.transactionService.getTransactions({ startDate: priorStart, endDate: priorEnd, limit: 3000 })),
      this.attendanceService.getAttendanceRange(startStr, endStr),
      this.getSystemAnomalies(startDate, endDate),
      firstValueFrom(this.incidentService.getIncidentsByDateRange$(startStr, endStr))
    ]);

    const validCurTxs = curTxs.filter(t => t.status !== 'VOID');
    const validPrevTxs = prevTxs.filter(t => t.status !== 'VOID');

    const totalRevenue = validCurTxs.reduce((sum, t) => sum + t.totalAmount, 0);
    const prevWeekRevenue = validPrevTxs.reduce((sum, t) => sum + t.totalAmount, 0);
    const growthPct = prevWeekRevenue > 0 ? ((totalRevenue - prevWeekRevenue) / prevWeekRevenue) * 100 : null;

    // Day-by-Day Pace Chart (Mon to Sun)
    const dayPaceMap = new Map<string, { dayName: string; currentSales: number; prevSales: number }>();
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Initialize 7 days
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dStr = toLocalDateStr(d);
      const name = dayNames[i] || d.toLocaleDateString([], { weekday: 'short' });
      dayPaceMap.set(dStr, { dayName: name, currentSales: 0, prevSales: 0 });
    }

    validCurTxs.forEach(t => {
      const dt = t.date instanceof Date ? t.date : (t.date as any).toDate();
      const dStr = toLocalDateStr(dt);
      if (dayPaceMap.has(dStr)) {
        dayPaceMap.get(dStr)!.currentSales += t.totalAmount;
      }
    });

    validPrevTxs.forEach(t => {
      const dt = t.date instanceof Date ? t.date : (t.date as any).toDate();
      // Shift forward by 7 days to match slot
      const shifted = new Date(dt);
      shifted.setDate(shifted.getDate() + 7);
      const dStr = toLocalDateStr(shifted);
      if (dayPaceMap.has(dStr)) {
        dayPaceMap.get(dStr)!.prevSales += t.totalAmount;
      }
    });

    // Peak Hours across the entire week (Hourly distribution 08:00 to 22:00)
    const hourlyCounts = new Map<string, number>();
    for (let h = 8; h <= 22; h++) {
      hourlyCounts.set(h.toString().padStart(2, '0') + ':00', 0);
    }

    const dailyVisitCounts = new Map<string, number>();
    const weeklyActiveMembersSet = new Set<string>();

    attendance.forEach(att => {
      weeklyActiveMembersSet.add(att.memberId);
      dailyVisitCounts.set(att.date, (dailyVisitCounts.get(att.date) || 0) + 1);

      if (att.checkInTime) {
        const dt = att.checkInTime instanceof Date ? att.checkInTime : new Date(att.checkInTime);
        const hr = dt.getHours().toString().padStart(2, '0') + ':00';
        if (hourlyCounts.has(hr)) {
          hourlyCounts.set(hr, (hourlyCounts.get(hr) || 0) + 1);
        }
      }
    });

    // Find Busiest Day of the Week
    let busiestDayName = 'None';
    let busiestDateStr = startStr;
    let maxDayCount = 0;

    dailyVisitCounts.forEach((count, dStr) => {
      if (count > maxDayCount) {
        maxDayCount = count;
        busiestDateStr = dStr;
        const dObj = new Date(dStr + 'T00:00:00');
        busiestDayName = dObj.toLocaleDateString([], { weekday: 'long' });
      }
    });

    // Hourly peak & lull
    let peakHourStr = '17:00';
    let peakHourMax = 0;
    let lullHourStr = '13:00';
    let lullHourMin = 999999;

    hourlyCounts.forEach((count, hr) => {
      if (count > peakHourMax) {
        peakHourMax = count;
        peakHourStr = hr;
      }
      if (count < lullHourMin) {
        lullHourMin = count;
        lullHourStr = hr;
      }
    });

    const hourlyDistribution = Array.from(hourlyCounts.entries()).map(([hour, totalCount]) => ({
      hour,
      totalCount,
      avgCount: Math.round(totalCount / 7)
    }));

    // Net Cash Drawer Discrepancy
    const discrepancyAnomalies = anomalies.filter(a => a.type === 'CASH_DISCREPANCY');
    const netCashDiscrepancy = discrepancyAnomalies.reduce((sum, a) => sum + (a.amount || 0), 0);

    // Staff Leaderboard
    const staffMap = new Map<string, { totalSales: number; totalCommission: number }>();
    validCurTxs.forEach(t => {
      const sName = t.attributedStaffName || t.staffName || 'Unassigned';
      const entry = staffMap.get(sName) || { totalSales: 0, totalCommission: 0 };
      entry.totalSales += t.totalAmount;
      staffMap.set(sName, entry);
    });

    const staffLeaderboard = Array.from(staffMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.totalSales - a.totalSales);

    // Incident Tally
    const allIncidentsTotal = anomalies.length + manualIncidents.length;
    const resolvedManual = manualIncidents.filter(m => m.status === 'RESOLVED' || m.status === 'CLOSED').length;
    const resolvedAnomalies = anomalies.filter(a => a.isResolved).length;
    const totalResolved = resolvedManual + resolvedAnomalies;
    const totalOpen = allIncidentsTotal - totalResolved;
    const totalCritical = manualIncidents.filter(m => m.severity === 'CRITICAL').length + anomalies.filter(a => a.severity === 'CRITICAL').length;

    return {
      startStr,
      endStr,
      totalRevenue,
      prevWeekRevenue,
      growthPct,
      dayPace: Array.from(dayPaceMap.entries()).map(([dateStr, data]) => ({ dateStr, ...data })),
      busiestDay: { dayName: busiestDayName, dateStr: busiestDateStr, count: maxDayCount },
      peakRushHour: { hour: peakHourStr, avgCount: Math.round(peakHourMax / 7) },
      lullHour: { hour: lullHourStr, avgCount: Math.round(lullHourMin / 7) },
      hourlyDistribution,
      weeklyActiveMembers: weeklyActiveMembersSet.size,
      totalCheckIns: attendance.length,
      netCashDiscrepancy,
      incidentTally: {
        total: allIncidentsTotal,
        resolved: totalResolved,
        open: totalOpen,
        critical: totalCritical
      },
      systemAnomalies: anomalies,
      manualIncidents,
      staffLeaderboard
    };
  }

  /**
   * ── MONTHLY PERFORMANCE VIEW ──
   * Aggregates full-month quota achievement, net operating profit, monthly peak windows, and category breakdowns.
   */
  async getMonthlyPerformance(year: number, month: number, monthlyQuota = 0): Promise<MonthlyPerformanceResult> {
    const startDate = new Date(year, month, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const startStr = toLocalDateStr(startDate);
    const endStr = toLocalDateStr(endDate);
    const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(startDate);

    const [txs, attendance, anomalies, manualIncidents, finHealth] = await Promise.all([
      firstValueFrom(this.transactionService.getTransactions({ startDate, endDate, limit: 5000 })),
      this.attendanceService.getAttendanceRange(startStr, endStr),
      this.getSystemAnomalies(startDate, endDate),
      firstValueFrom(this.incidentService.getIncidentsByDateRange$(startStr, endStr)),
      this.financialAnalyticsService.analyzeFinancialHealth(startDate, endDate).catch(() => null)
    ]);

    const validTxs = txs.filter(t => t.status !== 'VOID');
    const totalRevenue = validTxs.reduce((sum, t) => sum + t.totalAmount, 0);
    const quotaProgressPct = monthlyQuota > 0 ? Math.min((totalRevenue / monthlyQuota) * 100, 100) : 0;

    // Projected Month-End (Run-Rate)
    const now = new Date();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let daysElapsed = daysInMonth;
    if (now.getFullYear() === year && now.getMonth() === month) {
      daysElapsed = Math.max(now.getDate(), 1);
    }
    const dailyPace = totalRevenue / daysElapsed;
    const projectedMonthEnd = Math.round(dailyPace * daysInMonth);

    // Peak Hours across the entire month
    const hourlyCounts = new Map<string, number>();
    let weekdayVisits = 0;
    let weekendVisits = 0;

    const uniqueMembers = new Set<string>();

    attendance.forEach(att => {
      uniqueMembers.add(att.memberId);
      if (att.checkInTime) {
        const dt = att.checkInTime instanceof Date ? att.checkInTime : new Date(att.checkInTime);
        const hr = dt.getHours().toString().padStart(2, '0') + ':00';
        hourlyCounts.set(hr, (hourlyCounts.get(hr) || 0) + 1);

        const dayOfWeek = dt.getDay(); // 0 is Sun, 6 is Sat
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          weekendVisits++;
        } else {
          weekdayVisits++;
        }
      }
    });

    const topPeakHours = Array.from(hourlyCounts.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const weekdayAvgCheckIns = Math.round(weekdayVisits / Math.max(daysElapsed * (5 / 7), 1));
    const weekendAvgCheckIns = Math.round(weekendVisits / Math.max(daysElapsed * (2 / 7), 1));

    // Revenue by Product Stream (Membership, PT, Walk-in, Retail)
    const streamMap = new Map<string, number>([
      ['Memberships', 0],
      ['Personal Training', 0],
      ['Daily Walk-Ins', 0],
      ['Supplements & Drinks', 0],
      ['Other Services', 0]
    ]);

    validTxs.forEach(t => {
      t.items.forEach(item => {
        const name = (item.productName || '').toLowerCase();
        if (name.includes('membership') || name.includes('annual') || name.includes('month')) {
          streamMap.set('Memberships', (streamMap.get('Memberships') || 0) + item.subtotal);
        } else if (name.includes('pt') || name.includes('training') || name.includes('session')) {
          streamMap.set('Personal Training', (streamMap.get('Personal Training') || 0) + item.subtotal);
        } else if (name.includes('walk-in') || name.includes('walkin') || name.includes('day pass')) {
          streamMap.set('Daily Walk-Ins', (streamMap.get('Daily Walk-Ins') || 0) + item.subtotal);
        } else if (name.includes('protein') || name.includes('creatine') || name.includes('water') || name.includes('drink') || name.includes('shake')) {
          streamMap.set('Supplements & Drinks', (streamMap.get('Supplements & Drinks') || 0) + item.subtotal);
        } else {
          streamMap.set('Other Services', (streamMap.get('Other Services') || 0) + item.subtotal);
        }
      });
    });

    const revenueByStream = Array.from(streamMap.entries())
      .map(([stream, total]) => ({
        stream,
        total,
        percentage: totalRevenue > 0 ? (total / totalRevenue) * 100 : 0
      }))
      .filter(s => s.total > 0)
      .sort((a, b) => b.total - a.total);

    // Incident Category Breakdown
    const catMap: Record<string, number> = {};
    manualIncidents.forEach(m => {
      catMap[m.category] = (catMap[m.category] || 0) + 1;
    });
    anomalies.forEach(a => {
      const cat = a.type === 'CASH_DISCREPANCY' ? 'CASH_FINANCIAL' : (a.type === 'STAFF_TARDINESS' ? 'STAFF_OPERATIONAL' : 'OTHER');
      catMap[cat] = (catMap[cat] || 0) + 1;
    });

    const totalIncidents = manualIncidents.length + anomalies.length;
    const resolvedCount = manualIncidents.filter(m => m.status === 'RESOLVED' || m.status === 'CLOSED').length + anomalies.filter(a => a.isResolved).length;

    // Member Retention & Lapsed Tracking (from local Dexie IndexedDB cache - 0 Firestore reads)
    let newMembersCount = 0;
    const unrenewedMembers: UnrenewedMember[] = [];
    let memLapsedCount = 0;
    let trainLapsedCount = 0;

    try {
      const allMembers = await firstValueFrom(this.memberRepository.getMembersLive());
      
      const toDate = (val: any): Date | null => {
        if (!val) return null;
        if (val instanceof Date) return val;
        if (val.toDate) return val.toDate();
        if (val.seconds) return new Date(val.seconds * 1000);
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
      };

      allMembers.forEach(m => {
        // Count new members created this month
        const createdDate = toDate(m.createdBy?.timestamp);
        if (createdDate && createdDate >= startDate && createdDate <= endDate) {
          newMembersCount++;
        }

        const memExp = toDate(m.membershipExpiration || m.expiration);
        const trainExp = toDate(m.trainingExpiration);

        const memLapsed = !!(memExp && memExp >= startDate && memExp <= endDate);
        const trainLapsed = !!(trainExp && trainExp >= startDate && trainExp <= endDate);

        if (memLapsed || trainLapsed) {
          let type: 'MEMBERSHIP' | 'TRAINING' | 'BOTH' = 'MEMBERSHIP';
          if (memLapsed && trainLapsed) {
            type = 'BOTH';
            memLapsedCount++;
            trainLapsedCount++;
          } else if (trainLapsed) {
            type = 'TRAINING';
            trainLapsedCount++;
          } else {
            memLapsedCount++;
          }

          const primaryExp = memLapsed ? memExp! : trainExp!;
          const daysAgo = Math.max(0, Math.floor((now.getTime() - primaryExp.getTime()) / (1000 * 60 * 60 * 24)));

          unrenewedMembers.push({
            memberId: m.id || '',
            memberName: m.name || 'Unknown Member',
            contactNumber: m.contactNumber || 'No Contact',
            type,
            membershipExpiration: memExp,
            trainingExpiration: trainExp,
            status: m.membershipStatus || 'Inactive',
            daysAgo
          });
        }
      });

      // Sort unrenewed by expiration date descending
      unrenewedMembers.sort((a, b) => {
        const tA = (a.membershipExpiration || a.trainingExpiration)?.getTime() || 0;
        const tB = (b.membershipExpiration || b.trainingExpiration)?.getTime() || 0;
        return tB - tA;
      });
    } catch (err) {
      console.warn('[ReportsService] Error querying member retention from Dexie:', err);
    }

    return {
      year,
      month,
      monthName,
      totalRevenue,
      monthlyQuota,
      quotaProgressPct,
      projectedMonthEnd,
      financialHealth: finHealth,
      totalCheckIns: attendance.length,
      uniqueVisitors: uniqueMembers.size,
      newMembersCount,
      weekdayAvgCheckIns,
      weekendAvgCheckIns,
      topPeakHours,
      revenueByStream,
      incidentAudit: {
        total: totalIncidents,
        byCategory: catMap,
        resolutionRatePct: totalIncidents > 0 ? Math.round((resolvedCount / totalIncidents) * 100) : 100
      },
      systemAnomalies: anomalies,
      manualIncidents,
      unrenewedSummary: {
        totalUnrenewed: unrenewedMembers.length,
        membershipLapsedCount: memLapsedCount,
        trainingLapsedCount: trainLapsedCount,
        members: unrenewedMembers
      }
    };
  }
}
