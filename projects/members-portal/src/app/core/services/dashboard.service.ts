import { inject, Injectable, signal, computed, effect } from '@angular/core';
import { Firestore, doc, docData, collection, collectionData, query, where, orderBy, limit } from '@angular/fire/firestore';
import { AuthService } from '../auth/auth.service';
import { Observable, Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  readonly memberData = signal<any | null>(null);
  readonly measurements = signal<any[]>([]);
  readonly attendanceRecords = signal<any[]>([]);
  readonly loading = signal<boolean>(false);

  private docSub?: Subscription;
  private measurementsSub?: Subscription;
  private attendanceSub?: Subscription;

  constructor() {
    // Reload dashboard data reactively when the member profile is resolved
    effect(() => {
      const profile = this.authService.memberProfile();
      if (profile && profile.memberId) {
        this.loadAllData(profile.memberId);
      } else {
        this.clearData();
      }
    });
  }

  private clearData() {
    this.docSub?.unsubscribe();
    this.measurementsSub?.unsubscribe();
    this.attendanceSub?.unsubscribe();

    this.memberData.set(null);
    this.measurements.set([]);
    this.attendanceRecords.set([]);
    this.loading.set(false);
  }

  private loadAllData(memberId: string) {
    this.clearData();
    this.loading.set(true);

    let docLoaded = false;
    let measurementsLoaded = false;
    let attendanceLoaded = false;

    const checkFinished = () => {
      if (docLoaded && measurementsLoaded && attendanceLoaded) {
        this.loading.set(false);
      }
    };

    // 1. Fetch Member Document
    const memberDocRef = doc(this.firestore, `members/${memberId}`);
    this.docSub = (docData(memberDocRef, { idField: 'id' }) as Observable<any>).subscribe({
      next: (data) => {
        this.memberData.set(data || null);
        docLoaded = true;
        checkFinished();
      },
      error: (err) => {
        console.error('Error fetching member doc:', err);
        docLoaded = true;
        checkFinished();
      }
    });

    // 2. Fetch measurements collection
    const measurementsRef = collection(this.firestore, `members/${memberId}/measurements`);
    const measurementsQuery = query(measurementsRef, orderBy('date', 'desc'), limit(50));
    this.measurementsSub = (collectionData(measurementsQuery, { idField: 'id' }) as Observable<any[]>).subscribe({
      next: (data) => {
        const parsed = (data || []).map(m => ({
          ...m,
          date: m.date?.toDate ? m.date.toDate() : new Date(m.date)
        }));
        this.measurements.set(parsed);
        measurementsLoaded = true;
        checkFinished();
      },
      error: (err) => {
        console.error('Error fetching measurements:', err);
        measurementsLoaded = true;
        checkFinished();
      }
    });

    // 3. Fetch attendance
    const attendanceRef = collection(this.firestore, 'attendance');
    const attendanceQuery = query(
      attendanceRef,
      where('memberId', '==', memberId),
      orderBy('checkInTime', 'desc'),
      limit(100)
    );
    this.attendanceSub = (collectionData(attendanceQuery, { idField: 'id' }) as Observable<any[]>).subscribe({
      next: (data) => {
        const parsed = (data || []).map(a => ({
          ...a,
          checkInTime: a.checkInTime?.toDate ? a.checkInTime.toDate() : new Date(a.checkInTime),
          checkOutTime: a.checkOutTime?.toDate ? a.checkOutTime.toDate() : (a.checkOutTime ? new Date(a.checkOutTime) : undefined),
          memberExpiration: a.memberExpiration?.toDate ? a.memberExpiration.toDate() : (a.memberExpiration ? new Date(a.memberExpiration) : undefined)
        }));
        this.attendanceRecords.set(parsed);
        attendanceLoaded = true;
        checkFinished();
      },
      error: (err) => {
        console.error('Error fetching attendance records:', err);
        attendanceLoaded = true;
        checkFinished();
      }
    });
  }

  // Computed fields
  readonly membershipDaysLeft = computed(() => {
    const data = this.memberData();
    if (!data || !data.membershipExpiration) return 0;
    const expiry = data.membershipExpiration.toDate ? data.membershipExpiration.toDate() : new Date(data.membershipExpiration);
    const diffTime = expiry.getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  });

  readonly ptDaysLeft = computed(() => {
    const data = this.memberData();
    if (!data || !data.trainingExpiration) return 0;
    const expiry = data.trainingExpiration.toDate ? data.trainingExpiration.toDate() : new Date(data.trainingExpiration);
    const diffTime = expiry.getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  });

  readonly checkInStreak = computed(() => {
    const records = this.attendanceRecords();
    if (records.length === 0) return 0;

    const dates = Array.from(new Set(records.map(r => r.date))).sort().reverse();
    if (dates.length === 0) return 0;

    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayStr = formatDate(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);

    const lastCheckInDate = dates[0];
    if (lastCheckInDate !== todayStr && lastCheckInDate !== yesterdayStr) {
      return 0;
    }

    let streak = 0;
    const currentCheckDate = new Date(lastCheckInDate);

    while (true) {
      const expectedStr = formatDate(currentCheckDate);
      if (dates.includes(expectedStr)) {
        streak++;
        currentCheckDate.setDate(currentCheckDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  });

  readonly visitsThisMonth = computed(() => {
    const records = this.attendanceRecords();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return records.filter(r => {
      const date = r.checkInTime;
      return date && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length;
  });

  readonly latestMeasurement = computed(() => {
    const m = this.measurements();
    return m.length > 0 ? m[0] : null;
  });

  readonly somaticTrends = computed(() => {
    const m = this.measurements();
    if (m.length < 2) {
      return {
        weightDelta: 0,
        bodyFatDelta: 0,
        muscleMassDelta: 0
      };
    }
    const latest = m[0];
    const prev = m[1];
    return {
      weightDelta: (latest.weight || 0) - (prev.weight || 0),
      bodyFatDelta: (latest.bodyFat || 0) - (prev.bodyFat || 0),
      muscleMassDelta: (latest.muscleMass || 0) - (prev.muscleMass || 0)
    };
  });
}
