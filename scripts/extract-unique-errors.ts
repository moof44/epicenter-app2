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

interface RawErrorDoc {
  id: string;
  message: string;
  name?: string;
  stack?: string;
  componentStack?: string;
  url: string;
  timestamp: any;
  user?: {
    uid: string;
    displayName: string;
    email?: string;
    roles?: string[];
  } | null;
  userAgent: string;
  severity: 'FATAL' | 'ERROR' | 'WARNING';
  status: 'UNRESOLVED' | 'RESOLVED';
  count: number;
  lastOccurredAt: any;
}

interface GroupedError {
  signature: string;
  sampleMessage: string;
  errorName: string;
  severity: 'FATAL' | 'ERROR' | 'WARNING';
  status: 'UNRESOLVED' | 'RESOLVED';
  totalOccurrences: number; // sum of count
  incidentDocsCount: number; // how many docs merged
  firstSeen: Date;
  lastSeen: Date;
  affectedUrls: string[];
  affectedUsers: string[];
  userAgents: string[];
  cleanStack: string;
  rawSampleDocId: string;
}

function parseToDate(val: any): Date {
  if (!val) return new Date(0);
  if (val instanceof Date) return val;
  if (val.toDate && typeof val.toDate === 'function') return val.toDate();
  if (val.seconds) return new Date(val.seconds * 1000);
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

function normalizeErrorMessage(msg: string): string {
  if (!msg) return 'Unknown Error';
  let cleaned = msg.trim();
  // Strip dynamic Firebase doc IDs, hashes, timestamps, URLs query params
  cleaned = cleaned.replace(/[0-9a-fA-F]{20,}/g, '<DOC_ID>');
  cleaned = cleaned.replace(/\b[0-9a-fA-F]{8}\b/g, '<HASH>');
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '<URL>');
  cleaned = cleaned.replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?\b/g, '<TIMESTAMP>');
  cleaned = cleaned.replace(/\s+/g, ' ');
  return cleaned;
}

function generateSignature(doc: RawErrorDoc): string {
  const normMsg = normalizeErrorMessage(doc.message);
  const name = doc.name || 'Error';
  
  // Extract top 2 significant lines from stack if present
  let stackSig = '';
  if (doc.stack) {
    const lines = doc.stack
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.startsWith('at ') && !l.includes('zone.js') && !l.includes('node_modules/@angular/core'));
    if (lines.length > 0) {
      // sanitize file hashes or chunk names e.g. chunk-XYZ.js:123:45
      stackSig = lines.slice(0, 2).map(l => l.replace(/chunk-[A-Za-z0-9_-]+\.js/g, 'chunk.js').replace(/:\d+:\d+/g, '')).join(' | ');
    }
  }

  // Base path of URL without query or hash or dynamic IDs
  let urlPath = doc.url || '/';
  try {
    const parsedUrl = new URL(doc.url.startsWith('http') ? doc.url : `http://localhost${doc.url}`);
    urlPath = parsedUrl.pathname.replace(/[0-9a-zA-Z_-]{20,}/g, '<ID>');
  } catch {
    urlPath = doc.url.split('?')[0];
  }

  return `${name}::${normMsg}::${stackSig || urlPath}`;
}

async function extractAndExportErrors() {
  console.log('1. Fetching all system_errors from Firestore...');
  const snap = await getDocs(collection(db, 'system_errors'));
  console.log(`Fetched ${snap.size} total error records.`);

  const rawDocs: RawErrorDoc[] = [];
  snap.forEach(d => {
    rawDocs.push({ id: d.id, ...(d.data() as any) });
  });

  // Target window: Last 30 Days (from current execution time 2026-10-11)
  const now = new Date('2026-10-11T14:40:00+08:00');
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 2026-09-11
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);   // 2026-10-04

  console.log(`Filter range: ${thirtyDaysAgo.toISOString()} to ${now.toISOString()}`);

  const recentDocs = rawDocs.filter(d => {
    const date = parseToDate(d.lastOccurredAt || d.timestamp);
    return date >= thirtyDaysAgo;
  });

  console.log(`Found ${recentDocs.length} errors occurred in the last 30 days.`);

  // Group and deduplicate
  const groups = new Map<string, GroupedError>();

  for (const doc of recentDocs) {
    const sig = generateSignature(doc);
    const docTime = parseToDate(doc.lastOccurredAt || doc.timestamp);
    const count = typeof doc.count === 'number' && doc.count > 0 ? doc.count : 1;

    let group = groups.get(sig);
    if (!group) {
      group = {
        signature: sig,
        sampleMessage: doc.message,
        errorName: doc.name || 'Error',
        severity: doc.severity || 'ERROR',
        status: doc.status || 'UNRESOLVED',
        totalOccurrences: 0,
        incidentDocsCount: 0,
        firstSeen: docTime,
        lastSeen: docTime,
        affectedUrls: [],
        affectedUsers: [],
        userAgents: [],
        cleanStack: doc.stack || doc.componentStack || 'No stack trace available',
        rawSampleDocId: doc.id
      };
      groups.set(sig, group);
    }

    group.totalOccurrences += count;
    group.incidentDocsCount += 1;
    if (docTime < group.firstSeen) group.firstSeen = docTime;
    if (docTime > group.lastSeen) group.lastSeen = docTime;

    if (doc.url && !group.affectedUrls.includes(doc.url)) {
      group.affectedUrls.push(doc.url);
    }

    const userName = doc.user?.displayName || doc.user?.email || (doc.user?.uid ? `UID: ${doc.user.uid}` : null);
    if (userName && !group.affectedUsers.includes(userName)) {
      group.affectedUsers.push(userName);
    }

    if (doc.userAgent && !group.userAgents.includes(doc.userAgent)) {
      group.userAgents.push(doc.userAgent);
    }

    // Keep highest severity if any incident is FATAL
    if (doc.severity === 'FATAL') group.severity = 'FATAL';
    if (doc.status === 'UNRESOLVED') group.status = 'UNRESOLVED'; // flag unresolved if any doc is unresolved
  }

  // Sort groups by: Last Seen Descending, then totalOccurrences Descending
  const sortedGroups = Array.from(groups.values()).sort((a, b) => {
    const timeDiff = b.lastSeen.getTime() - a.lastSeen.getTime();
    if (timeDiff !== 0) return timeDiff;
    return b.totalOccurrences - a.totalOccurrences;
  });

  console.log(`Deduplicated into ${sortedGroups.length} unique error signatures!`);

  // Target directory
  const outputDir = path.resolve(process.cwd(), 'reports_output', 'error_logs_analysis');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 1. JSON Export
  const jsonExportPath = path.join(outputDir, 'unique_errors_last_30_days.json');
  fs.writeFileSync(jsonExportPath, JSON.stringify(sortedGroups, null, 2), 'utf-8');
  console.log(`✓ JSON saved to ${jsonExportPath}`);

  // 2. Markdown Report
  let mdContent = `# 🚨 System Error Logs Analysis Report (Last 30 Days)
**Generated**: ${now.toLocaleString()}  
**Scope**: Last 30 Days (${thirtyDaysAgo.toISOString().split('T')[0]} to ${now.toISOString().split('T')[0]})  
**Raw Errors Analyzed**: ${recentDocs.length} error documents  
**Total Impacted Events (Sum of Occurrence Counters)**: ${sortedGroups.reduce((acc, g) => acc + g.totalOccurrences, 0)}  
**Deduplicated Unique Errors**: ${sortedGroups.length} distinct issues  

---

## 📊 Summary by Severity & Recency

| Severity | Unique Error Signatures | Total Event Count | Unresolved |
| :--- | :--- | :--- | :--- |
| **FATAL** | ${sortedGroups.filter(g => g.severity === 'FATAL').length} | ${sortedGroups.filter(g => g.severity === 'FATAL').reduce((acc, g) => acc + g.totalOccurrences, 0)} | ${sortedGroups.filter(g => g.severity === 'FATAL' && g.status === 'UNRESOLVED').length} |
| **ERROR** | ${sortedGroups.filter(g => g.severity === 'ERROR').length} | ${sortedGroups.filter(g => g.severity === 'ERROR').reduce((acc, g) => acc + g.totalOccurrences, 0)} | ${sortedGroups.filter(g => g.severity === 'ERROR' && g.status === 'UNRESOLVED').length} |
| **WARNING** | ${sortedGroups.filter(g => g.severity === 'WARNING').length} | ${sortedGroups.filter(g => g.severity === 'WARNING').reduce((acc, g) => acc + g.totalOccurrences, 0)} | ${sortedGroups.filter(g => g.severity === 'WARNING' && g.status === 'UNRESOLVED').length} |

> **Past 7 Days High-Priority Errors**: ${sortedGroups.filter(g => g.lastSeen >= sevenDaysAgo).length} unique issues active in the last week.

---

## 📋 Ranked Unique Errors (Sorted by Recency & Frequency)

`;

  sortedGroups.forEach((group, index) => {
    const isPastWeek = group.lastSeen >= sevenDaysAgo;
    const badge = isPastWeek ? '🔥 ACTIVE RECENTLY' : '🕒 INACTIVE PAST WEEK';
    const severityBadge = group.severity === 'FATAL' ? '🔴 FATAL' : (group.severity === 'ERROR' ? '🟠 ERROR' : '🟡 WARNING');
    const statusBadge = group.status === 'UNRESOLVED' ? '⚠️ UNRESOLVED' : '✅ RESOLVED';

    mdContent += `### #${index + 1}. [${severityBadge}] ${group.errorName}: ${group.sampleMessage.slice(0, 120)}
- **Badge**: \`${badge}\` | Status: \`${statusBadge}\`
- **Total Occurrences**: **${group.totalOccurrences}** (across ${group.incidentDocsCount} log docs)
- **Last Seen**: **${group.lastSeen.toLocaleString()}**
- **First Seen**: ${group.firstSeen.toLocaleString()}
- **Affected URL(s)**: ${group.affectedUrls.map(u => `\`${u}\``).join(', ') || 'N/A'}
- **Affected User(s)**: ${group.affectedUsers.map(u => `\`${u}\``).join(', ') || 'Anonymous / Guest'}
- **Sample Document ID**: \`${group.rawSampleDocId}\`

#### Error Message:
\`\`\`text
${group.sampleMessage}
\`\`\`

#### Stack Trace:
\`\`\`text
${group.cleanStack}
\`\`\`

---
`;
  });

  const mdExportPath = path.join(outputDir, 'unique_errors_last_30_days.md');
  fs.writeFileSync(mdExportPath, mdContent, 'utf-8');
  console.log(`✓ Markdown summary saved to ${mdExportPath}`);

  // 3. CSV Export
  const csvHeaders = ['Index', 'Severity', 'Status', 'ErrorName', 'TotalOccurrences', 'FirstSeen', 'LastSeen', 'Urls', 'Users', 'SampleMessage', 'SampleDocId'];
  const escapeCsv = (str: any) => `"${String(str || '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;

  const csvRows = sortedGroups.map((g, idx) => [
    idx + 1,
    g.severity,
    g.status,
    g.errorName,
    g.totalOccurrences,
    g.firstSeen.toISOString(),
    g.lastSeen.toISOString(),
    g.affectedUrls.join('; '),
    g.affectedUsers.join('; '),
    g.sampleMessage,
    g.rawSampleDocId
  ].map(escapeCsv).join(','));

  const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
  const csvExportPath = path.join(outputDir, 'unique_errors_last_30_days.csv');
  fs.writeFileSync(csvExportPath, csvContent, 'utf-8');
  console.log(`✓ CSV spreadsheet saved to ${csvExportPath}`);
}

extractAndExportErrors().catch(console.error);
