import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, writeBatch } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAhF7a2tBc_97v1_sUcWJ6gI__UuAYUMMo",
  authDomain: "epicenter-app.firebaseapp.com",
  projectId: "epicenter-app",
  storageBucket: "epicenter-app.firebasestorage.app",
  messagingSenderId: "190360788968",
  appId: "1:190360788968:web:cd81299c5a956b0f480e5d",
  measurementId: "G-5JEWL7H5H5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function parseToDate(val: any): Date {
  if (!val) return new Date(0);
  if (val instanceof Date) return val;
  if (val.toDate && typeof val.toDate === 'function') return val.toDate();
  if (val.seconds) return new Date(val.seconds * 1000);
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

// Check if a given error doc matches any of the completed fixes
function isErrorRemediated(docData: any): { remediated: boolean; reason?: string } {
  const msg = (docData.message || '') + ' ' + (docData.stack || '');

  // Fix 1: NG02100 (DatePipe error on shift control modal, etc.)
  if (msg.includes('NG02100')) {
    return { remediated: true, reason: 'Fix 1: Handled Firestore Timestamp in shift-control-modal via safeToDate' };
  }

  // Fix 2: ApexCharts Invalid Date format
  if (msg.includes('invalid Date format') || msg.includes('parseDataAxisCharts')) {
    return { remediated: true, reason: 'Fix 2: Handled ApexCharts xaxis category vs datetime in sales-performance' };
  }

  // Fix 3: Action requires authentication on attendance checkout
  if (msg.includes('Action requires authentication') || msg.includes('_currentUserSnapshot')) {
    return { remediated: true, reason: 'Fix 3: Added isLoggedIn check in active-sessions attendance checkout' };
  }

  // Fix 4: NG04002 logout route missing
  if (msg.includes("NG04002: 'logout'") || (msg.includes('NG04002') && msg.includes('logout'))) {
    return { remediated: true, reason: 'Fix 4: Added explicit /logout route and wildcard in app.routes.ts' };
  }

  // Fix 5: Stale dynamically imported chunks post deployment
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Loading chunk')
  ) {
    return { remediated: true, reason: 'Fix 5: Added auto-reload recovery handler in global-error-handler' };
  }

  // Fix 6: NG0750 defer block error without error template
  if (msg.includes('NG0750')) {
    return { remediated: true, reason: 'Fix 6: Added @error fallback blocks to dashboard @defer blocks' };
  }

  // Fix 7: IndexedDB Backing Store & Allocate Target failure
  if (
    msg.includes('IndexedDbTransactionError') ||
    msg.includes('Internal error opening backing store') ||
    msg.includes('Allocate target')
  ) {
    return { remediated: true, reason: 'Fix 7: Added error callback to notification listener and auto-recovery in global-error-handler' };
  }

  return { remediated: false };
}

async function markResolved() {
  console.log('Querying system_errors collection...');
  const snapshot = await getDocs(collection(db, 'system_errors'));
  console.log(`Total error docs: ${snapshot.size}`);

  const toUpdate: { id: string; reason: string; message: string }[] = [];

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    // Only target currently UNRESOLVED docs
    if (data.status !== 'RESOLVED') {
      const match = isErrorRemediated(data);
      if (match.remediated) {
        toUpdate.push({
          id: docSnap.id,
          reason: match.reason!,
          message: (data.message || '').slice(0, 80)
        });
      }
    }
  });

  console.log(`Found ${toUpdate.length} error documents to mark as RESOLVED.`);

  // Write in batches of 450 (Firestore batch limit is 500)
  const batchSize = 400;
  for (let i = 0; i < toUpdate.length; i += batchSize) {
    const chunk = toUpdate.slice(i, i + batchSize);
    const batch = writeBatch(db);
    for (const item of chunk) {
      const ref = doc(db, 'system_errors', item.id);
      batch.update(ref, {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolutionNote: item.reason
      });
    }
    await batch.commit();
    console.log(`Committed batch ${Math.floor(i / batchSize) + 1} (${chunk.length} items).`);
  }

  console.log('Finished marking remediated error records as RESOLVED!');
}

markResolved().catch(err => {
  console.error('Error updating records:', err);
  process.exit(1);
});
