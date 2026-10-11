import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function run() {
  console.log('Querying badge definitions and members for Founder status...');
  
  // 1. Check badge_definitions
  const badgeSnap = await getDocs(collection(db, 'badge_definitions')).catch(() => ({ docs: [] } as any));
  console.log(`Badge definitions found: ${badgeSnap.docs.length}`);
  badgeSnap.docs.forEach((b: any) => {
    console.log('BADGE DEF:', b.id, b.data());
  });

  // 2. Check members
  const snap = await getDocs(collection(db, 'members'));
  console.log(`Total members: ${snap.docs.length}`);

  let founderCount = 0;
  snap.docs.forEach(docSnap => {
    const d = docSnap.data();
    const tags: string[] = d['tags'] || [];
    const equipped: string[] = d['equippedBadges'] || [];
    const earned: string[] = d['earnedMonthlyBadges'] || [];
    const raw = JSON.stringify(d).toLowerCase();

    const isFounder = tags.some(t => t.toLowerCase() === 'founder') ||
                      equipped.some(b => b.toLowerCase().includes('founder')) ||
                      raw.includes('founder');

    if (isFounder) {
      founderCount++;
      console.log(`FOUNDER: ${d['name']} | tags: [${tags.join(', ')}] | equipped: [${equipped.join(', ')}]`);
    }
  });

  console.log(`\nTotal Founder Members Found: ${founderCount}`);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
