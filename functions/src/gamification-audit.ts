import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { logGamificationError } from './gamification';

export const auditGamificationEconomy = functions.pubsub.schedule('0 1 * * *')
    .timeZone('Asia/Manila')
    .onRun(async (context) => {
    const db = admin.firestore();
    
    try {
        console.log('Starting Daily Gamification Economy Audit...');
        
        // 1. Get Global Pool State
        const poolRef = db.doc('system_config/gamification_pool');
        const poolDoc = await poolRef.get();
        if (!poolDoc.exists) {
            console.log('No Global Pool found. Skipping audit.');
            return;
        }
        
        const poolData = poolDoc.data() || { balance: 0, initialBudget: 0 };
        const globalExpectedDrain = poolData.initialBudget - poolData.balance;
        
        // 2. Sum up all transaction ledgers for the current month
        // Calculate the start of the current month in Manila timezone explicitly
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Manila',
            year: 'numeric',
            month: '2-digit'
        });
        const parts = formatter.formatToParts(new Date());
        const year = parts.find(p => p.type === 'year')?.value;
        const month = parts.find(p => p.type === 'month')?.value;
        const firstDayOfMonth = new Date(`${year}-${month}-01T00:00:00+08:00`);
        
        const txRef = db.collectionGroup('transactions');
        const snapshot = await txRef.where('timestamp', '>=', firstDayOfMonth).get();
        
        let totalCoinsDistributed = 0;
        let totalCoinsConsumed = 0;
        
        snapshot.forEach(doc => {
            const tx = doc.data();
            if (tx.amount > 0) {
                totalCoinsDistributed += tx.amount;
            } else if (tx.amount < 0) {
                // amount is negative for store purchases
                totalCoinsConsumed += Math.abs(tx.amount);
            }
        });
        
        const actualNetDrain = totalCoinsDistributed - totalCoinsConsumed;
        
        // 3. Compare and Report Discrepancy
        // If discrepancy is found, log it as an error alert
        if (Math.abs(globalExpectedDrain - actualNetDrain) > 0) {
            const discrepancy = actualNetDrain - globalExpectedDrain;
            const message = `Economy Discrepancy Detected! Actual Net Drain (${actualNetDrain}) != Expected Drain (${globalExpectedDrain}). Discrepancy: ${discrepancy} coins.`;
            console.error(message);
            
            await logGamificationError('ECONOMY_AUDIT_DISCREPANCY', 'SYSTEM', {
                initialBudget: poolData.initialBudget,
                currentBalance: poolData.balance,
                expectedDrain: globalExpectedDrain,
                actualDistributed: totalCoinsDistributed,
                actualConsumed: totalCoinsConsumed,
                actualNetDrain,
                discrepancy
            }, new Error(message));
        } else {
            console.log('Gamification Economy Audit Passed. No discrepancies found.');
        }
        
    } catch (error: any) {
        console.error('CRITICAL: Economy Audit Failed', error);
        await logGamificationError('ECONOMY_AUDIT_FAILURE', 'SYSTEM', {}, error);
    }
});
