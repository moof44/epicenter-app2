const admin = require('firebase-admin');

// Initialize Firebase Admin (uses default credentials from environment)
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

async function run() {
    try {
        console.log('Calculating correct July 1st budget based on June sales...');
        
        // Target: June 1st to June 30th Manila Time
        const firstDayLastMonth = new Date('2026-06-01T00:00:00+08:00');
        const lastDayLastMonth = new Date('2026-06-30T23:59:59+08:00');
        
        console.log(`Querying transactions from ${firstDayLastMonth.toISOString()} to ${lastDayLastMonth.toISOString()}`);
        
        const txRef = db.collection('transactions');
        const snapshot = await txRef
            .where('date', '>=', firstDayLastMonth)
            .where('date', '<=', lastDayLastMonth)
            .get();
            
        let totalSales = 0;
        let count = 0;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.status === 'COMPLETED' && data.totalAmount) {
                totalSales += data.totalAmount;
                count++;
            }
        });
        
        const budgetPhp = totalSales * 0.20;
        const coins = Math.floor(budgetPhp * 500);
        
        console.log(`--- RESULTS ---`);
        console.log(`Total June Completed Store Sales Count: ${count}`);
        console.log(`Total June Sales Amount: ${totalSales} PHP`);
        console.log(`Expected Gamification Budget (20%): ${budgetPhp} PHP`);
        console.log(`Correct Initial Coin Budget (x500): ${coins} Coins`);
        
    } catch (e) {
        console.error('Error:', e);
    }
}

run();
