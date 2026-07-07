const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

async function run() {
    try {
        console.log('Calculating exact July transactions to calibrate pool balance...');
        
        // Target: July 1st to now in Manila Time
        // The start of July in Manila is July 1st 00:00:00+08:00 (which is June 30th 16:00:00 UTC)
        const firstDayOfMonth = new Date('2026-07-01T00:00:00+08:00');
        
        console.log(`Querying gamification transactions since ${firstDayOfMonth.toISOString()}`);
        
        const txRef = db.collectionGroup('transactions');
        const snapshot = await txRef.where('timestamp', '>=', firstDayOfMonth).get();
        
        let totalDistributed = 0;
        let count = 0;
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.amount && data.amount > 0) {
                totalDistributed += data.amount;
                count++;
            }
        });
        
        console.log(`Total July Gamification Transactions: ${count}`);
        console.log(`Total Distributed Coins in July: ${totalDistributed}`);
        
        // Fetch current pool budget
        const poolRef = db.doc('system_config/gamification_pool');
        const poolDoc = await poolRef.get();
        const poolData = poolDoc.data();
        
        const initialBudget = poolData.initialBudget;
        const newBalance = initialBudget - totalDistributed;
        
        console.log(`Current initialBudget: ${initialBudget}`);
        console.log(`New correct balance to set: ${newBalance}`);
        
        // Update balance
        await poolRef.update({
            balance: newBalance
        });
        
        console.log('Successfully calibrated gamification pool balance!');
        
    } catch (e) {
        console.error('Error:', e);
    }
}

run();
