import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAhF7a2tBc_97v1_sUcWJ6gI__UuAYUMMo',
  authDomain: 'epicenter-app.firebaseapp.com',
  projectId: 'epicenter-app',
  storageBucket: 'epicenter-app.firebasestorage.app',
  messagingSenderId: '190360788968',
  appId: '1:190360788968:web:cd81299c5a956b0f480e5d',
  measurementId: 'G-5JEWL7H5H5'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  console.log('Querying attendance for September 2026...');
  const attCol = collection(db, 'attendance');
  const q = query(
    attCol,
    where('date', '>=', '2026-09-01'),
    where('date', '<=', '2026-09-30')
  );

  const snap = await getDocs(q);
  console.log(`Retrieved ${snap.docs.length} total attendance records for September.`);

  const memberMap = new Map<string, { memberId: string; name: string; totalCheckIns: number; activeDays: number }>();

  snap.docs.forEach(docSnap => {
    const data = docSnap.data();
    const id = data['memberId'] || docSnap.id;
    const name = data['memberName'] || 'Unknown Member';

    if (!memberMap.has(id)) {
      memberMap.set(id, { memberId: id, name, totalCheckIns: 0, activeDays: 0 });
    }
    const m = memberMap.get(id)!;
    m.totalCheckIns += 1;
  });

  const uniqueList = Array.from(memberMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  console.log('UNIQUE_MEMBERS_START');
  console.log(JSON.stringify(uniqueList, null, 2));
  console.log('UNIQUE_MEMBERS_END');
  process.exit(0);
}

run().catch(err => {
  console.error('Error querying attendance:', err);
  process.exit(1);
});
