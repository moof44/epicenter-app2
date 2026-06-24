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

        console.log('Fetching all transactions for today...');
        let nextPageToken = '';
        const todayTxs = [];
        do {
            const url = `${firestoreBase}/transactions?pageSize=100` + (nextPageToken ? `&pageToken=${nextPageToken}` : '');
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (!data.documents) break;

            for (const d of data.documents) {
                const parts = d.name.split('/');
                const id = parts[parts.length - 1];
                const fields = {};
                for (const k of Object.keys(d.fields || {})) {
                    fields[k] = fromFirestoreValue(d.fields[k]);
                }
                const date = fields.date;
                if (date) {
                    const localDateStr = new Date(date).toLocaleDateString('sv-SE'); // YYYY-MM-DD
                    if (localDateStr === '2026-06-24') {
                        todayTxs.push({ id, status: fields.status, totalAmount: fields.totalAmount });
                    }
                }
            }
            nextPageToken = data.nextPageToken;
        } while (nextPageToken);

        console.log(`Found ${todayTxs.length} transactions for June 24, 2026.`);
        
        let calculatedSales = 0;
        for (const tx of todayTxs) {
            if (tx.status !== 'VOID') {
                calculatedSales += tx.totalAmount;
            }
        }

        console.log(`Calculated sales based on COMPLETED transactions: ${calculatedSales}`);
        console.log('Updating daily_sales/2026-06-24...');

        const dateObj = new Date('2026-06-24T00:00:00');
        const patchRes = await fetch(`${firestoreBase}/daily_sales/2026-06-24?updateMask.fieldPaths=totalSales&updateMask.fieldPaths=date`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    totalSales: { integerValue: String(calculatedSales) },
                    date: { timestampValue: dateObj.toISOString() }
                }
            })
        });

        if (patchRes.status === 200) {
            console.log('SUCCESS: daily_sales/2026-06-24 successfully updated!');
        } else {
            console.error('FAILED to update daily_sales:', await patchRes.text());
        }

    } catch (e) {
        console.error('Execution failed:', e.message);
    }
}

main();
