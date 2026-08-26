
import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Observable, combineLatest, map } from 'rxjs';
import { MemberService } from '../../../../core/services/member.service';
import { ProgressService } from '../../../../core/services/progress.service';
import { Member } from '../../../../core/models/member.model';
import { Measurement } from '../../../../core/models/measurement.model';
import { fadeIn, staggerList } from '../../../../core/animations/animations';
import { AttendanceCalendarComponent } from '../attendance-calendar/attendance-calendar';

@Component({
  selector: 'app-progress-dashboard',
  imports: [
    CommonModule, RouterLink, MatCardModule, MatTableModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule,
    MatSnackBarModule, AttendanceCalendarComponent
  ],
  templateUrl: './progress-dashboard.html',
  styleUrl: './progress-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeIn, staggerList]
})
export class ProgressDashboard implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private memberService = inject(MemberService);
  private progressService = inject(ProgressService);
  private snackBar = inject(MatSnackBar);

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
    'subcutaneousFatLegs', 'muscleLegs',
    'actions'
  ];

  ngOnInit() {
    this.memberId = this.route.snapshot.paramMap.get('id');
    if (!this.memberId) return;

    this.member$ = this.memberService.getMember(this.memberId);
    this.measurements$ = this.progressService.getTimeSeries(this.memberId);

    // Derived state
    this.latest$ = this.measurements$.pipe(map(list => list[0]));
    this.previous$ = this.measurements$.pipe(map(list => list[1]));

    const safeDiff = (a?: number, b?: number) => (a !== undefined && b !== undefined && a !== null && b !== null) ? a - b : null;

    this.diffs$ = combineLatest([this.latest$, this.previous$]).pipe(
      map(([curr, prev]) => {
        if (!curr || !prev) return null;
        return {
          weight: safeDiff(curr.weight, prev.weight),
          bodyFat: safeDiff(curr.bodyFat, prev.bodyFat),
          visceralFat: safeDiff(curr.visceralFat, prev.visceralFat),
          muscleMass: safeDiff(curr.muscleMass, prev.muscleMass),
          bmi: safeDiff(curr.bmi, prev.bmi),
          metabolism: safeDiff(curr.metabolism, prev.metabolism),
          bodyAge: safeDiff(curr.bodyAge, prev.bodyAge),
          height: safeDiff(curr.height, prev.height),
          subcutaneousFat: safeDiff(curr.subcutaneousFat, prev.subcutaneousFat),
          sinistralFatFull: safeDiff(curr.sinistralFatFull, prev.sinistralFatFull),
          muscleFull: safeDiff(curr.muscleFull, prev.muscleFull),
          subcutaneousFatArms: safeDiff(curr.subcutaneousFatArms, prev.subcutaneousFatArms),
          muscleArms: safeDiff(curr.muscleArms, prev.muscleArms),
          subcutaneousFatTrunk: safeDiff(curr.subcutaneousFatTrunk, prev.subcutaneousFatTrunk),
          muscleTrunk: safeDiff(curr.muscleTrunk, prev.muscleTrunk),
          subcutaneousFatLegs: safeDiff(curr.subcutaneousFatLegs, prev.subcutaneousFatLegs),
          muscleLegs: safeDiff(curr.muscleLegs, prev.muscleLegs)
        };
      })
    );
  }

  previewingImageUrl: string | null = null;

  openImagePreview(url: string): void {
    this.previewingImageUrl = url;
  }

  closeImagePreview(): void {
    this.previewingImageUrl = null;
  }

  formatDiff(val: number): string {
    if (val > 0) return `+ ${val.toFixed(1)} `;
    return val.toFixed(1);
  }

  getDiff(current: Measurement, next: Measurement | undefined, key: keyof Measurement): number | null {
    if (!next || current[key] === undefined || next[key] === undefined || current[key] === null || next[key] === null) return null;
    const currVal = Number(current[key]);
    const nextVal = Number(next[key]);
    if (isNaN(currVal) || isNaN(nextVal)) return null;
    return currVal - nextVal;
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

  editEntry(measurement: Measurement): void {
    if (!this.memberId || !measurement.id) return;
    this.router.navigate(['/members', this.memberId, 'progress', 'edit', measurement.id]);
  }

  async deleteEntry(measurement: Measurement): Promise<void> {
    if (!this.memberId || !measurement.id) return;

    try {
      const deletedDocId = await this.progressService.softDeleteEntry(this.memberId, measurement.id);

      const snackRef = this.snackBar.open('Entry deleted', 'Undo', { duration: 5000 });
      snackRef.onAction().subscribe(async () => {
        try {
          await this.progressService.restoreEntry(deletedDocId);
          this.snackBar.open('Entry restored', 'Close', { duration: 2000 });
        } catch (err: any) {
          this.snackBar.open('Restore failed: ' + err.message, 'Close', { duration: 3000 });
        }
      });
    } catch (err: any) {
      this.snackBar.open('Delete failed: ' + err.message, 'Close', { duration: 3000 });
    }
  }
}
