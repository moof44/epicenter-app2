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

export interface TransformationStats {
  title: string;
  subtitle: string;
  badge: string;
  icon: string;
  energyLevel: 'fire' | 'momentum' | 'fresh';
  netMuscle: number | null;
  netFat: number | null;
  netWeight: number | null;
  bioAgeYounger: number | null;
}

@Component({
  selector: 'app-progress-dashboard',
  standalone: true,
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

  latest$: Observable<Measurement | undefined> | undefined;
  previous$: Observable<Measurement | undefined> | undefined;
  diffs$: Observable<any> | undefined;
  transformation$: Observable<TransformationStats | null> | undefined;

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

  previewingImageUrl: string | null = null;

  ngOnInit() {
    this.memberId = this.route.snapshot.paramMap.get('id');
    if (!this.memberId) return;

    this.member$ = this.memberService.getMember(this.memberId);
    this.measurements$ = this.progressService.getTimeSeries(this.memberId);

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

    // Calculate transformation motivation stats
    this.transformation$ = combineLatest([this.measurements$, this.member$]).pipe(
      map(([list, member]) => {
        if (!list || list.length === 0) return null;
        const latest = list[0];
        const oldest = list[list.length - 1];

        const netMuscle = (latest.muscleMass !== undefined && oldest.muscleMass !== undefined) ? latest.muscleMass - oldest.muscleMass : null;
        const netFat = (latest.bodyFat !== undefined && oldest.bodyFat !== undefined) ? latest.bodyFat - oldest.bodyFat : null;
        const netWeight = (latest.weight !== undefined && oldest.weight !== undefined) ? latest.weight - oldest.weight : null;
        
        let bioAgeYounger: number | null = null;
        if (latest.bodyAge && member?.birthday) {
          try {
            const birth = new Date(member.birthday);
            const ageDiffMs = Date.now() - birth.getTime();
            const chronologicalAge = Math.floor(ageDiffMs / (365.25 * 24 * 60 * 60 * 1000));
            if (chronologicalAge > latest.bodyAge) {
              bioAgeYounger = chronologicalAge - latest.bodyAge;
            }
          } catch {}
        }

        // Tiered emotional coaching
        let energyLevel: 'fire' | 'momentum' | 'fresh' = 'fresh';
        let title = 'Transformation Journey Underway';
        let subtitle = 'Consistent checkups build long-term athletic momentum and metabolic vitality.';
        let badge = 'Active Athlete';
        let icon = 'local_fire_department';

        if ((netMuscle !== null && netMuscle > 0) || (netFat !== null && netFat < 0)) {
          energyLevel = 'fire';
          title = '🔥 BEAST MODE ACTIVATED!';
          subtitle = 'Outstanding transformation! Muscle gains and fat burn are firing on all cylinders.';
          badge = 'Victory In Progress';
          icon = 'military_tech';
        } else if (list.length > 1) {
          energyLevel = 'momentum';
          title = '⚡ Consistent Warrior';
          subtitle = 'Every checkup refines your baseline. Keep the nutrition and training locked in!';
          badge = 'Momentum Builder';
          icon = 'bolt';
        }

        return {
          title,
          subtitle,
          badge,
          icon,
          energyLevel,
          netMuscle,
          netFat,
          netWeight,
          bioAgeYounger
        };
      })
    );
  }

  getMemberInitials(name?: string): string {
    if (!name) return 'MB';
    return name
      .split(' ')
      .filter(p => p.length > 0)
      .slice(0, 2)
      .map(p => p[0].toUpperCase())
      .join('');
  }

  getBodyFatTier(bf?: number, gender?: string): string {
    if (!bf) return 'General';
    if (bf < 14) return 'Athletic Zone';
    if (bf <= 19) return 'Fitness Zone';
    if (bf <= 24) return 'Healthy Zone';
    return 'Optimization';
  }

  getVisceralFatTier(vf?: number): string {
    if (!vf) return 'Normal';
    if (vf <= 4) return 'Optimal Health';
    if (vf <= 9) return 'Safe Range';
    return 'Attention Needed';
  }

  openImagePreview(url: string): void {
    this.previewingImageUrl = url;
  }

  closeImagePreview(): void {
    this.previewingImageUrl = null;
  }

  formatDiff(val: number): string {
    if (val > 0) return `+${val.toFixed(1)}`;
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
    if (val === 0) return 'diff-neutral';
    const isBadIfPositive = [
      'weight', 'bodyFat', 'visceralFat', 'bmi', 'bodyAge', 'subcutaneousFat', 'sinistralFatFull',
      'subcutaneousFatArms', 'subcutaneousFatTrunk', 'subcutaneousFatLegs'
    ].includes(key);

    if (isBadIfPositive) {
      return val < 0 ? 'diff-good' : 'diff-bad';
    } else {
      return val > 0 ? 'diff-good' : 'diff-bad';
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
      const snackRef = this.snackBar.open('Progress entry deleted', 'Undo', { duration: 5000 });
      snackRef.onAction().subscribe(async () => {
        try {
          await this.progressService.restoreEntry(deletedDocId);
          this.snackBar.open('Progress entry restored', 'Close', { duration: 2000 });
        } catch (err: any) {
          this.snackBar.open('Restore failed: ' + err.message, 'Close', { duration: 3000 });
        }
      });
    } catch (err: any) {
      this.snackBar.open('Delete failed: ' + err.message, 'Close', { duration: 3000 });
    }
  }
}
