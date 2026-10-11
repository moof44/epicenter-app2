import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy
} from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const firebaseConfig = {
  apiKey: "AIzaSyAhF7a2tBc_97v1_sUcWJ6gI__UuAYUMMo",
  authDomain: "epicenter-app.firebaseapp.com",
  projectId: "epicenter-app",
  storageBucket: "epicenter-app.firebasestorage.app",
  messagingSenderId: "190360788968",
  appId: "1:190360788968:web:cd81299c5a956b0f480e5d",
  measurementId: "G-5JEWL7H5H5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface WeekSlot {
  weekNum: number;
  monday: Date;
  sunday: Date;
  startStr: string;
  endStr: string;
}

// Generate weeks from May 2026 up to last complete week (ending Sept 27, 2026)
function generateWeeks(): WeekSlot[] {
  const weeks: WeekSlot[] = [];
  // May 1, 2026 was Friday. Monday of that week was April 27, or first full Monday May 4.
  // Let's start with Monday May 4, 2026 (or May 1st week). Let's use Monday May 4, 2026.
  let curMonday = new Date(2026, 4, 4, 0, 0, 0, 0); // May 4, 2026
  const lastSunday = new Date(2026, 8, 27, 23, 59, 59, 999); // Sunday, Sep 27, 2026

  let count = 1;
  while (curMonday <= lastSunday) {
    const curSunday = new Date(curMonday);
    curSunday.setDate(curMonday.getDate() + 6);
    curSunday.setHours(23, 59, 59, 999);

    weeks.push({
      weekNum: count++,
      monday: new Date(curMonday),
      sunday: curSunday,
      startStr: toLocalDateStr(curMonday),
      endStr: toLocalDateStr(curSunday)
    });

    curMonday.setDate(curMonday.getDate() + 7);
  }
  return weeks;
}

async function fetchWeeklyData(startDate: Date, endDate: Date) {
  const startStr = toLocalDateStr(startDate);
  const endStr = toLocalDateStr(endDate);

  const priorStart = new Date(startDate);
  priorStart.setDate(priorStart.getDate() - 7);
  const priorEnd = new Date(endDate);
  priorEnd.setDate(priorEnd.getDate() - 7);

  // 1. Transactions (current week and prior week)
  const txCol = collection(db, 'transactions');
  const curTxQ = query(
    txCol,
    where('date', '>=', Timestamp.fromDate(startDate)),
    where('date', '<=', Timestamp.fromDate(endDate))
  );
  const prevTxQ = query(
    txCol,
    where('date', '>=', Timestamp.fromDate(priorStart)),
    where('date', '<=', Timestamp.fromDate(priorEnd))
  );

  // 2. Attendance
  const attCol = collection(db, 'attendance');
  const attQ = query(
    attCol,
    where('date', '>=', startStr),
    where('date', '<=', endStr)
  );

  // 3. Shifts
  const shiftsCol = collection(db, 'shifts');
  const shiftsQ = query(
    shiftsCol,
    where('startTime', '>=', Timestamp.fromDate(startDate)),
    where('startTime', '<=', Timestamp.fromDate(endDate))
  );

  // 4. Incidents
  const incCol = collection(db, 'incidents');
  const incQ = query(
    incCol,
    where('dateStr', '>=', startStr),
    where('dateStr', '<=', endStr)
  );

  const [curTxSnap, prevTxSnap, attSnap, shiftsSnap, incSnap] = await Promise.all([
    getDocs(curTxQ).catch(() => ({ docs: [] } as any)),
    getDocs(prevTxQ).catch(() => ({ docs: [] } as any)),
    getDocs(attQ).catch(() => ({ docs: [] } as any)),
    getDocs(shiftsQ).catch(() => ({ docs: [] } as any)),
    getDocs(incQ).catch(() => ({ docs: [] } as any))
  ]);

  const curTxs = curTxSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  const prevTxs = prevTxSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  const attendance = attSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  const shifts = shiftsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  const incidents = incSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

  // Financial calculations
  const validCurTxs = curTxs.filter((t: any) => t.status !== 'VOID');
  const validPrevTxs = prevTxs.filter((t: any) => t.status !== 'VOID');

  const totalRevenue = validCurTxs.reduce((sum: number, t: any) => sum + (t.totalAmount || t.total || 0), 0);
  const prevWeekRevenue = validPrevTxs.reduce((sum: number, t: any) => sum + (t.totalAmount || t.total || 0), 0);
  const growthPct = prevWeekRevenue > 0 ? ((totalRevenue - prevWeekRevenue) / prevWeekRevenue) * 100 : null;

  // Day pace
  const dayPaceMap = new Map<string, { dayName: string; currentSales: number; prevSales: number }>();
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dStr = toLocalDateStr(d);
    dayPaceMap.set(dStr, { dayName: dayNames[i], currentSales: 0, prevSales: 0 });
  }

  validCurTxs.forEach((t: any) => {
    const dt = t.date?.toDate ? t.date.toDate() : new Date(t.date);
    const dStr = toLocalDateStr(dt);
    if (dayPaceMap.has(dStr)) {
      dayPaceMap.get(dStr)!.currentSales += (t.totalAmount || t.total || 0);
    }
  });

  validPrevTxs.forEach((t: any) => {
    const dt = t.date?.toDate ? t.date.toDate() : new Date(t.date);
    const shifted = new Date(dt);
    shifted.setDate(shifted.getDate() + 7);
    const dStr = toLocalDateStr(shifted);
    if (dayPaceMap.has(dStr)) {
      dayPaceMap.get(dStr)!.prevSales += (t.totalAmount || t.total || 0);
    }
  });

  // Foot traffic
  const hourlyCounts = new Map<string, number>();
  for (let h = 8; h <= 22; h++) {
    hourlyCounts.set(h.toString().padStart(2, '0') + ':00', 0);
  }

  const dailyVisitCounts = new Map<string, number>();
  const weeklyActiveMembersSet = new Set<string>();

  attendance.forEach((att: any) => {
    if (att.memberId) weeklyActiveMembersSet.add(att.memberId);
    dailyVisitCounts.set(att.date, (dailyVisitCounts.get(att.date) || 0) + 1);

    if (att.checkInTime) {
      const dt = att.checkInTime?.toDate ? att.checkInTime.toDate() : new Date(att.checkInTime);
      const hr = dt.getHours().toString().padStart(2, '0') + ':00';
      if (hourlyCounts.has(hr)) {
        hourlyCounts.set(hr, (hourlyCounts.get(hr) || 0) + 1);
      }
    }
  });

  let busiestDayName = 'N/A';
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

  // Net Cash Discrepancy from shifts
  let netCashDiscrepancy = 0;
  shifts.forEach((s: any) => {
    if (s.status === 'CLOSED') {
      netCashDiscrepancy += Number(s.difference || 0);
    }
  });

  // Staff Leaderboard
  const staffMap = new Map<string, { totalSales: number; totalCommission: number }>();
  validCurTxs.forEach((t: any) => {
    const sName = t.attributedStaffName || t.staffName || 'Front Desk / Cashier';
    const amt = t.totalAmount || t.total || 0;
    const entry = staffMap.get(sName) || { totalSales: 0, totalCommission: 0 };
    entry.totalSales += amt;
    staffMap.set(sName, entry);
  });

  const staffLeaderboard = Array.from(staffMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.totalSales - a.totalSales);

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
    weeklyActiveMembers: weeklyActiveMembersSet.size,
    totalCheckIns: attendance.length,
    netCashDiscrepancy,
    staffLeaderboard,
    incidentsTotal: incidents.length,
    incidentsResolved: incidents.filter((i: any) => i.status === 'RESOLVED' || i.status === 'CLOSED').length,
    manualIncidents: incidents
  };
}

function renderWeeklyMarkdown(w: any): string {
  const timestamp = new Date().toLocaleString();
  const growthStr = w.growthPct !== null ? `${w.growthPct >= 0 ? '+' : ''}${w.growthPct.toFixed(1)}%` : 'N/A';

  const dayPaceTable = w.dayPace.map((dp: any) => {
    const pacePct = dp.prevSales > 0 ? (((dp.currentSales - dp.prevSales) / dp.prevSales) * 100).toFixed(1) + '%' : 'N/A';
    return `| ${dp.dayName} (${dp.dateStr}) | ₱${dp.currentSales.toLocaleString('en-US', { minimumFractionDigits: 2 })} | ₱${dp.prevSales.toLocaleString('en-US', { minimumFractionDigits: 2 })} | ${pacePct} |`;
  }).join('\n');

  const leaderboardLines = w.staffLeaderboard.length > 0
    ? w.staffLeaderboard.map((s: any, idx: number) => `${idx + 1}. **${s.name}**: Sales ₱${s.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })} | Comm. ₱${s.totalCommission.toLocaleString('en-US', { minimumFractionDigits: 2 })}`).join('\n')
    : '_No staff sales recorded this week._';

  const incidentLines = w.manualIncidents.length > 0
    ? w.manualIncidents.map((m: any) => `- **[${m.severity || 'MEDIUM'}] [${m.status || 'OPEN'}]**: ${m.title || 'Incident'} - ${m.description || ''}`).join('\n')
    : '_Zero incidents reported. Clean operational week._';

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
- **Peak Rush Hour**: ${w.peakRushHour.hour} (~${w.peakRushHour.avgCount} visitors avg)
- **Lull / Slow Hour**: ${w.lullHour.hour} (~${w.lullHour.avgCount} visitors avg)

## 3. STAFF SALES LEADERBOARD
${leaderboardLines}

## 4. OPERATIONAL INCIDENTS & SAFETY TALLY
- **Total Logged Incidents**: ${w.incidentsTotal}
  - Resolved: ${w.incidentsResolved}
  - Open / Under Investigation: ${w.incidentsTotal - w.incidentsResolved}

## 5. FLAGGED INCIDENTS & DETAILS
${incidentLines}
`;
}

async function main() {
  const weeks = generateWeeks();
  const outDir = path.join(process.cwd(), 'reports_output', 'weekly');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log(`Processing ${weeks.length} weeks from May 2026 to last week (${weeks[0].startStr} to ${weeks[weeks.length - 1].endStr})...`);

  for (const w of weeks) {
    try {
      const data = await fetchWeeklyData(w.monday, w.sunday);
      const markdown = renderWeeklyMarkdown(data);
      const filename = `Epicenter_Weekly_Report_${w.startStr}_to_${w.endStr}.md`;
      const filePath = path.join(outDir, filename);
      fs.writeFileSync(filePath, markdown, 'utf-8');
      console.log(`✓ Generated ${filename} (Revenue: ₱${data.totalRevenue.toFixed(2)}, Visits: ${data.totalCheckIns})`);
    } catch (err) {
      console.error(`✗ Error generating week ${w.startStr} to ${w.endStr}:`, err);
    }
  }

  console.log('\nAll weekly reports successfully extracted and saved to reports_output/weekly!');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal extraction error:', err);
  process.exit(1);
});
