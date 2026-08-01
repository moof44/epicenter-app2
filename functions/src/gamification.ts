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
    if (!xp || xp <= 0) return 1;
    const lvl = Math.floor(0.1 * Math.sqrt(xp));
    return Math.max(1, Math.min(100, lvl));
}

export async function logGamificationError(action: string, uid: string, data: any, error: any) {
    try {
        const db = admin.firestore();
        await db.collection('system_logs').doc('gamification_errors').collection('errors').add({
            action,
            uid,
            data,
            error: error?.message || String(error),
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        console.error('Failed to log gamification error:', e);
    }
}

async function awardGamification(uid: string, type: string, description: string, coins: number, xp: number) {
    const db = admin.firestore();
    const memberRef = db.collection('members').doc(uid);
    const ledgerRef = memberRef.collection('transactions').doc();
    const poolRef = db.doc('system_config/gamification_pool');
    
    let finalCoins = coins;
    let finalDesc = description;
    
    try {
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
    } catch (error: any) {
        console.error(`Gamification Error [${type}]:`, error);
        await logGamificationError('AWARD_GAMIFICATION', uid, { type, description, coins, xp }, error);
        
        // Safety Measure: Fallback Reward
        try {
            console.log(`Executing Fallback Reward for ${uid}`);
            const fallbackCoins = 10;
            const fallbackXP = 10;
            const fallbackDesc = `[FALLBACK] ${description}`;
            
            // Simple non-transactional write for maximum resilience
            await memberRef.set({
                gamification: {
                    coins: admin.firestore.FieldValue.increment(fallbackCoins),
                    xp: admin.firestore.FieldValue.increment(fallbackXP)
                }
            }, { merge: true });
            
            await ledgerRef.set({
                type,
                description: fallbackDesc,
                amount: fallbackCoins,
                xpAdded: fallbackXP,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                isFallback: true
            });
        } catch (fallbackError: any) {
            console.error(`CRITICAL: Fallback Reward Failed for ${uid}`, fallbackError);
            await logGamificationError('FALLBACK_REWARD_FAILED', uid, { type, description }, fallbackError);
        }
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
        
        // Gatekeeper: Only Active Monthly Subscribers or Active PT members earn check-in coins & XP
        const isEligible = memberData.membershipStatus === 'Active' || memberData.hasActivePT === true;
        if (!isEligible) {
            console.log(`Check-in reward skipped for non-subscriber / walk-in: ${data.memberId}`);
            return;
        }
        
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
    let memberRef = db.collection('members').doc(uid);
    let initialDoc = await memberRef.get();

    if (!initialDoc.exists) {
        const snap = await db.collection('members').where('portalUid', '==', uid).get();
        if (!snap.empty) {
            memberRef = snap.docs[0].ref;
        } else if (data.memberId) {
            const fallbackRef = db.collection('members').doc(data.memberId);
            const fallbackDoc = await fallbackRef.get();
            if (fallbackDoc.exists) {
                memberRef = fallbackRef;
                await memberRef.update({ portalUid: uid });
            }
        }
    }
    
    try {
        const result = await db.runTransaction(async (t) => {
            // 1. Fetch member document by doc ID or portalUid
            const memberDoc = await t.get(memberRef);
            if (!memberDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Member profile not found.');
            }

            const memberData = memberDoc.data() || {};
            const g = memberData.gamification || { coins: 0, xp: 0, level: 1 };

            // 2. Enforce active subscription
            if (memberData.membershipStatus !== 'Active') {
                throw new functions.https.HttpsError('failed-precondition', 'An active membership is required to redeem rewards.');
            }

            // 3. Enforce Level Requirement
            if (requiredLevel && (g.level || 1) < requiredLevel) {
                throw new functions.https.HttpsError('failed-precondition', `Level ${requiredLevel} is required for this reward.`);
            }

            // 4. Enforce Badge Requirement
            if (requiredBadge) {
                const earned = memberData.earnedMonthlyBadges || [];
                const equipped = memberData.equippedBadges || [];
                if (!earned.includes(requiredBadge) && !equipped.includes(requiredBadge)) {
                    throw new functions.https.HttpsError('failed-precondition', `The ${requiredBadge} badge is required for this reward.`);
                }
            }

            // 5. Enforce Coin Balance
            if ((g.coins || 0) < cost) {
                throw new functions.https.HttpsError('failed-precondition', `Insufficient coins balance. Required: 🪙${cost}, Available: 🪙${g.coins || 0}.`);
            }

            // 6. Deduct coins and record ledger entry
            g.coins -= cost;
            t.update(memberRef, { gamification: g });

            // Return spent coins to global economy pool balance
            const poolRef = db.doc('system_config/gamification_pool');
            t.update(poolRef, {
                balance: admin.firestore.FieldValue.increment(cost)
            });

            const ledgerRef = memberRef.collection('transactions').doc();
            t.set(ledgerRef, {
                type: 'STORE_PURCHASE',
                description: `Purchased: ${itemName}`,
                amount: -cost, // Negative to denote spending
                xpAdded: 0,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                balanceAfter: g.coins
            });

            // 7. Create Redemption Claim Voucher for Staff Counter Fulfillment
            const voucherRef = db.collection('redemption_claims').doc();
            const voucherCode = `CLAIM-${Math.floor(100000 + Math.random() * 900000)}`;
            const memberName = memberData.name || 'Member';
            
            t.set(voucherRef, {
                id: voucherRef.id,
                voucherCode,
                memberId: memberRef.id,
                portalUid: uid,
                memberName,
                productId: data.itemId || itemName.toLowerCase().replace(/\s+/g, '_'),
                productName: itemName,
                coinsSpent: cost,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // Valid 48 hours
                status: 'PENDING_CLAIM'
            });

            return {
                success: true,
                message: `Successfully purchased ${itemName}!`,
                voucherCode,
                itemName,
                cost
            };
        });
        
        return result;
        
    } catch (error: any) {
        console.error('Purchase error:', error);
        await logGamificationError('PURCHASE_STORE_REWARD', uid, { itemName, cost }, error);
        throw new functions.https.HttpsError(error.code || 'internal', error.message || 'Unable to process purchase.');
    }
});

/**
 * Callable Function for Staff POS to Fulfill a Reward Redemption Claim Pass.
 * Verifies voucher code, marks FULFILLED, decrements stock, and logs inventory.
 */
export const fulfillRedemptionVoucher = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
    // 1. Security Check: Auth & Staff Role
    if (!context.auth || !context.auth.token.roles || 
        !context.auth.token.roles.some((r: string) => ['ADMIN', 'MANAGER', 'STAFF', 'TRAINER'].includes(r))) {
        throw new functions.https.HttpsError(
            'permission-denied',
            'Only gym staff can fulfill reward claim vouchers.'
        );
    }

    const { voucherCode } = data;
    if (!voucherCode) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing voucherCode.');
    }

    const staffUid = context.auth.uid;
    const db = admin.firestore();

    try {
        const staffSnap = await db.collection('users').doc(staffUid).get();
        const staffName = staffSnap.exists ? (staffSnap.data()?.displayName || 'Staff') : 'Staff';

        // 2. Query voucher
        const cleanCode = voucherCode.trim().toUpperCase();
        const claimsSnap = await db.collection('redemption_claims')
            .where('voucherCode', '==', cleanCode)
            .where('status', '==', 'PENDING_CLAIM')
            .limit(1)
            .get();

        if (claimsSnap.empty) {
            throw new functions.https.HttpsError('not-found', `No active pending voucher found for code "${cleanCode}".`);
        }

        const claimDoc = claimsSnap.docs[0];
        const claimData = claimDoc.data();

        // Check expiration
        if (claimData.expiresAt && claimData.expiresAt.toDate) {
            if (claimData.expiresAt.toDate() < new Date()) {
                await claimDoc.ref.update({ status: 'EXPIRED' });
                throw new functions.https.HttpsError('failed-precondition', 'This voucher code has expired.');
            }
        }

        // Check active shift
        const openShiftSnap = await db.collection('shifts')
            .where('status', '==', 'OPEN')
            .limit(1)
            .get();
        
        const openShiftId = !openShiftSnap.empty ? openShiftSnap.docs[0].id : null;

        // Execute fulfillment
        await claimDoc.ref.update({
            status: 'FULFILLED',
            fulfilledByStaffId: staffUid,
            fulfilledByStaffName: staffName,
            fulfilledAt: admin.firestore.FieldValue.serverTimestamp(),
            shiftId: openShiftId
        });

        // Try decrement product stock if matching product exists
        const productName = claimData.productName;
        const productsSnap = await db.collection('products')
            .where('name', '==', productName)
            .limit(1)
            .get();

        if (!productsSnap.empty) {
            const productDoc = productsSnap.docs[0];
            const productRef = productDoc.ref;
            const currentStock = productDoc.data().stock || 0;
            const newStock = Math.max(0, currentStock - 1);
            
            await productRef.update({ stock: newStock });

            // Create inventory log
            await db.collection('inventory_logs').add({
                productId: productDoc.id,
                productName,
                changeQuantity: -1,
                currentStock: newStock,
                type: 'REMOVAL',
                reason: `REWARD_REDEMPTION (Voucher: ${cleanCode})`,
                performedBy: staffName,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        // Create transaction record for sales tracking
        await db.collection('transactions').add({
            transactionType: 'STORE_SALE',
            paymentMethod: 'COINS',
            totalAmount: 0,
            coinsSpent: claimData.coinsSpent || 0,
            isRewardRedemption: true,
            voucherCode: cleanCode,
            memberName: claimData.memberName || 'Member',
            items: [{
                name: productName,
                quantity: 1,
                price: 0,
                coinsCost: claimData.coinsSpent || 0
            }],
            performedBy: staffName,
            shiftId: openShiftId,
            status: 'COMPLETED',
            date: admin.firestore.FieldValue.serverTimestamp()
        });

        return {
            success: true,
            message: `Successfully fulfilled voucher ${cleanCode} for ${claimData.memberName}!`,
            claim: {
                voucherCode: cleanCode,
                memberName: claimData.memberName,
                productName: claimData.productName,
                coinsSpent: claimData.coinsSpent
            }
        };

    } catch (error: any) {
        console.error('Error fulfilling voucher:', error);
        throw new functions.https.HttpsError(error.code || 'internal', error.message || 'Failed to fulfill voucher.');
    }
});

/**
 * Callable Function to Cancel a Pending Redemption Voucher and Refund Coins to Member.
 * Can be invoked by the Member (owner) or by Staff/Admin.
 */
export const cancelRedemptionVoucher = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }

    const { voucherCode, voucherId } = data;
    if (!voucherCode && !voucherId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing voucherCode or voucherId.');
    }

    const uid = context.auth.uid;
    const isStaff = context.auth.token.roles && 
        context.auth.token.roles.some((r: string) => ['ADMIN', 'MANAGER', 'STAFF', 'TRAINER'].includes(r));
    
    const db = admin.firestore();
    let claimDoc: any = null;

    try {
        if (voucherId) {
            const docById = await db.collection('redemption_claims').doc(voucherId).get();
            if (docById.exists && docById.data()?.status === 'PENDING_CLAIM') {
                claimDoc = docById;
            }
        }

        if (!claimDoc && voucherCode) {
            const cleanCode = voucherCode.trim().toUpperCase();
            const claimsSnap = await db.collection('redemption_claims')
                .where('voucherCode', '==', cleanCode)
                .where('status', '==', 'PENDING_CLAIM')
                .limit(1)
                .get();

            if (!claimsSnap.empty) {
                claimDoc = claimsSnap.docs[0];
            }
        }

        if (!claimDoc || !claimDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'No active pending voucher found for cancellation.');
        }

        const claimData = claimDoc.data();
        const cleanCode = claimData.voucherCode || voucherCode || 'VOUCHER';

        // Permission check: Must be voucher owner (by doc ID or portalUid) or staff
        let isOwner = (claimData.memberId === uid || claimData.portalUid === uid);
        let resolvedMemberRef = db.collection('members').doc(claimData.memberId);
        let mDoc = await resolvedMemberRef.get();

        if (!mDoc.exists) {
            const searchUid = claimData.portalUid || claimData.memberId || uid;
            const mSnap = await db.collection('members').where('portalUid', '==', searchUid).get();
            if (!mSnap.empty) {
                resolvedMemberRef = mSnap.docs[0].ref;
                mDoc = mSnap.docs[0];
                isOwner = true;
            }
        } else {
            if (mDoc.data()?.portalUid === uid) {
                isOwner = true;
            }
        }

        if (!isOwner && !isStaff) {
            throw new functions.https.HttpsError('permission-denied', 'You can only cancel your own vouchers.');
        }

        const refundCoins = claimData.coinsSpent || 0;

        await db.runTransaction(async (t) => {
            const memberDoc = await t.get(resolvedMemberRef);
            if (!memberDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Member profile not found for coin refund.');
            }

            const memberData = memberDoc.data() || {};
            const g = memberData.gamification || { coins: 0, xp: 0, level: 1 };
            g.coins = (g.coins || 0) + refundCoins;
            
            t.update(resolvedMemberRef, { gamification: g });

            // Re-deduct refunded coins from global economy pool balance
            const poolRef = db.doc('system_config/gamification_pool');
            t.update(poolRef, {
                balance: admin.firestore.FieldValue.increment(-refundCoins)
            });

            const ledgerRef = resolvedMemberRef.collection('transactions').doc();
            t.set(ledgerRef, {
                type: 'STORE_REFUND',
                description: `Refunded Voucher (${cleanCode}): ${claimData.productName}`,
                amount: refundCoins,
                xpAdded: 0,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                balanceAfter: g.coins
            });

            t.update(claimDoc.ref, {
                status: 'CANCELLED',
                cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
                cancelledBy: uid
            });
        });

        return {
            success: true,
            message: `Voucher ${cleanCode} cancelled. ${refundCoins.toLocaleString()} coins refunded to wallet!`,
            refundCoins
        };

    } catch (error: any) {
        console.error('Error cancelling voucher:', error);
        throw new functions.https.HttpsError(error.code || 'internal', error.message || 'Failed to cancel voucher.');
    }
});

export const refreshGlobalCoinPool = functions.pubsub.schedule('0 0 1 * *')
    .timeZone('Asia/Manila')
    .onRun(async (context) => {
    const db = admin.firestore();
    
    // Calculate last month's bounds in Manila timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'numeric'
    });
    const parts = formatter.formatToParts(new Date());
    const currentYear = parseInt(parts.find(p => p.type === 'year')!.value, 10);
    const currentMonth = parseInt(parts.find(p => p.type === 'month')!.value, 10); // 1-12
    
    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;
    if (prevMonth === 0) {
        prevMonth = 12;
        prevYear -= 1;
    }
    
    const prevMonthStr = String(prevMonth).padStart(2, '0');
    const firstDayLastMonth = new Date(`${prevYear}-${prevMonthStr}-01T00:00:00+08:00`);
    
    const currentMonthStr = String(currentMonth).padStart(2, '0');
    const firstDayCurrentMonth = new Date(`${currentYear}-${currentMonthStr}-01T00:00:00+08:00`);
    const lastDayLastMonth = new Date(firstDayCurrentMonth.getTime() - 1000);
    
    const txRef = db.collection('transactions');
    const snapshot = await txRef
        .where('date', '>=', firstDayLastMonth)
        .where('date', '<=', lastDayLastMonth)
        .get();
        
    let totalSales = 0;
    snapshot.forEach(doc => {
        const data = doc.data();
        // Only sum completed store sales
        if (data.status === 'COMPLETED' && data.totalAmount) {
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
