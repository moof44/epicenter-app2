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

    const txIds = [
        '1aiu6ZyGLeOwjNp8IjAb',
        'JJQMHPsWXjbIaNbcr8Ti',
        'z8MB7O6OSnTeRaHzgrmn'
    ];

    try {
        const token = await getAccessToken();

        for (const txId of txIds) {
            console.log(`\nFetching transaction ${txId}...`);
            const res = await fetch(`${firestoreBase}/transactions/${txId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (res.status !== 200) {
                console.log(`  Document not found (status ${res.status})`);
                continue;
            }

            const fields = {};
            for (const k of Object.keys(data.fields || {})) {
                fields[k] = fromFirestoreValue(data.fields[k]);
            }

            console.log(`  ID: ${txId}`);
            console.log(`  Status: ${fields.status}`);
            console.log(`  Date: ${fields.date}`);
            console.log(`  Total Amount: ${fields.totalAmount}`);
            console.log(`  Voided At: ${fields.voidedAt}`);
            console.log(`  Voided By: ${fields.voidedBy}`);
            console.log(`  Void Reason: ${fields.voidReason}`);
        }

    } catch (e) {
        console.error('Fetch failed:', e.message);
    }
}

main();
