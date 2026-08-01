import { inject, Injectable, signal, computed, effect } from '@angular/core';
import { Firestore, doc, docData, collection, collectionData, query, where, orderBy, limit, updateDoc, addDoc } from '@angular/fire/firestore';
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
  readonly recentTransactions = signal<any[]>([]);
  readonly userVouchers = signal<any[]>([]);
  readonly loading = signal<boolean>(false);

  private docSub?: Subscription;
  private measurementsSub?: Subscription;
  private attendanceSub?: Subscription;
  private transactionsSub?: Subscription;
  private vouchersSub?: Subscription;

  readonly pendingVouchers = computed(() => {
    return this.userVouchers().filter(v => v.status === 'PENDING_CLAIM');
  });

  readonly dailyQuests = computed(() => {
    const data = this.memberData();
    if (!data) return null;
    return data.dailyQuestsState || { date: '', completed: {} };
  });

  readonly gamification = computed(() => {
    const data = this.memberData();
    if (!data) return null;
    return data.gamification || { coins: 0, xp: 0, level: 1 };
  });

  getTodayDateString(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

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

    // Auto-reset daily quests in Firestore on a new day
    effect(() => {
      const data = this.memberData();
      if (data) {
        const todayStr = this.getTodayDateString();
        const state = data.dailyQuestsState || { date: '', completed: {} };
        if (!state.date || state.date !== todayStr) {
          this.updateDailyQuests({}, todayStr).catch(err => 
            console.error('Failed to auto-reset daily quests:', err)
          );
        }
      }
    });
  }

  private clearData() {
    this.docSub?.unsubscribe();
    this.measurementsSub?.unsubscribe();
    this.attendanceSub?.unsubscribe();
    this.transactionsSub?.unsubscribe();
    this.vouchersSub?.unsubscribe();

    this.memberData.set(null);
    this.measurements.set([]);
    this.attendanceRecords.set([]);
    this.recentTransactions.set([]);
    this.userVouchers.set([]);
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

    // 4. Fetch recent gamification transactions
    const txRef = collection(this.firestore, `members/${memberId}/transactions`);
    const txQuery = query(txRef, orderBy('timestamp', 'desc'), limit(10));
    this.transactionsSub = (collectionData(txQuery, { idField: 'id' }) as Observable<any[]>).subscribe({
      next: (data) => {
        const parsed = (data || []).map(t => ({
          ...t,
          timestamp: t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.timestamp)
        }));
        this.recentTransactions.set(parsed);
      },
      error: (err) => {
        console.error('Error fetching transactions:', err);
      }
    });

    // 5. Fetch Redemption Claim Vouchers
    const vouchersRef = collection(this.firestore, 'redemption_claims');
    const vouchersQuery = query(
      vouchersRef,
      where('memberId', '==', memberId),
      limit(50)
    );
    this.vouchersSub = (collectionData(vouchersQuery, { idField: 'id' }) as Observable<any[]>).subscribe({
      next: (data) => {
        const parsed = (data || [])
          .map(v => ({
            ...v,
            createdAt: v.createdAt?.toDate ? v.createdAt.toDate() : new Date(v.createdAt),
            expiresAt: v.expiresAt?.toDate ? v.expiresAt.toDate() : (v.expiresAt ? new Date(v.expiresAt) : null)
          }))
          .sort((a, b) => (b.createdAt?.getTime ? b.createdAt.getTime() : 0) - (a.createdAt?.getTime ? a.createdAt.getTime() : 0));

        this.userVouchers.set(parsed);
      },
      error: (err) => {
        console.error('Error fetching vouchers:', err);
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
    return this.memberData()?.attendanceStreak || 0;
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

    const getRoundDelta = (curr: number, prevVal: number): number => {
      const diff = curr - prevVal;
      return Math.round(diff * 10) / 10;
    };

    return {
      weightDelta: getRoundDelta(latest.weight || 0, prev.weight || 0),
      bodyFatDelta: getRoundDelta(latest.bodyFat || 0, prev.bodyFat || 0),
      muscleMassDelta: getRoundDelta(latest.muscleMass || 0, prev.muscleMass || 0)
    };
  });

  async updateEquippedBadges(equippedBadges: string[]): Promise<void> {
    const profile = this.authService.memberProfile();
    if (!profile || !profile.memberId) {
      throw new Error('No active member session found.');
    }
    const memberDocRef = doc(this.firestore, `members/${profile.memberId}`);
    return updateDoc(memberDocRef, { equippedBadges });
  }

  async updateDailyQuests(completed: { [key: string]: boolean }, dateStr: string): Promise<void> {
    const profile = this.authService.memberProfile();
    if (!profile || !profile.memberId) {
      throw new Error('No active member session found.');
    }
    const memberDocRef = doc(this.firestore, `members/${profile.memberId}`);
    return updateDoc(memberDocRef, {
      dailyQuestsState: {
        date: dateStr,
        completed
      }
    });
  }

  async saveCompletedWorkout(workoutData: any): Promise<void> {
    const profile = this.authService.memberProfile();
    if (!profile || !profile.memberId) {
      throw new Error('No active member session found.');
    }
    const memberId = profile.memberId;
    
    // 1. Save workout to members/{memberId}/workouts
    const workoutsRef = collection(this.firestore, `members/${memberId}/workouts`);
    await addDoc(workoutsRef, {
      ...workoutData,
      createdAt: new Date()
    });

    // 2. Compute/Update Personal Records (PRs)
    const currentMemberData = this.memberData() || {};
    const personalBests = { ...(currentMemberData.personalBests || {}) };
    let hasNewBests = false;

    // Check each completed set in the workout for a new PR
    workoutData.exercises.forEach((ex: any) => {
      ex.sets.forEach((set: any) => {
        if (set.completed && set.weight > 0) {
          const key = ex.name.toLowerCase().trim();
          const existing = personalBests[key];
          
          // A PR is achieved if no record exists, or weight is higher,
          // or if weight is equal but reps are higher.
          if (!existing || set.weight > existing.weight || (set.weight === existing.weight && set.reps > existing.reps)) {
            personalBests[key] = {
              weight: set.weight,
              reps: set.reps,
              date: workoutData.date // YYYY-MM-DD
            };
            hasNewBests = true;
          }
        }
      });
    });

    // Update member's document if there are new personal bests
    if (hasNewBests) {
      const memberDocRef = doc(this.firestore, `members/${memberId}`);
      await updateDoc(memberDocRef, { personalBests });
    }
  }
}
