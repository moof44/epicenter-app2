
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
import { AttendanceChart } from '../../../attendance/components/attendance-chart/attendance-chart';

@Component({
  selector: 'app-progress-dashboard',
  imports: [
    CommonModule, RouterLink, MatCardModule, MatTableModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, AttendanceChart
  ],
  templateUrl: './progress-dashboard.html',
  styleUrl: './progress-dashboard.css',
  animations: [fadeIn, staggerList]
})
export class ProgressDashboard implements OnInit {
  private route = inject(ActivatedRoute);
  private memberService = inject(MemberService);
  private progressService = inject(ProgressService);

  member$: Observable<Member | undefined> | undefined;
  measurements$: Observable<Measurement[]> | undefined;

  // Helpers for view
  latest$: Observable<Measurement | undefined> | undefined;
  previous$: Observable<Measurement | undefined> | undefined;
  diffs$: Observable<any> | undefined; // { weight: -2, bodyFat: -1.5 ... }

  memberId: string | null = null;
  historyColumns: string[] = ['date', 'weight', 'bodyFat', 'muscleMass', 'bmi'];

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
          bodyAge: curr.bodyAge - prev.bodyAge
        };
      })
    );
  }

  formatDiff(val: number): string {
    if (val > 0) return `+ ${val.toFixed(1)} `;
    return val.toFixed(1);
  }

  getDiffClass(key: string, val: number): string {
    // For weight/fat, negative is usually good (green), positive bad (red).
    // For muscle, positive is good.
    if (val === 0) return 'neutral';

    const isBadIfPositive = ['weight', 'bodyFat', 'visceralFat', 'bmi', 'bodyAge'].includes(key);

    if (isBadIfPositive) {
      return val < 0 ? 'good' : 'bad';
    } else {
      // Muscle, Metabolism
      return val > 0 ? 'good' : 'bad';
    }
  }
}
