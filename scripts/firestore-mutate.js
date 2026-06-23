const fs = require('fs');
const path = require('path');

/**
 * Automatically converts standard JS values into Firestore's structured REST format.
 */
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
        // Match ISO date string pattern
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

/**
 * Converts Firestore structured REST values back to standard JS values.
 */
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

/**
 * Obtains an Access Token using the local Firebase CLI refresh token.
 */
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

/**
 * Main execution routing
 */
async function run() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log(`
Usage:
  node scripts/firestore-mutate.js read <collection> [docId]
  node scripts/firestore-mutate.js set <collection> <docId> '<jsonPayload>'
  node scripts/firestore-mutate.js add <collection> '<jsonPayload>'
  node scripts/firestore-mutate.js delete <collection> <docId>
`);
        return;
    }

    const [action, collectionName, idOrPayload, rawPayload] = args;
    const projectId = 'epicenter-app';
    const firestoreBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

    try {
        const token = await getAccessToken();

        if (action === 'read') {
            const url = idOrPayload 
                ? `${firestoreBase}/${collectionName}/${idOrPayload}` 
                : `${firestoreBase}/${collectionName}?pageSize=100`;

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (idOrPayload) {
                if (data.fields) {
                    const fields = {};
                    for (const k of Object.keys(data.fields)) {
                        fields[k] = fromFirestoreValue(data.fields[k]);
                    }
                    console.log(JSON.stringify(fields, null, 2));
                } else {
                    console.log('Document not found:', data);
                }
            } else {
                const docs = (data.documents || []).map(d => {
                    const parts = d.name.split('/');
                    const docId = parts[parts.length - 1];
                    const fields = {};
                    for (const k of Object.keys(d.fields || {})) {
                        fields[k] = fromFirestoreValue(d.fields[k]);
                    }
                    return { id: docId, ...fields };
                });
                console.log(JSON.stringify(docs, null, 2));
            }
        } 
        
        else if (action === 'set') {
            const payload = JSON.parse(rawPayload || idOrPayload);
            const fields = {};
            for (const k of Object.keys(payload)) {
                fields[k] = toFirestoreValue(payload[k]);
            }

            console.log(`Setting document ${collectionName}/${idOrPayload}...`);
            const res = await fetch(`${firestoreBase}/${collectionName}/${idOrPayload}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fields })
            });
            const data = await res.json();
            console.log('Status:', res.status, data.name ? 'Success' : data);
        } 
        
        else if (action === 'add') {
            const payload = JSON.parse(idOrPayload);
            const fields = {};
            for (const k of Object.keys(payload)) {
                fields[k] = toFirestoreValue(payload[k]);
            }

            console.log(`Adding document to ${collectionName}...`);
            const res = await fetch(`${firestoreBase}/${collectionName}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fields })
            });
            const data = await res.json();
            console.log('Status:', res.status, data.name ? 'Success' : data);
        } 
        
        else if (action === 'delete') {
            console.log(`Deleting document ${collectionName}/${idOrPayload}...`);
            const res = await fetch(`${firestoreBase}/${collectionName}/${idOrPayload}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('Status:', res.status, res.status === 200 ? 'Success' : 'Failed');
        } 
        
        else {
            console.error('Unknown action:', action);
        }
    } catch (e) {
        console.error('Execution failed:', e.message);
    }
}

run();
