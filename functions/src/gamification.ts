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
    const poolRef = db.doc('system_config/gamification_pool');
    
    let finalCoins = coins;
    let finalDesc = description;
    
    // Apply Global Pool logic if this is an earning event (not a store purchase)
    if (coins > 0) {
        const poolDoc = await poolRef.get();
        if (poolDoc.exists) {
            const poolData = poolDoc.data() || { balance: 0, initialBudget: 0 };
            const today = new Date().getDate();
            
            if (poolData.balance <= 0) {
                // Hard cap: Disable crits and cut standard rewards by 50%
                finalCoins = Math.floor(coins / 2);
                
                // Strip out any crit/multiplier text from the original description
                let baseDesc = description
                    .replace('🎉 LUCKY PURCHASE! Double Cashback on', 'Cashback on')
                    .replace('🔥 7+ Day Streak Check-in (1.5x)', 'Gym Check-in Bonus');
                
                finalDesc = `[Economy Cap] ${baseDesc} (50% Reward)`;
            } else if (today >= 25 && poolData.initialBudget > 0) {
                // Surplus Event: If > 30% of budget remains after the 25th of the month
                if ((poolData.balance / poolData.initialBudget) > 0.3) {
                    finalCoins *= 3;
                    finalDesc = `🔥 SURPLUS EVENT (3x)! ${description}`;
                }
            }
        }
    }
    
    await db.runTransaction(async (t) => {
        const doc = await t.get(memberRef);
        if (!doc.exists) return;
        const data = doc.data() || {};
        const g = data.gamification || { coins: 0, xp: 0, level: 1 };
        
        g.coins += finalCoins;
        g.xp += xp;
        g.level = calculateLevel(g.xp);
        
        t.update(memberRef, { gamification: g });
        t.set(ledgerRef, {
            type,
            description: finalDesc,
            amount: finalCoins,
            xpAdded: xp,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            balanceAfter: g.coins
        });
    });
    
    // Deduct from Global Pool out-of-band to prevent transaction contention locks on the pool doc
    if (finalCoins > 0) {
        await poolRef.set({ balance: admin.firestore.FieldValue.increment(-finalCoins) }, { merge: true });
    }
}

// 1. Check-ins
export const onAttendanceCreatedGamification = functions.firestore
    .document('/attendance/{attendanceId}')
    .onCreate(async (snapshot, context) => {
        const data = snapshot.data();
        if (!data || !data.memberId) return;
        
        const db = admin.firestore();
        const memberRef = db.collection('members').doc(data.memberId);
        const memberDoc = await memberRef.get();
        const memberData = memberDoc.data() || {};
        
        let coins = COIN_CHECKIN;
        let desc = 'Gym Check-in Bonus';
        
        // Loss Aversion: 1.5x Streak Multiplier
        if (memberData.attendanceStreak >= 7) {
            coins = Math.floor(COIN_CHECKIN * 1.5);
            desc = '🔥 7+ Day Streak Check-in (1.5x)';
        }
        
        await awardGamification(
            data.memberId,
            'CHECK_IN',
            desc,
            coins,
            XP_CHECKIN
        );
    });

// Endowed Progress (Welcome Hook)
export const onMemberCreatedGamification = functions.firestore
    .document('/members/{memberId}')
    .onCreate(async (snapshot, context) => {
        const uid = context.params.memberId;
        await awardGamification(
            uid,
            'WELCOME_BONUS',
            'Endowed Progress Bonus (Welcome!)',
            5000,
            2000 // Jumps to Level 2
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
                const equipped = memberData.equippedBadges || [];
                if (!earnedBadges.includes(requiredBadge) && !equipped.includes(requiredBadge)) {
                    throw new functions.https.HttpsError('permission-denied', `Missing required badge ID: ${requiredBadge}`);
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

export const refreshGlobalCoinPool = functions.pubsub.schedule('0 0 1 * *').onRun(async (context) => {
    const db = admin.firestore();
    
    // Calculate last month's bounds
    const now = new Date();
    // E.g., if now is July 1, firstDayLastMonth is June 1.
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    
    const txRef = db.collection('transactions');
    const snapshot = await txRef
        .where('timestamp', '>=', firstDayLastMonth)
        .where('timestamp', '<=', lastDayLastMonth)
        .get();
        
    let totalSales = 0;
    snapshot.forEach(doc => {
        const data = doc.data();
        // Only sum actual store sales
        if (data.transactionType === 'STORE_SALE' && data.totalAmount) {
            totalSales += data.totalAmount;
        }
    });
    
    // 20% budget * 500 conversion
    const budgetPhp = totalSales * 0.20;
    const coins = Math.floor(budgetPhp * 500);
    
    await db.doc('system_config/gamification_pool').set({
        balance: coins,
        initialBudget: coins,
        lastRefreshed: admin.firestore.FieldValue.serverTimestamp(),
        previousMonthSales: totalSales
    });
    
    console.log(`Global Coin Pool Refreshed: ${coins} Coins (Based on ${totalSales} Php sales).`);
});
