import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  writeBatch,
  query,
  where,
  orderBy,
  collectionData,
  docData,
  getDocs,
  getDoc,
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { AppIndexedDbService } from './dexie/app-indexeddb.service';
import { Member } from '../models/member.model';
import {
  CallCampaign,
  CallCampaignItem,
  CampaignFilterCriteria,
  CallStatus,
  ContactChannel,
  AttemptLog,
  PriorityLevel,
  MemberCallSnapshot,
} from '../models/customer-care.model';

@Injectable({
  providedIn: 'root'
})
export class CustomerCareService {
  private firestore = inject(Firestore);
  private dexieService = inject(AppIndexedDbService);

  private readonly campaignsCollection = collection(this.firestore, 'call_campaigns');
  private readonly itemsCollection = collection(this.firestore, 'call_campaign_items');

  // ══════════════════════════════════════════════════════════════
  // 1. DEXIE LOCAL FILTER ENGINE (0 FIRESTORE READS)
  // ══════════════════════════════════════════════════════════════

  /**
   * Filter members locally in Dexie IndexedDB memory for ultra-fast, 0-cost list generation.
   */
  async filterMembersLocally(criteria: CampaignFilterCriteria): Promise<MemberCallSnapshot[]> {
    if (!this.dexieService.members) {
      return [];
    }

    const allMembers: Member[] = await this.dexieService.members.toArray();
    const now = new Date();
    const todayMs = now.getTime();

    // Load recent call campaign items to exclude recently contacted if required
    const recentlyContactedIds = new Set<string>();
    if (criteria.excludeContactedWithinDays && criteria.excludeContactedWithinDays > 0) {
      try {
        const thresholdDate = new Date(todayMs - criteria.excludeContactedWithinDays * 86400000).toISOString();
        const q = query(
          this.itemsCollection,
          where('isContacted', '==', true),
          where('calledAt', '>=', thresholdDate)
        );
        const snap = await getDocs(q);
        snap.forEach((d) => {
          const item = d.data() as CallCampaignItem;
          if (item.memberId) recentlyContactedIds.add(item.memberId);
        });
      } catch (e) {
        console.warn('Could not query recent contacts for exclusion:', e);
      }
    }

    const results: MemberCallSnapshot[] = [];

    for (const m of allMembers) {
      const memberId = m.id || '';
      if (!memberId) continue;

      // 1. Safety Exclusions
      const tags = m.tags || [];
      const isDoNotContact = tags.some((t) => t.toLowerCase() === 'do_not_contact' || t.toLowerCase() === 'do not contact');
      if (criteria.excludeDoNotContact && isDoNotContact) {
        continue;
      }

      if (recentlyContactedIds.has(memberId)) {
        continue;
      }

      // 2. Gender Filter
      if (criteria.gender && criteria.gender !== 'ALL') {
        if (m.gender !== criteria.gender) continue;
      }

      // 3. Goal Keyword Filter
      if (criteria.goalKeyword && criteria.goalKeyword.trim()) {
        const kw = criteria.goalKeyword.toLowerCase().trim();
        const goal = (m.goal || '').toLowerCase();
        if (!goal.includes(kw)) continue;
      }

      // 4. Membership Status Filter
      if (criteria.membershipStatuses && criteria.membershipStatuses.length > 0) {
        const currentStatus = m.membershipStatus || 'Inactive';
        if (!criteria.membershipStatuses.includes(currentStatus)) {
          continue;
        }
      }

      // Expiration calculations
      const rawExp = m.membershipExpiration || m.expiration;
      let expDate: Date | null = null;
      let daysUntilOrSinceExp: number | null = null;

      if (rawExp) {
        expDate = (rawExp as any)?.toDate ? (rawExp as any).toDate() : new Date(rawExp);
        if (expDate && !isNaN(expDate.getTime())) {
          const diffMs = expDate.getTime() - todayMs;
          daysUntilOrSinceExp = Math.round(diffMs / 86400000);
        }
      }

      // 5. Expiring within Days (e.g. 1 to 7 days in future)
      if (criteria.expiringWithinDays != null) {
        if (daysUntilOrSinceExp === null) continue;
        // Expiring in [0, criteria.expiringWithinDays]
        if (daysUntilOrSinceExp < 0 || daysUntilOrSinceExp > criteria.expiringWithinDays) {
          continue;
        }
      }

      // 6. Expired Days Range (e.g. 1 to 30 days ago, or > 30 days ago)
      if (criteria.expiredDaysMin != null || criteria.expiredDaysMax != null) {
        if (daysUntilOrSinceExp === null) continue;
        // Lapsed means daysUntilOrSinceExp is negative
        const daysExpired = Math.abs(daysUntilOrSinceExp);
        if (daysUntilOrSinceExp > 0) continue; // Not expired yet

        if (criteria.expiredDaysMin != null && daysExpired < criteria.expiredDaysMin) continue;
        if (criteria.expiredDaysMax != null && daysExpired > criteria.expiredDaysMax) continue;
      }

      // 7. Personal Training (PT) Status Filter
      const rawPtExp = m.trainingExpiration;
      let ptExpDate: Date | null = null;
      let daysUntilOrSincePtExp: number | null = null;
      let hasActivePt = false;

      if (rawPtExp) {
        ptExpDate = (rawPtExp as any)?.toDate ? (rawPtExp as any).toDate() : new Date(rawPtExp);
        if (ptExpDate && !isNaN(ptExpDate.getTime())) {
          const diffPtMs = ptExpDate.getTime() - todayMs;
          daysUntilOrSincePtExp = Math.round(diffPtMs / 86400000);
          hasActivePt = daysUntilOrSincePtExp >= 0;
        }
      }

      if (criteria.trainingStatus && criteria.trainingStatus !== 'ANY') {
        if (criteria.trainingStatus === 'ACTIVE_PT' && !hasActivePt) continue;
        if (criteria.trainingStatus === 'NO_PT' && hasActivePt) continue;
        if (criteria.trainingStatus === 'EXPIRED_PT' && (hasActivePt || daysUntilOrSincePtExp === null)) continue;
        if (criteria.trainingStatus === 'EXPIRING_PT') {
          if (!hasActivePt || daysUntilOrSincePtExp === null) continue;
          const limit = criteria.trainingExpiringWithinDays ?? 7;
          if (daysUntilOrSincePtExp > limit) continue;
        }
      }

      // Extract First Name cleanly
      const fullName = (m.name || '').trim();
      const firstName = fullName.split(' ')[0] || 'Member';

      // Build member snapshot
      const snapshot: MemberCallSnapshot = {
        id: memberId,
        name: fullName,
        firstName,
        contactNumber: m.contactNumber || '',
        gender: m.gender,
        fitnessGoal: m.goal || 'General Fitness',
        membershipStatus: m.membershipStatus || 'Inactive',
        membershipExpiration: expDate ? expDate.toISOString().split('T')[0] : null,
        daysUntilOrSinceExpiration: daysUntilOrSinceExp,
        trainingExpiration: ptExpDate ? ptExpDate.toISOString().split('T')[0] : null,
        daysUntilOrSinceTrainingExpiration: daysUntilOrSincePtExp,
        hasActivePt,
        tags: m.tags || [],
        remarks: m.remarks || ''
      };

      results.push(snapshot);
    }

    return results;
  }

  // ══════════════════════════════════════════════════════════════
  // 2. FIRESTORE CAMPAIGNS & ITEMS MANAGEMENT
  // ══════════════════════════════════════════════════════════════

  getCampaignsLive(): Observable<CallCampaign[]> {
    const q = query(this.campaignsCollection, orderBy('createdAt', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<CallCampaign[]>;
  }

  getCampaignLive(campaignId: string): Observable<CallCampaign | null> {
    const d = doc(this.firestore, `call_campaigns/${campaignId}`);
    return docData(d, { idField: 'id' }) as Observable<CallCampaign | null>;
  }

  getCampaignItemsLive(campaignId: string): Observable<CallCampaignItem[]> {
    const q = query(
      this.itemsCollection,
      where('campaignId', '==', campaignId)
    );
    return (collectionData(q, { idField: 'id' }) as Observable<CallCampaignItem[]>).pipe(
      map((items) => {
        // Sort in memory: Priority (1=HIGH, 2=NORMAL, 3=LOW), then Uncontacted first, then Name
        return items.sort((a, b) => {
          if (a.isContacted !== b.isContacted) {
            return a.isContacted ? 1 : -1;
          }
          if (a.priority !== b.priority) {
            return a.priority - b.priority;
          }
          return (a.memberSnapshot?.name || '').localeCompare(b.memberSnapshot?.name || '');
        });
      })
    );
  }

  /**
   * Atomic creation of Call Campaign header + all member campaign items in Firestore batches.
   */
  async createCampaignWithItems(
    campaignData: Omit<CallCampaign, 'id' | 'createdAt' | 'stats'>,
    items: { snapshot: MemberCallSnapshot; priority: PriorityLevel; priorityNote?: string }[]
  ): Promise<string> {
    const campaignDocRef = doc(this.campaignsCollection);
    const campaignId = campaignDocRef.id;
    const nowIso = new Date().toISOString();

    const emptyBreakdown: Record<CallStatus, number> = {
      PENDING: items.length,
      TEXT_SENT: 0,
      ANSWERED_AGREED: 0,
      ANSWERED_INTERESTED: 0,
      ANSWERED_FEEDBACK_GIVEN: 0,
      CALLBACK_REQUESTED: 0,
      NO_ANSWER: 0,
      CANNOT_BE_REACHED: 0,
      REJECTED: 0,
      DO_NOT_CONTACT: 0
    };

    const highPriorityCount = items.filter((i) => i.priority === 1).length;

    const fullCampaign: CallCampaign = {
      ...campaignData,
      id: campaignId,
      createdAt: nowIso,
      stats: {
        totalMembers: items.length,
        completedCount: 0,
        pendingCount: items.length,
        highPriorityCount,
        statusBreakdown: emptyBreakdown
      }
    };

    // Firestore batch limit is 500 writes per batch
    const batches: any[] = [];
    let currentBatch = writeBatch(this.firestore);
    let opCount = 0;

    currentBatch.set(campaignDocRef, fullCampaign);
    opCount++;

    for (const item of items) {
      if (opCount >= 490) {
        batches.push(currentBatch);
        currentBatch = writeBatch(this.firestore);
        opCount = 0;
      }

      const itemId = `${campaignId}__${item.snapshot.id}`;
      const itemDocRef = doc(this.firestore, `call_campaign_items/${itemId}`);

      const campaignItem: CallCampaignItem = {
        id: itemId,
        campaignId,
        campaignTitle: fullCampaign.title,
        objectiveType: fullCampaign.objectiveType,
        attemptNumber: fullCampaign.attemptNumber || 1,
        memberId: item.snapshot.id,
        memberSnapshot: item.snapshot,
        priority: item.priority,
        priorityNote: item.priorityNote || '',
        isContacted: false,
        callStatus: 'PENDING',
        attemptHistory: [],
        createdAt: nowIso
      };

      currentBatch.set(itemDocRef, campaignItem);
      opCount++;
    }

    batches.push(currentBatch);

    for (const b of batches) {
      await b.commit();
    }

    return campaignId;
  }

  /**
   * Log an outreach outcome (Call or SMS) for a member.
   */
  async logCallOutcome(
    itemId: string,
    campaignId: string,
    outcome: {
      channel: ContactChannel;
      status: CallStatus;
      story: string;
      staffUid: string;
      staffName: string;
      followUpDate?: string | null;
    }
  ): Promise<void> {
    const itemDocRef = doc(this.firestore, `call_campaign_items/${itemId}`);
    const campaignDocRef = doc(this.firestore, `call_campaigns/${campaignId}`);

    const itemSnap = await getDoc(itemDocRef);
    if (!itemSnap.exists()) {
      throw new Error(`Item ${itemId} not found`);
    }

    const currentItem = itemSnap.data() as CallCampaignItem;
    const previousStatus = currentItem.callStatus || 'PENDING';
    const nowIso = new Date().toISOString();

    const newLog: AttemptLog = {
      attempt: (currentItem.attemptHistory?.length || 0) + 1,
      channel: outcome.channel,
      status: outcome.status,
      story: outcome.story,
      calledByUid: outcome.staffUid,
      calledByName: outcome.staffName,
      calledAt: nowIso
    };

    const updatedAttempts = [...(currentItem.attemptHistory || []), newLog];

    const batch = writeBatch(this.firestore);

    batch.update(itemDocRef, {
      isContacted: true,
      channelUsed: outcome.channel,
      callStatus: outcome.status,
      staffStory: outcome.story,
      followUpDate: outcome.followUpDate || null,
      calledByUid: outcome.staffUid,
      calledByName: outcome.staffName,
      calledAt: nowIso,
      attemptHistory: updatedAttempts,
      updatedAt: nowIso
    });

    // Update campaign summary stats
    const campSnap = await getDoc(campaignDocRef);
    if (campSnap.exists()) {
      const camp = campSnap.data() as CallCampaign;
      const stats = camp.stats || {
        totalMembers: 0,
        completedCount: 0,
        pendingCount: 0,
        highPriorityCount: 0,
        statusBreakdown: {} as Record<CallStatus, number>
      };

      // Decrement previous status count
      if (stats.statusBreakdown[previousStatus] > 0) {
        stats.statusBreakdown[previousStatus]--;
      }
      // Increment new status count
      stats.statusBreakdown[outcome.status] = (stats.statusBreakdown[outcome.status] || 0) + 1;

      // Recalculate completed count
      const completed = Object.entries(stats.statusBreakdown)
        .filter(([k]) => k !== 'PENDING')
        .reduce((sum, [, count]) => sum + count, 0);

      stats.completedCount = completed;
      stats.pendingCount = Math.max(0, stats.totalMembers - completed);

      batch.update(campaignDocRef, {
        stats,
        updatedAt: nowIso
      });
    }

    await batch.commit();
  }

  /**
   * Update Campaign briefing & scripts (Admin/Manager).
   */
  async updateCampaignBriefingAndScripts(
    campaignId: string,
    updates: {
      managerRemarks?: string;
      smsTemplateTaglish?: string;
      callScriptTaglish?: string;
    }
  ): Promise<void> {
    const campaignDocRef = doc(this.firestore, `call_campaigns/${campaignId}`);
    await writeBatch(this.firestore)
      .update(campaignDocRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      })
      .commit();
  }

  /**
   * Update Member Priority on a campaign item (Admin/Manager).
   */
  async updateItemPriority(
    itemId: string,
    campaignId: string,
    priority: PriorityLevel,
    priorityNote?: string
  ): Promise<void> {
    const itemDocRef = doc(this.firestore, `call_campaign_items/${itemId}`);
    const campaignDocRef = doc(this.firestore, `call_campaigns/${campaignId}`);

    const itemSnap = await getDoc(itemDocRef);
    if (!itemSnap.exists()) return;
    const item = itemSnap.data() as CallCampaignItem;
    const oldPriority = item.priority;

    const batch = writeBatch(this.firestore);
    batch.update(itemDocRef, {
      priority,
      priorityNote: priorityNote || '',
      updatedAt: new Date().toISOString()
    });

    if (oldPriority !== priority) {
      const campSnap = await getDoc(campaignDocRef);
      if (campSnap.exists()) {
        const camp = campSnap.data() as CallCampaign;
        let hpCount = camp.stats?.highPriorityCount || 0;
        if (oldPriority === 1) hpCount = Math.max(0, hpCount - 1);
        if (priority === 1) hpCount++;
        batch.update(campaignDocRef, {
          'stats.highPriorityCount': hpCount
        });
      }
    }

    await batch.commit();
  }

  // ══════════════════════════════════════════════════════════════
  // 3. TEMPLATE INTERPOLATION HELPER
  // ══════════════════════════════════════════════════════════════

  interpolateScript(
    template: string,
    member: MemberCallSnapshot,
    staffName = 'Staff'
  ): string {
    if (!template) return '';

    return template
      .replace(/{firstName}/g, member.firstName || 'Member')
      .replace(/{name}/g, member.name || 'Member')
      .replace(/{goal}/g, member.fitnessGoal || 'fitness')
      .replace(/{expirationDate}/g, member.membershipExpiration || 'soon')
      .replace(/{trainingExpirationDate}/g, member.trainingExpiration || 'soon')
      .replace(/{lastCheckInDate}/g, member.lastCheckInDate || 'recently')
      .replace(/{staffName}/g, staffName);
  }
}
