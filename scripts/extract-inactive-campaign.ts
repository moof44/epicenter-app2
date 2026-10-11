import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

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

function parseToDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (val.toDate && typeof val.toDate === 'function') {
    const d = val.toDate();
    return isNaN(d.getTime()) ? null : d;
  }
  if (val.seconds) {
    const d = new Date(val.seconds * 1000);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function calculateAge(birthday: Date | null, referenceDate: Date): number | string {
  if (!birthday) return 'N/A';
  let age = referenceDate.getFullYear() - birthday.getFullYear();
  const m = referenceDate.getMonth() - birthday.getMonth();
  if (m < 0 || (m === 0 && referenceDate.getDate() < birthday.getDate())) {
    age--;
  }
  return age >= 0 ? age : 'N/A';
}

function formatDateStr(d: Date | null): string {
  if (!d) return 'None';
  return d.toISOString().split('T')[0];
}

interface InactiveMemberRecord {
  memberId: string;
  name: string;
  contactNumber: string;
  gender: string;
  age: number | string;
  address: string;
  isFounder: boolean;
  founderBadgeText: string;
  membershipExpiration: Date | null;
  trainingExpiration: Date | null;
  lastActiveExpiration: Date | null;
  daysExpired: number;
  category: 'RECENT' | 'VERY_OLD';
}

async function run() {
  console.log('Fetching all members from Firestore with Founder Badge marking...');
  const membersCol = collection(db, 'members');
  const snap = await getDocs(membersCol);
  console.log(`Total member records in database: ${snap.docs.length}`);

  // Reference date: October 5, 2026
  const refDate = new Date(2026, 9, 5); // 2026-10-05
  const nowMs = refDate.getTime();

  const recentInactive: InactiveMemberRecord[] = [];
  const veryOldInactive: InactiveMemberRecord[] = [];
  let activeSubscribedCount = 0;
  let totalFoundersFound = 0;

  snap.docs.forEach(docSnap => {
    const d = docSnap.data();

    // Check founder status
    const tags: string[] = d['tags'] || [];
    const equipped: string[] = d['equippedBadges'] || [];
    const isFounder = tags.some(t => t.toUpperCase() === 'FOUNDER') ||
                      equipped.some(b => b.toLowerCase().includes('founder'));

    if (isFounder) totalFoundersFound++;

    // Check subscription expirations
    const memExp = parseToDate(d['membershipExpiration'] || d['expiration']);
    const trainExp = parseToDate(d['trainingExpiration']);

    const memExpMs = memExp ? memExp.getTime() : 0;
    const trainExpMs = trainExp ? trainExp.getTime() : 0;

    // Has active subscription?
    const hasActiveSubscription = (memExpMs > nowMs) || (trainExpMs > nowMs);

    if (hasActiveSubscription) {
      activeSubscribedCount++;
      return; // Exclude currently active subscribers
    }

    // Determine latest expiration date
    let latestExp: Date | null = null;
    if (memExp && trainExp) {
      latestExp = memExpMs >= trainExpMs ? memExp : trainExp;
    } else if (memExp) {
      latestExp = memExp;
    } else if (trainExp) {
      latestExp = trainExp;
    }

    let daysExpired = 9999;
    if (latestExp) {
      const diffMs = nowMs - latestExp.getTime();
      daysExpired = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    const bday = parseToDate(d['birthday'] || d['birthDate']);
    const age = calculateAge(bday, refDate);

    const name = (d['name'] || d['displayName'] || 'No Name').trim();
    const contact = (d['contactNumber'] || d['phone'] || 'No Contact').trim();
    const gender = (d['gender'] || 'Unspecified').trim();
    const address = (d['address'] || 'No Address Listed').trim();

    const record: InactiveMemberRecord = {
      memberId: docSnap.id,
      name,
      contactNumber: contact,
      gender,
      age,
      address,
      isFounder,
      founderBadgeText: isFounder ? 'YES (Founder)' : 'NO',
      membershipExpiration: memExp,
      trainingExpiration: trainExp,
      lastActiveExpiration: latestExp,
      daysExpired: daysExpired < 0 ? 0 : daysExpired,
      category: daysExpired <= 45 ? 'RECENT' : 'VERY_OLD'
    };

    if (record.category === 'RECENT') {
      recentInactive.push(record);
    } else {
      veryOldInactive.push(record);
    }
  });

  recentInactive.sort((a, b) => a.daysExpired - b.daysExpired);
  veryOldInactive.sort((a, b) => a.daysExpired - b.daysExpired);

  const totalInactive = recentInactive.length + veryOldInactive.length;
  const recentFounders = recentInactive.filter(m => m.isFounder).length;
  const veryOldFounders = veryOldInactive.filter(m => m.isFounder).length;

  console.log(`\nClassification Summary:`);
  console.log(`- Total Inactive Members: ${totalInactive}`);
  console.log(`- Most Recent Inactive (<= 45 days): ${recentInactive.length} (Founders: ${recentFounders})`);
  console.log(`- Very Old Inactive (> 45 days): ${veryOldInactive.length} (Founders: ${veryOldFounders})`);
  console.log(`- Total Founder Leads Inactive: ${recentFounders + veryOldFounders} out of ${totalFoundersFound}`);

  // Build Markdown Document
  let md = `# EPICENTER GYM - INACTIVE MEMBERS CALL & TEXT CAMPAIGN DIRECTORY (WITH FOUNDER'S BADGE)
**Audit Date**: 2026-10-05 | **Generated for**: Front Desk / Sales Outreach
**Target Audience**: Members not currently subscribed to any Membership or Personal Training package.
**Special Marker**: Includes **Founder's Badge** column (members who enrolled during the July 1 – August 31, 2026 launch window).

---

## Executive Summary
- **Total Inactive Members Found**: ${totalInactive}
- **Total Inactive Founders**: **${recentFounders + veryOldFounders} Founding Members** (⭐ *VIP price freeze / special loyalty perks*)
- **Category 1 (Most Recent - Within 45 Days)**: ${recentInactive.length} members (${recentFounders} Founders) — 🔥 *Highest conversion priority*
- **Category 2 (Very Old Inactive - More than 45 Days)**: ${veryOldInactive.length} members (${veryOldFounders} Founders) — 🎯 *Win-back / re-activation priority*
- **Currently Subscribed / Active Members Excluded**: ${activeSubscribedCount} members

---

## 1. 🔥 Category 1: Most Recent Inactive (Within 45 Days)
> **Campaign Goal**: Quick renewal nudge, inquiry on reasons for lapse, special renewal discount. Founders receive priority attention!

| # | Name | Founder's Badge | Contact Number | Gender | Age | Address | Last Expired | Days Inactive |
| :---: | :--- | :---: | :--- | :---: | :---: | :--- | :--- | :---: |
`;

  recentInactive.forEach((m, idx) => {
    const expStr = m.lastActiveExpiration ? formatDateStr(m.lastActiveExpiration) : 'Never/N/A';
    const founderBadge = m.isFounder ? '⭐ **FOUNDER**' : '—';
    md += `| ${idx + 1} | **${m.name}** | ${founderBadge} | \`${m.contactNumber}\` | ${m.gender} | ${m.age} | ${m.address} | ${expStr} | **${m.daysExpired}d ago** |\n`;
  });

  md += `\n---\n\n## 2. 🎯 Category 2: Very Old Inactive (More than 45 Days)
> **Campaign Goal**: Long-term win-back campaign, survey why they left, major re-activation offers. Highlight their permanent Founder legacy!

| # | Name | Founder's Badge | Contact Number | Gender | Age | Address | Last Expired | Days Inactive |
| :---: | :--- | :---: | :--- | :---: | :---: | :--- | :--- | :---: |
`;

  veryOldInactive.forEach((m, idx) => {
    const expStr = m.lastActiveExpiration ? formatDateStr(m.lastActiveExpiration) : 'Never/N/A';
    const daysStr = m.daysExpired === 9999 ? 'No Exp Record' : `${m.daysExpired}d ago`;
    const founderBadge = m.isFounder ? '⭐ **FOUNDER**' : '—';
    md += `| ${idx + 1} | **${m.name}** | ${founderBadge} | \`${m.contactNumber}\` | ${m.gender} | ${m.age} | ${m.address} | ${expStr} | ${daysStr} |\n`;
  });

  const outDir = path.join(process.cwd(), 'reports_output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const mdFilePath = path.join(outDir, 'inactive_members_campaign_with_founders.md');
  fs.writeFileSync(mdFilePath, md, 'utf-8');
  console.log(`\n✓ Saved updated campaign report to: ${mdFilePath}`);

  // Build CSV with Founder's Badge Column
  let csv = 'Category,Name,Founder Badge,Contact Number,Gender,Age,Address,Last Expired,Days Inactive\n';
  recentInactive.forEach(m => {
    const expStr = m.lastActiveExpiration ? formatDateStr(m.lastActiveExpiration) : 'N/A';
    const founder = m.isFounder ? 'YES' : 'NO';
    csv += `"Most Recent (<=45d)","${m.name.replace(/"/g, '""')}","${founder}","${m.contactNumber}","${m.gender}","${m.age}","${m.address.replace(/"/g, '""')}","${expStr}",${m.daysExpired}\n`;
  });
  veryOldInactive.forEach(m => {
    const expStr = m.lastActiveExpiration ? formatDateStr(m.lastActiveExpiration) : 'N/A';
    const founder = m.isFounder ? 'YES' : 'NO';
    const days = m.daysExpired === 9999 ? 'N/A' : m.daysExpired;
    csv += `"Very Old (>45d)","${m.name.replace(/"/g, '""')}","${founder}","${m.contactNumber}","${m.gender}","${m.age}","${m.address.replace(/"/g, '""')}","${expStr}",${days}\n`;
  });

  const csvFilePath = path.join(outDir, 'inactive_members_campaign_with_founders.csv');
  fs.writeFileSync(csvFilePath, csv, 'utf-8');
  console.log(`✓ Saved updated Excel/CSV to: ${csvFilePath}`);

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
