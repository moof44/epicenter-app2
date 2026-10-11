# Implementation Plan: Multi-Cadence AI Report Export Engine (Daily, Weekly, Monthly)

**Document Reference**: `docs/ai-report-export-implementation-plan.md`  
**Related Discussion**: `docs/ai-report-export-discussion.md`  
**Status**: Ready for Implementation  
**Created Date**: September 29, 2026  
**Target Systems**: `gym-app` (`epicenter-app2`)

---

## 1. Objectives & Scope

Provide gym executives, managers, and operators the ability to export and copy high-density, AI-prompt-optimized operational and financial reports directly from the **Gym Performance & Operational Audit Hub** (`ReportsDashboardComponent`).

The engine supports:
1. **Three Cadences**:
   - **Daily Closeout**: Shifts, cash discrepancy, payment methods, voids, hourly traffic, incidents.
   - **Weekly Strategic Brief**: Pacing vs. prior week, rush/lull distribution, staff leaderboard, total check-ins.
   - **Monthly Executive Audit**: Quota progress, revenue streams, financial health (inflows vs. bills/expenses), member retention/churn, incident tallies.
2. **Three Export Modalities**:
   - 📥 **Download Markdown (`.md`)**: Prompt-engineered markdown with an embedded AI persona instruction ready to drag-and-drop into ChatGPT/Claude/Gemini.
   - 📋 **Copy to Clipboard**: Instant paste (`Ctrl+V`) into any LLM prompt box.
   - 💾 **Download Raw JSON (`.json`)**: Machine-readable data payload for programmatic analysis or custom Python scripts.

---

## 2. Architectural Blueprint

```
┌────────────────────────────────────────────────────────┐
│             ReportsDashboardComponent                  │
│  (Cadence: Daily | Weekly | Monthly | Custom)          │
│       ▲                                                │
│       │ binds to active report state                   │
│       ▼                                                │
│  [ Export for AI ] dropdown button                     │
│    ├── 📥 Download AI Markdown (.md)                   │
│    ├── 📋 Copy AI Prompt to Clipboard                  │
│    └── 💾 Download Raw JSON (.json)                    │
└───────────────────────┬────────────────────────────────┘
                        │ delegates to
                        ▼
┌────────────────────────────────────────────────────────┐
│            ReportAiExportService                       │
│  (src/app/core/services/report-ai-export.service.ts)   │
│                                                        │
│  - buildDailyAiMarkdown(DailyPerformanceResult)        │
│  - buildWeeklyAiMarkdown(WeeklyPerformanceResult)      │
│  - buildMonthlyAiMarkdown(MonthlyPerformanceResult)    │
│  - buildCustomAiMarkdown(...)                          │
│  - exportAsFile(content, filename, mimeType)           │
│  - copyToClipboard(content)                            │
└────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Technical Specifications

### A. New Service: `ReportAiExportService`
- **Location**: `src/app/core/services/report-ai-export.service.ts`
- **Injected Dependencies**: None (pure formatting and browser file/clipboard utilities).
- **Core Methods**:
  1. `exportReport(cadence: PerformanceCadence, data: any, format: 'MARKDOWN' | 'JSON' | 'CLIPBOARD'): Promise<void>`
  2. `formatDailyMarkdown(data: DailyPerformanceResult): string`
  3. `formatWeeklyMarkdown(data: WeeklyPerformanceResult): string`
  4. `formatMonthlyMarkdown(data: MonthlyPerformanceResult): string`
  5. `formatCustomMarkdown(data: any): string`
  6. `downloadFile(filename: string, content: string, mimeType: string): void`
  7. `copyToClipboard(text: string): Promise<boolean>`

### B. Prompt Engineering Architecture inside Markdown
Every exported markdown document will include a standardized preamble:
```markdown
# EPICENTER GYM - [CADENCE] OPERATIONAL & FINANCIAL AUDIT
**Date/Period**: [Formatted Period]
**Generated**: [Local Timestamp]
**System**: Epicenter Management OS v2.0

> **PROMPT FOR AI BUSINESS ANALYST**:
> You are an executive fitness gym consultant and financial auditor. Review the metrics below and provide:
> 1. **Executive Verdict & Operational Score (1-10)**: Summary of overall performance and red flags.
> 2. **Financial Integrity & Cash Handling**: Identify discrepancies, voids, payment distribution anomalies, and revenue risks.
> 3. **Traffic & Capacity Optimization**: Assess peak rush hours vs. lulls, overdue member checkouts, and staff allocations.
> 4. **Retention & Churn Strategy** (Monthly only): Actionable recovery tactics for lapsed members.
> 5. **Prioritized Action Plan**: 3-5 immediate steps the gym owner/manager must execute.
```

Followed by structured Markdown tables and bulleted sections:
- **Financial Breakdown**: Gross revenue, net revenue, payment mode splits (Cash, GCash, other), average ticket size.
- **Cash Register Integrity**: Shift count, total shortages, surpluses, net discrepancy, cashier operator.
- **Foot Traffic & Member Activity**: Check-ins, unique gym goers, peak hour vs. lull, overdue checkout sessions.
- **Workforce & Staff Performance**: Attributed sales, commission earned, punctuality/late minutes.
- **Top Product & Service Movers**: Units sold, category revenue.
- **System Anomalies & Incident Audit**: Unresolved cash variances, voided tickets, facility incidents with severity levels.

### C. File Naming Convention
- Daily: `Epicenter_Daily_Report_YYYY-MM-DD.md` (or `.json`)
- Weekly: `Epicenter_Weekly_Report_YYYY-WW_YYYY-MM-DD_to_YYYY-MM-DD.md`
- Monthly: `Epicenter_Monthly_Report_YYYY-MM.md`
- Custom: `Epicenter_Custom_Report_YYYY-MM-DD_to_YYYY-MM-DD.md`

### D. UI/UX Integration in `ReportsDashboardComponent`
- **Location**: In the header/period navigator bar of `src/app/features/reports/pages/reports-dashboard/reports-dashboard.html`.
- **UI Elements**:
  - A dedicated action button: `<button class="btn-export-ai" [matMenuTriggerFor]="aiMenu">`
  - Material Menu `<mat-menu #aiMenu="matMenu">`:
    - `📥 Download AI Markdown (.md)`
    - `📋 Copy Prompt for AI`
    - `💾 Download Raw Data (.json)`
  - Visual feedback: MatSnackBar confirmation upon clipboard copy or download initiation.
- **Responsive Protocol Compliance**:
  - Single full-width button on Mobile (< 640px).
  - Compact icon-with-text button on Tablet and Desktop (> 768px).
- **Design Token & Dark Contrast Compliance**:
  - Uses strictly defined CSS variables: `var(--color-primary)`, `var(--color-text-pure)`, `var(--color-border-subtle)`, `var(--color-gold-light)`.
  - Zero arbitrary pixel values or unstyled dark-on-dark text.

---

## 4. Phase-by-Phase Task Checklist

### Phase 1: Core Formatter Service (`ReportAiExportService`)
- [x] Create `src/app/core/services/report-ai-export.service.ts`
- [x] Implement `formatDailyMarkdown()` with prompt headers and structured tables.
- [x] Implement `formatWeeklyMarkdown()` with day-pace comparisons, busiest days, and staff leaderboard.
- [x] Implement `formatMonthlyMarkdown()` with quota tracking, stream breakdowns, and lapsed member summaries.
- [x] Implement browser file download helper (`Blob` -> `URL.createObjectURL`).
- [x] Implement clipboard copy utility (`navigator.clipboard.writeText`) with fallback.

### Phase 2: Dashboard Component Wiring & UI
- [x] Inject `ReportAiExportService` into `ReportsDashboardComponent` (`reports-dashboard.ts`).
- [x] Import `MatMenuModule` and necessary Material UI elements.
- [x] Implement component trigger methods:
  - `exportAiReport(format: 'MARKDOWN' | 'JSON' | 'CLIPBOARD')`
- [x] Update `reports-dashboard.html` to render the "Export for AI" action button and dropdown menu.
- [x] Update `reports-dashboard.css` using strict design system tokens (`var(--color-...)`).

### Phase 3: Mobile & Multi-Screen Responsive Optimization
- [x] Verify Mobile (< 640px) layout: full width or icon action in header without overflow.
- [x] Verify Tablet (640px–1024px) layout: side-by-side action button.
- [x] Verify Desktop (> 1024px) layout: high-visibility export group with quick tooltips.

### Phase 4: Quality Assurance & Build Verification
- [x] Test Daily Report export (Markdown, JSON, Clipboard).
- [x] Test Weekly Report export with valid date spans.
- [x] Test Monthly Report export with quota and churn lists.
- [x] Run full project compilation check: `npm run build` or `npx ng build`.
- [x] Audit changes for zero breaking modifications to existing check-in or booking workflows.

---

## 5. Safety, Non-Breaking & Compliance Guarantees

1. **Non-Invasive Architecture**: The export engine is strictly a read-only consumer of existing signals (`dailyData()`, `weeklyData()`, `monthlyData()`). It does not mutate or modify any Firestore collections, database transactions, or live queries.
2. **Kiosk & Service Integrity**: Zero modifications to kiosk check-in, POS checkout logic, or booking schedules.
3. **WCAG Dark Mode Compliance**: Follows the mandatory Zero Dark-on-Dark Text protocol with high-contrast text tokens (`var(--color-text-pure)` `#ffffff`, `var(--color-text-body)` `#e2e8f0`).
