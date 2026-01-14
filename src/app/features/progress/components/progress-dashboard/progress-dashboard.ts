
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable, combineLatest, map } from 'rxjs';
import { MemberService } from '../../../../core/services/member.service';
import { ProgressService } from '../../../../core/services/progress.service';
import { Member } from '../../../../core/models/member.model';
import { Measurement } from '../../../../core/models/measurement.model';
import { fadeIn, staggerList } from '../../../../core/animations/animations';
import { AttendanceCalendarComponent } from '../attendance-calendar/attendance-calendar';
import { TutorialService } from '../../../../core/services/tutorial.service';
import { TUTORIALS } from '../../../../core/constants/tutorials';

@Component({
  selector: 'app-progress-dashboard',
  imports: [
    CommonModule, RouterLink, MatCardModule, MatTableModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, AttendanceCalendarComponent
  ],
  templateUrl: './progress-dashboard.html',
  styleUrl: './progress-dashboard.css',
  animations: [fadeIn, staggerList]
})
export class ProgressDashboard implements OnInit {
  private route = inject(ActivatedRoute);
  private memberService = inject(MemberService);
  private progressService = inject(ProgressService);
  private tutorialService = inject(TutorialService);

  member$: Observable<Member | undefined> | undefined;
  measurements$: Observable<Measurement[]> | undefined;

  // Helpers for view
  latest$: Observable<Measurement | undefined> | undefined;
  previous$: Observable<Measurement | undefined> | undefined;
  diffs$: Observable<any> | undefined; // { weight: -2, bodyFat: -1.5 ... }

  memberId: string | null = null;
  historyColumns: string[] = [
    'date', 'height', 'weight', 'bodyFat', 'subcutaneousFat', 'visceralFat', 'muscleMass',
    'bmi', 'metabolism', 'bodyAge',
    'sinistralFatFull', 'muscleFull',
    'subcutaneousFatArms', 'muscleArms',
    'subcutaneousFatTrunk', 'muscleTrunk',
    'subcutaneousFatLegs', 'muscleLegs'
  ];

  ngOnInit() {
    this.memberId = this.route.snapshot.paramMap.get('id');
    if (!this.memberId) return;

    this.member$ = this.memberService.getMember(this.memberId);
    this.measurements$ = this.progressService.getTimeSeries(this.memberId);

    // Derived state
    this.latest$ = this.measurements$.pipe(map(list => list[0]));
    this.previous$ = this.measurements$.pipe(map(list => list[1]));

    this.diffs$ = combineLatest([this.latest$, this.previous$]).pipe(
      map(([curr, prev]) => {
        if (!curr || !prev) return null;
        return {
          weight: curr.weight - prev.weight,
          bodyFat: curr.bodyFat - prev.bodyFat,
          visceralFat: curr.visceralFat - prev.visceralFat,
          muscleMass: curr.muscleMass - prev.muscleMass,
          bmi: curr.bmi - prev.bmi,
          metabolism: curr.metabolism - prev.metabolism,
          bodyAge: curr.bodyAge - prev.bodyAge,
          height: curr.height - prev.height,
          subcutaneousFat: curr.subcutaneousFat - prev.subcutaneousFat,
          sinistralFatFull: curr.sinistralFatFull - prev.sinistralFatFull,
          muscleFull: curr.muscleFull - prev.muscleFull,
          subcutaneousFatArms: curr.subcutaneousFatArms - prev.subcutaneousFatArms,
          muscleArms: curr.muscleArms - prev.muscleArms,
          subcutaneousFatTrunk: curr.subcutaneousFatTrunk - prev.subcutaneousFatTrunk,
          muscleTrunk: curr.muscleTrunk - prev.muscleTrunk,
          subcutaneousFatLegs: curr.subcutaneousFatLegs - prev.subcutaneousFatLegs,
          muscleLegs: curr.muscleLegs - prev.muscleLegs
        };
      })
    );

    setTimeout(() => {
      this.tutorialService.startTutorial(TUTORIALS['MEMBER_PROGRESS'].id);
    }, 1000);
  }

  formatDiff(val: number): string {
    if (val > 0) return `+ ${val.toFixed(1)} `;
    return val.toFixed(1);
  }

  getDiff(current: Measurement, next: Measurement | undefined, key: keyof Measurement): number | null {
    if (!next || current[key] === undefined || next[key] === undefined) return null;
    return (current[key] as number) - (next[key] as number);
  }

  getDiffClass(key: string, val: number): string {
    // For weight/fat, negative is usually good (green), positive bad (red).
    // For muscle, positive is good.
    if (val === 0) return 'neutral';

    const isBadIfPositive = ['weight', 'bodyFat', 'visceralFat', 'bmi', 'bodyAge', 'subcutaneousFat', 'sinistralFatFull',
      'subcutaneousFatArms', 'subcutaneousFatTrunk', 'subcutaneousFatLegs'].includes(key);

    if (isBadIfPositive) {
      return val < 0 ? 'good' : 'bad';
    } else {
      // Muscle, Metabolism
      return val > 0 ? 'good' : 'bad';
    }
  }
}
