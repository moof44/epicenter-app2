const fs = require('fs');
const path = require('path');

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

    try {
        const token = await getAccessToken();

        console.log('Fetching active/latest shift...');
        // Query shifts collection, order by startTime desc, limit 1
        const queryPayload = {
            structuredQuery: {
                from: [{ collectionId: 'shifts' }],
                orderBy: [{ field: { fieldPath: 'startTime' }, direction: 'DESCENDING' }],
                limit: 1
            }
        };

        const res = await fetch(`${firestoreBase}:runQuery`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(queryPayload)
        });

        const json = await res.json();
        if (!json || json.length === 0 || !json[0].document) {
            console.log('No shift found.');
            return;
        }

        const doc = json[0].document;
        const parts = doc.name.split('/');
        const id = parts[parts.length - 1];
        
        const fields = {};
        for (const k of Object.keys(doc.fields || {})) {
            fields[k] = fromFirestoreValue(doc.fields[k]);
        }

        console.log(`Active Shift ID: ${id}`);
        console.log(`Status: ${fields.status}`);
        console.log(`Start Time: ${fields.startTime}`);
        console.log(`Expected Closing Balance: ${fields.expectedClosingBalance}`);
        console.log(`Total Sales: ${fields.totalSales}`);
        console.log(`Total Revenue: ${fields.totalRevenue}`);
        console.log(`Transactions Count: ${fields.transactions ? fields.transactions.length : 0}`);
        console.log('\nTransactions in Shift:');
        console.log(JSON.stringify(fields.transactions, null, 2));

    } catch (e) {
        console.error('Execution failed:', e.message);
    }
}

main();
