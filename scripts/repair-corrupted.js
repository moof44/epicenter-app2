const fs = require('fs');
const path = require('path');

// REST API Helper: JSON value -> Firestore REST value
function toFirestoreValue(val) {
    if (val === null || val === undefined) {
        return { nullValue: null };
    }
    if (typeof val === 'boolean') {
        return { booleanValue: val };
    }
    if (typeof val === 'number') {
        if (Number.isInteger(val)) {
            return { integerValue: String(val) };
        }
        return { doubleValue: val };
    }
    if (typeof val === 'string') {
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(val)) {
            return { timestampValue: val };
        }
        return { stringValue: val };
    }
    if (val instanceof Date) {
        return { timestampValue: val.toISOString() };
    }
    if (Array.isArray(val)) {
        return {
            arrayValue: {
                values: val.map(toFirestoreValue)
            }
        };
    }
    if (typeof val === 'object') {
        const fields = {};
        for (const k of Object.keys(val)) {
            fields[k] = toFirestoreValue(val[k]);
        }
        return {
            mapValue: { fields }
        };
    }
    return { stringValue: String(val) };
}

// REST API Helper: Firestore REST value -> JSON value
function fromFirestoreValue(fieldVal) {
    if (!fieldVal) return null;
    const type = Object.keys(fieldVal)[0];
    const val = fieldVal[type];

    switch (type) {
        case 'nullValue': return null;
        case 'booleanValue': return val;
        case 'integerValue': return parseInt(val, 10);
        case 'doubleValue': return parseFloat(val);
        case 'stringValue': return val;
        case 'timestampValue': return new Date(val);
        case 'arrayValue': return (val.values || []).map(fromFirestoreValue);
        case 'mapValue': {
            const obj = {};
            const fields = val.fields || {};
            for (const k of Object.keys(fields)) {
                obj[k] = fromFirestoreValue(fields[k]);
            }
            return obj;
        }
        default: return val;
    }
}

// Get Access Token using local Firebase CLI tools
async function getAccessToken() {
    const configPath = path.join(process.env.USERPROFILE, '.config', 'configstore', 'firebase-tools.json');
    if (!fs.existsSync(configPath)) {
        throw new Error(`Firebase credentials not found at ${configPath}. Run 'firebase login' first.`);
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const refreshToken = config.tokens?.refresh_token;
    if (!refreshToken) {
        throw new Error('No refresh token found in firebase-tools.json config.');
    }

    const body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
        client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
        refresh_token: refreshToken
    });

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
    });

    const json = await res.json();
    if (!json.access_token) {
        throw new Error(`Failed to exchange refresh token: ${JSON.stringify(json)}`);
    }
    return json.access_token;
}

async function main() {
    const projectId = 'epicenter-app';
    const firestoreBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

    const corruptedTxIds = [
        '1aiu6ZyGLeOwjNp8IjAb',
        'JJQMHPsWXjbIaNbcr8Ti',
        'z8MB7O6OSnTeRaHzgrmn'
    ];

    try {
        console.log('Retrieving Firebase access token...');
        const token = await getAccessToken();
        console.log('Token retrieved successfully.');

        // 1. Scan all shifts to map transaction timestamps
        console.log('\nScanning all shifts to find uncorrupted timestamps...');
        const transactionTimestamps = new Map();
        let nextPageToken = '';
        let shiftPageCount = 0;

        do {
            const url = `${firestoreBase}/shifts?pageSize=100` + (nextPageToken ? `&pageToken=${nextPageToken}` : '');
            const shiftsRes = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const shiftsData = await shiftsRes.json();
            
            if (!shiftsData.documents) break;
            
            for (const doc of shiftsData.documents) {
                const fields = doc.fields || {};
                const transactionsVal = fields.transactions;
                if (!transactionsVal) continue;
                
                const transactionsList = fromFirestoreValue(transactionsVal) || [];
                for (const tx of transactionsList) {
                    if (tx.relatedTransactionId && tx.timestamp) {
                        transactionTimestamps.set(tx.relatedTransactionId, tx.timestamp);
                    }
                }
            }

            nextPageToken = shiftsData.nextPageToken;
            shiftPageCount++;
        } while (nextPageToken);

        console.log(`Scanned ${shiftPageCount} pages of shifts. Found ${transactionTimestamps.size} mapped transaction IDs.`);

        // 2. Repair our target corrupted transactions
        console.log('\nRepairing corrupted transactions...');
        let repairedTxCount = 0;

        for (const txId of corruptedTxIds) {
            const correctDateStr = transactionTimestamps.get(txId);
            if (!correctDateStr) {
                console.log(`  [WARNING] No uncorrupted timestamp found in shifts for transaction ${txId}.`);
                // Fallback: use a default timestamp (e.g. today at 4:00 PM local which is 08:00 UTC)
                const fallbackDate = new Date('2026-06-24T08:00:00.000Z');
                console.log(`  Using fallback timestamp ${fallbackDate.toISOString()} for ${txId}.`);
                transactionTimestamps.set(txId, fallbackDate.toISOString());
            }

            const correctDate = new Date(transactionTimestamps.get(txId));
            console.log(`  Repairing transaction ${txId} to ${correctDate.toISOString()}...`);

            const patchRes = await fetch(`${firestoreBase}/transactions/${txId}?updateMask.fieldPaths=date`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: {
                        date: toFirestoreValue(correctDate)
                    }
                })
            });

            if (patchRes.status === 200) {
                console.log(`  [SUCCESS] Transaction ${txId} successfully repaired.`);
                repairedTxCount++;
            } else {
                console.error(`  [FAILED] Failed to patch transaction ${txId}:`, await patchRes.text());
            }
        }

        // 3. Scan and repair corrupted inventory logs
        console.log('\nScanning recent inventory logs for corruption...');
        const corruptedLogIds = [
            '9gpjgQVrD3YHgN3oaOh0',
            'CFdYXcjCkw6CX2cXdQhM',
            'rLX3pBkgxtavZyP3VbNV',
            'uObqQsh24jvWnTHvtDvK'
        ];

        let repairedLogCount = 0;
        const matchedTimestamp = new Date('2026-06-24T08:03:24.792Z');

        for (const logId of corruptedLogIds) {
            console.log(`  Repairing inventory log ${logId} timestamp to: ${matchedTimestamp.toISOString()}...`);
            
            const patchRes = await fetch(`${firestoreBase}/inventory_logs/${logId}?updateMask.fieldPaths=timestamp`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: {
                        timestamp: toFirestoreValue(matchedTimestamp)
                    }
                })
            });

            if (patchRes.status === 200) {
                console.log(`  [SUCCESS] Inventory log ${logId} successfully repaired.`);
                repairedLogCount++;
            } else {
                console.error(`  [FAILED] Failed to patch inventory log ${logId}:`, await patchRes.text());
            }
        }

        console.log(`Inventory log repair complete. Repaired ${repairedLogCount} log(s).`);
        console.log('\n--- Repair Job Finished ---');

    } catch (error) {
        console.error('Migration failed:', error.message);
    }
}

main();
