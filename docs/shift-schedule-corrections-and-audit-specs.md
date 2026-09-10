# Shift Schedule Corrections & Database Synchronization Specs

## 1. Executive Summary & Root Cause Analysis
- **Incident Description**: The Executive Performance Dashboard under Daily Incidents auto-flagged:
  `Tardy Arrival: Kris Ragam Manuel (103m late) - Scheduled at 06:00, checked in at 07:42 AM.`
- **Gym Operating Hours**: Strictly **8:00 AM to 10:00 PM daily** (08:00 – 22:00). There is **no 6:00 AM shift** in the facility.
- **RCA Findings**:
  1. `src/app/core/services/shift-schedule.service.ts` had a legacy constant `DEFAULT_SHIFTS` where `opening` shift had `startTime: '06:00'`, `endTime: '13:00'`.
  2. In the Firestore `shift_definitions` collection, the manager had updated `Opening Shift` to `08:00 - 15:00` (8:00 AM – 3:00 PM), but fallback code and model comments retained `06:00`.
  3. A kiosk client session recorded `scheduledStartTime: '06:00'` for Kris Ragam Manuel on 2026-09-10 (arrival 7:42 AM), calculating `103` late minutes. In reality, Kris checked in 18 minutes early for his scheduled 8:00 AM Opening Shift.
  4. `src/app/core/services/reports.service.ts` calculated peak hours hourly distribution from `06:00` instead of the gym's opening time of `08:00`.

## 2. Shift Roster Synchronization
The active shifts in the database (Image 2) and their standard mappings:
- **Opening Shift (`opening`)**: `08:00` – `15:00` (8:00 AM – 3:00 PM, 7h) | Amber `#f59e0b`
- **Morning Shift (`morning`)**: `08:00` – `15:00` (8:00 AM – 3:00 PM, 7h) | Sky Blue `#0284c7`
- **Night / Closing Shift (`night`)**: `15:00` – `22:00` (3:00 PM – 10:00 PM, 7h) | Purple `#8b5cf6`
- **Flexible Shift (`flexible`)**: `Flexible (7 hrs)` | Emerald `#10b981`
- **Quality Control 1 (`custom_mter5qcp`)**: `14:00` – `21:00` (2:00 PM – 9:00 PM, 7h) | Slate `#64748b`
- **Quality Control 2 (`custom_mter62ms`)**: `14:00` – `22:00` (2:00 PM – 10:00 PM, 7h) | Slate `#64748b`

## 3. Implementation Steps
1. **Patch Firestore Attendance Doc `881B5bn9NRr2TbEatilN`**:
   - Set `scheduledStartTime: '08:00'`, `scheduledEndTime: '15:00'`, `shiftId: 'opening'`, `shiftName: 'Opening Shift'`, `lateMinutes: 0`, `earlyMinutes: 18`, `workedMinutes: 438`, `checkOutTime: '2026-09-10T07:00:00Z'`.
2. **Update Core Services & Models**:
   - `DEFAULT_SHIFTS` in `shift-schedule.service.ts`: `opening` `startTime: '08:00'`, `endTime: '15:00'`.
   - `DEFAULT_STAFF_SHIFTS` in `staff-attendance.service.ts`: `opening` and `morning` both `08:00` – `15:00`.
   - `reports.service.ts`: Hourly distribution starts at `08:00` up to `22:00`.
   - Defensive anomaly detection in `reports.service.ts`: If an attendance record has `scheduledStartTime === '06:00'`, recalculate against the true gym opening time `08:00`.
3. **Kiosk Shift Binding**:
   - Both `staff-kiosk.ts` and `staff-kiosk-dialog.ts` source shifts directly from `ShiftScheduleService.getShiftDefinitions()`.
   - `staff-kiosk-dialog.ts` auto-binds the staff member's assigned daily shift from `getTodayShiftForStaff(staffId)`.
4. **Verification**:
   - Run compilation check `npm run build`.
   - Verify that false tardiness disappears from `/reports`.
