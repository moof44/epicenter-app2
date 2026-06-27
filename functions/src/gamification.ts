import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

// The Math
const COIN_CHECKIN = 2500;
const XP_CHECKIN = 1000;
const COIN_WORKOUT = 500;
const XP_WORKOUT = 500;
const COIN_QUEST = 50;
const XP_QUEST = 50;
const COIN_SOMATIC = 30000;
const XP_SOMATIC = 5000;

function calculateLevel(xp: number): number {
    if (xp < 2000) return 1;
    if (xp < 15000) return 2;
    if (xp < 40000) return 5;
    if (xp < 80000) return 10;
    if (xp < 120000) return 15;
    if (xp < 240000) return 20;
    if (xp < 500000) return 30;
    return 50; // Max level for now
}

async function awardGamification(uid: string, type: string, description: string, coins: number, xp: number) {
    const db = admin.firestore();
    const memberRef = db.collection('members').doc(uid);
    const ledgerRef = memberRef.collection('transactions').doc();
    
    await db.runTransaction(async (t) => {
        const doc = await t.get(memberRef);
        if (!doc.exists) return;
        const data = doc.data() || {};
        const g = data.gamification || { coins: 0, xp: 0, level: 1 };
        
        g.coins += coins;
        g.xp += xp;
        g.level = calculateLevel(g.xp);
        
        t.update(memberRef, { gamification: g });
        t.set(ledgerRef, {
            type,
            description,
            amount: coins,
            xpAdded: xp,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            balanceAfter: g.coins
        });
    });
}

// 1. Check-ins
export const onAttendanceCreatedGamification = functions.firestore
    .document('/attendance/{attendanceId}')
    .onCreate(async (snapshot, context) => {
        const data = snapshot.data();
        if (!data || !data.memberId) return;
        
        // Add Check-in reward
        await awardGamification(
            data.memberId,
            'CHECK_IN',
            'Gym Check-in Bonus',
            COIN_CHECKIN,
            XP_CHECKIN
        );
    });

// 2. Daily Quests
export const onMemberUpdatedGamification = functions.firestore
    .document('/members/{memberId}')
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after = change.after.data();
        
        if (!before || !after) return;
        
        const uid = context.params.memberId;
        const beforeState = before.dailyQuestsState || {};
        const afterState = after.dailyQuestsState || {};
        
        // Check if daily quests were updated
        if (JSON.stringify(beforeState.completed) !== JSON.stringify(afterState.completed)) {
            // Count newly completed quests
            let newlyCompleted = 0;
            
            // If the date changed, all quests in afterState are new for today
            if (beforeState.date !== afterState.date) {
                newlyCompleted = Object.values(afterState.completed || {}).filter(v => v === true).length;
            } else {
                // Same date, find difference
                const bComp = beforeState.completed || {};
                const aComp = afterState.completed || {};
                
                for (const key of Object.keys(aComp)) {
                    if (aComp[key] === true && bComp[key] !== true) {
                        newlyCompleted++;
                    }
                }
            }
            
            if (newlyCompleted > 0) {
                await awardGamification(
                    uid,
                    'DAILY_QUEST',
                    `Completed ${newlyCompleted} Daily Quest(s)`,
                    COIN_QUEST * newlyCompleted,
                    XP_QUEST * newlyCompleted
                );
            }
        }
    });

// 3. Workout Logs
export const onWorkoutLogCreatedGamification = functions.firestore
    .document('/members/{memberId}/workouts/{workoutId}')
    .onCreate(async (snapshot, context) => {
        const uid = context.params.memberId;
        const db = admin.firestore();
        
        // Prevent spam logging: Only award for the first log of the calendar day
        // We look at the date of this workout
        const data = snapshot.data();
        if (!data || !data.date) return;
        
        const dateStr = data.date; // assuming YYYY-MM-DD
        
        // Query to see if this is the ONLY workout for this date (meaning it's the first one processed)
        const workoutsRef = db.collection(`members/${uid}/workouts`);
        const q = await workoutsRef.where('date', '==', dateStr).limit(2).get();
        
        // If there is only 1 (the one just created), grant reward. If 2+, it's a spam log.
        if (q.size === 1) {
            await awardGamification(
                uid,
                'WORKOUT_LOG',
                'Tracked Daily Workout',
                COIN_WORKOUT,
                XP_WORKOUT
            );
        }
    });

// 4. Somatic Progress
export const onSomaticAssessmentGamification = functions.firestore
    .document('/members/{memberId}/measurements/{measurementId}')
    .onCreate(async (snapshot, context) => {
        const uid = context.params.memberId;
        
        await awardGamification(
            uid,
            'SOMATIC_SCAN',
            'Monthly Somatic Assessment',
            COIN_SOMATIC,
            XP_SOMATIC
        );
    });

// Phase 2: Macro-Economy & Purchasing
export const onPurchaseCreatedGamification = functions.firestore
    .document('/transactions/{transactionId}')
    .onCreate(async (snapshot, context) => {
        const data = snapshot.data();
        if (!data || !data.memberId || !data.totalAmount) return; // Only process if linked to a member
        
        const uid = data.memberId;
        const amountSpent = data.totalAmount;
        
        // Math: 1 Php spent = 50 Coins (10% Cashback) and 10 XP.
        let coinsToAward = Math.floor(amountSpent * 50);
        let xpToAward = Math.floor(amountSpent * 10);
        let desc = `10% Cashback on Gym Purchase (Php ${amountSpent})`;
        
        // The Casino Effect (10% chance for a lucky double drop)
        const isLucky = Math.random() < 0.10;
        if (isLucky) {
            coinsToAward *= 2;
            desc = `🎉 LUCKY PURCHASE! Double Cashback on Php ${amountSpent}`;
        }
        
        await awardGamification(
            uid,
            'IN_GYM_PURCHASE',
            desc,
            coinsToAward,
            xpToAward
        );
    });

export const purchaseStoreReward = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
    // 1. Security & Auth Check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in to purchase rewards.');
    }
    const uid = context.auth.uid;
    const { itemName, cost, requiredLevel, requiredBadge } = data;
    
    if (!itemName || !cost || typeof cost !== 'number') {
        throw new functions.https.HttpsError('invalid-argument', 'Missing item details.');
    }

    const db = admin.firestore();
    const memberRef = db.collection('members').doc(uid);
    
    try {
        await db.runTransaction(async (t) => {
            const doc = await t.get(memberRef);
            if (!doc.exists) throw new functions.https.HttpsError('not-found', 'Member not found.');
            
            const memberData = doc.data() || {};
            const g = memberData.gamification || { coins: 0, xp: 0, level: 1 };
            
            // 2. The Sunk Cost Fallacy Gatekeeper (Must have active membership)
            const membershipStatus = memberData.membershipStatus || 'Inactive';
            if (membershipStatus !== 'Active') {
                throw new functions.https.HttpsError('permission-denied', 'You must have an Active Monthly Membership to use the Rewards Store.');
            }
            
            // 3. Level Check
            if (requiredLevel && g.level < requiredLevel) {
                throw new functions.https.HttpsError('permission-denied', `Must be Level ${requiredLevel} to purchase this item.`);
            }
            
            // 4. Badge Check
            if (requiredBadge) {
                const earnedBadges = memberData.earnedMonthlyBadges || [];
                if (!earnedBadges.includes(requiredBadge) && !(memberData.equippedBadges || []).includes(requiredBadge)) {
                    // For now, we just pass if the logic is not fully implemented, but this is the structure.
                    // throw new functions.https.HttpsError('permission-denied', `Missing required badge: ${requiredBadge}`);
                }
            }
            
            // 5. Balance Check
            if (g.coins < cost) {
                throw new functions.https.HttpsError('failed-precondition', 'Insufficient Somatic Coins.');
            }
            
            // 6. Deduct and Write Ledger
            g.coins -= cost;
            t.update(memberRef, { gamification: g });
            
            const ledgerRef = memberRef.collection('transactions').doc();
            t.set(ledgerRef, {
                type: 'STORE_PURCHASE',
                description: `Purchased: ${itemName}`,
                amount: -cost, // Negative to denote spending
                xpAdded: 0,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                balanceAfter: g.coins
            });
        });
        
        return { success: true, message: `Successfully purchased ${itemName}!` };
        
    } catch (error: any) {
        console.error('Purchase error:', error);
        throw new functions.https.HttpsError(error.code || 'internal', error.message || 'Unable to process purchase.');
    }
});
