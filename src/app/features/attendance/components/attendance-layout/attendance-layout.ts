import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { CheckInKiosk } from '../check-in-kiosk/check-in-kiosk';
import { ActiveSessions } from '../active-sessions/active-sessions';
import { AttendanceHistory } from '../attendance-history/attendance-history';
import { AttendanceService } from '../../../../core/services/attendance.service';
import { fadeIn, staggerList } from '../../../../core/animations/animations';
import { Observable, map } from 'rxjs';

@Component({
  selector: 'app-attendance-layout',
  standalone: true,
  imports: [
    CommonModule, MatTabsModule, MatIconModule,
    CheckInKiosk, ActiveSessions, AttendanceHistory
  ],
  templateUrl: './attendance-layout.html',
  styleUrl: './attendance-layout.css',
  animations: [fadeIn, staggerList]
})
export class AttendanceLayout {
  private attendanceService = inject(AttendanceService);

  activeSessions$ = this.attendanceService.getActiveCheckIns();
  
  activeCount$: Observable<number> = this.activeSessions$.pipe(
    map(sessions => sessions.length)
  );

  availableLockers$: Observable<number> = this.activeSessions$.pipe(
    map(sessions => {
      const occupiedCount = sessions.filter(s => !!s.lockerNumber).length;
      return Math.max(0, 12 - occupiedCount);
    })
  );

  activeTab: 'kiosk' | 'active' | 'history' = 'kiosk';

  selectTab(tab: 'kiosk' | 'active' | 'history') {
    this.activeTab = tab;
  }
}
