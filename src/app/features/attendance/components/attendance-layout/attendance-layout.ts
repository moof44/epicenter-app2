import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { CheckInKiosk } from '../check-in-kiosk/check-in-kiosk';
import { ActiveSessions } from '../active-sessions/active-sessions';
import { AttendanceHistory } from '../attendance-history/attendance-history';
import { fadeIn } from '../../../../core/animations/animations'; // Fixed path
import { TutorialService } from '../../../../core/services/tutorial.service';
import { TUTORIALS } from '../../../../core/constants/tutorials';

@Component({
  selector: 'app-attendance-layout',
  imports: [CommonModule, MatTabsModule, MatIconModule, CheckInKiosk, ActiveSessions, AttendanceHistory],
  /* v8 ignore start */
  templateUrl: './attendance-layout.html',
  /* v8 ignore end */
  styleUrl: './attendance-layout.css',
  animations: [fadeIn]
})
export class AttendanceLayout implements OnInit {
  private tutorialService = inject(TutorialService);

  ngOnInit(): void {
    setTimeout(() => {
      this.tutorialService.startTutorial(TUTORIALS['CHECKIN'].id);
    }, 1000);
  }
}

