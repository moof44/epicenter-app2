import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { CheckInKiosk } from '../check-in-kiosk/check-in-kiosk';
import { ActiveSessions } from '../active-sessions/active-sessions';
import { AttendanceHistory } from '../attendance-history/attendance-history';
import { fadeIn } from '../../../../core/animations/animations'; // Fixed path

@Component({
  selector: 'app-attendance-layout',
  imports: [CommonModule, MatTabsModule, CheckInKiosk, ActiveSessions, AttendanceHistory],
  /* v8 ignore start */
  template: `
    <div class="page-container" [@fadeIn]>
      <div class="header">
        <h1>Attendance Management</h1>
      </div>
      
      <mat-tab-group>
        <mat-tab label="Kiosk Check-in">
          <div class="tab-content">
             <app-check-in-kiosk></app-check-in-kiosk>
          </div>
        </mat-tab>
        <mat-tab label="Active Sessions">
           <div class="tab-content">
             <app-active-sessions></app-active-sessions>
           </div>
        </mat-tab>
         <mat-tab label="History">
           <div class="tab-content">
             <app-attendance-history></app-attendance-history>
           </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  /* v8 ignore end */
  styles: [`
    .page-container { 
      /* Removing padding and max-width to match Members layout */
    }
    .header { margin-bottom: var(--spacing-md); }
    .tab-content { padding-top: var(--spacing-xl); }
  `],
  animations: [fadeIn]
})
export class AttendanceLayout {}
