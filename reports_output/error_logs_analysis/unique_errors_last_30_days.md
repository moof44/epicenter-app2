# 🚨 System Error Logs Analysis Report (Last 30 Days)
**Generated**: 10/11/2026, 2:40:00 PM  
**Scope**: Last 30 Days (2026-09-11 to 2026-10-11)  
**Raw Errors Analyzed**: 157 error documents  
**Total Impacted Events (Sum of Occurrence Counters)**: 178  
**Deduplicated Unique Errors**: 12 distinct issues  

---

## 📊 Summary by Severity & Recency

| Severity | Unique Error Signatures | Total Event Count | Unresolved |
| :--- | :--- | :--- | :--- |
| **FATAL** | 2 | 6 | 2 |
| **ERROR** | 10 | 172 | 10 |
| **WARNING** | 0 | 0 | 0 |

> **Past 7 Days High-Priority Errors**: 6 unique issues active in the last week.

---

## 📋 Ranked Unique Errors (Sorted by Recency & Frequency)

### #1. [🟠 ERROR] FirebaseError: Initialization of query 'Query(target=Target(users/DLeJiN380uOam4ntbdGCSYHjRe73/notifications, limit: 50, orderBy: [time
- **Badge**: `🔥 ACTIVE RECENTLY` | Status: `⚠️ UNRESOLVED`
- **Total Occurrences**: **1** (across 1 log docs)
- **Last Seen**: **10/11/2026, 2:26:21 PM**
- **First Seen**: 10/11/2026, 2:26:21 PM
- **Affected URL(s)**: `/staff-attendance`
- **Affected User(s)**: `Jireh Padua`
- **Sample Document ID**: `altlLS3rTty20tJbFfAZ`

#### Error Message:
```text
Initialization of query 'Query(target=Target(users/DLeJiN380uOam4ntbdGCSYHjRe73/notifications, limit: 50, orderBy: [timestamp (desc), __name__ (desc)]); limitType=F)' failed: IndexedDbTransactionError: [code=unavailable]: IndexedDB transaction 'Allocate target' failed: UnknownError: Internal error opening backing store for indexedDB.open.
```

#### Stack Trace:
```text
FirebaseError: Initialization of query 'Query(target=Target(users/DLeJiN380uOam4ntbdGCSYHjRe73/notifications, limit: 50, orderBy: [timestamp (desc), __name__ (desc)]); limitType=F)' failed: IndexedDbTransactionError: [code=unavailable]: IndexedDB transaction 'Allocate target' failed: UnknownError: Internal error opening backing store for indexedDB.open.
```

---
### #2. [🟠 ERROR] FirebaseError: Initialization of query 'Query(target=Target(users, orderBy: [__name__ (asc)]); limitType=F)' failed: IndexedDbTransacti
- **Badge**: `🔥 ACTIVE RECENTLY` | Status: `⚠️ UNRESOLVED`
- **Total Occurrences**: **1** (across 1 log docs)
- **Last Seen**: **10/11/2026, 2:26:21 PM**
- **First Seen**: 10/11/2026, 2:26:21 PM
- **Affected URL(s)**: `/shift-schedules`
- **Affected User(s)**: `Jireh Padua`
- **Sample Document ID**: `7ZlUTkmfYTcq5D7BlGu4`

#### Error Message:
```text
Initialization of query 'Query(target=Target(users, orderBy: [__name__ (asc)]); limitType=F)' failed: IndexedDbTransactionError: [code=unavailable]: IndexedDB transaction 'Allocate target' failed: UnknownError: Internal error opening backing store for indexedDB.open.
```

#### Stack Trace:
```text
FirebaseError: Initialization of query 'Query(target=Target(users, orderBy: [__name__ (asc)]); limitType=F)' failed: IndexedDbTransactionError: [code=unavailable]: IndexedDB transaction 'Allocate target' failed: UnknownError: Internal error opening backing store for indexedDB.open.
```

---
### #3. [🟠 ERROR] Error: NG02100
- **Badge**: `🔥 ACTIVE RECENTLY` | Status: `⚠️ UNRESOLVED`
- **Total Occurrences**: **127** (across 120 log docs)
- **Last Seen**: **10/10/2026, 10:17:05 PM**
- **First Seen**: 9/11/2026, 3:07:50 PM
- **Affected URL(s)**: `/store/cash`, `/dashboard`, `/store/monthly-sales`, `/profile`, `/shift-schedules`
- **Affected User(s)**: `Aljay Tindoy`, `Lauren Val Manuel`, `Kris Ragam Manuel`, `Jireh Padua`
- **Sample Document ID**: `1gymVl5JCEaz51DGP7Si`

#### Error Message:
```text
NG02100
```

#### Stack Trace:
```text
Error: NG02100
    at Us (https://epicenter-app.web.app/chunk-BW7RIKW5.js:1:59723)
    at n.transform (https://epicenter-app.web.app/chunk-BW7RIKW5.js:1:69847)
    at ng (https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:93386)
    at eb (https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:94170)
    at Ft (https://epicenter-app.web.app/chunk-PF6IKNRJ.js:1:10039)
    at gp (https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:22730)
    at GI (https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:28150)
    at ic (https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:29355)
    at Mp (https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:29187)
    at _p (https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:28927)
```

---
### #4. [🟠 ERROR] Error: Action requires authentication
- **Badge**: `🔥 ACTIVE RECENTLY` | Status: `⚠️ UNRESOLVED`
- **Total Occurrences**: **14** (across 2 log docs)
- **Last Seen**: **10/10/2026, 6:21:47 PM**
- **First Seen**: 10/10/2026, 6:19:17 PM
- **Affected URL(s)**: `/attendance`
- **Affected User(s)**: Anonymous / Guest
- **Sample Document ID**: `1LocsaPXoluh7GUsFcoE`

#### Error Message:
```text
Action requires authentication
```

#### Stack Trace:
```text
Error: Action requires authentication
    at p.get _currentUserSnapshot [as _currentUserSnapshot] (https://epicenter-app.web.app/chunk-VARGY3HH.js:1:595)
    at p.checkOut (https://epicenter-app.web.app/chunk-VARGY3HH.js:1:3324)
    at t.checkOut (https://epicenter-app.web.app/chunk-J4ACQWRH.js:3:23572)
    at https://epicenter-app.web.app/chunk-J4ACQWRH.js:3:20880
    at $d (https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:39961)
    at r (https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:39797)
    at HTMLButtonElement.<anonymous> (https://epicenter-app.web.app/chunk-H6UBN4VS.js:1:6991)
```

---
### #5. [🟠 ERROR] Error: NG0750
- **Badge**: `🔥 ACTIVE RECENTLY` | Status: `⚠️ UNRESOLVED`
- **Total Occurrences**: **9** (across 9 log docs)
- **Last Seen**: **10/9/2026, 8:21:53 PM**
- **First Seen**: 9/16/2026, 7:56:37 PM
- **Affected URL(s)**: `/dashboard`
- **Affected User(s)**: `Angelito Miranda`
- **Sample Document ID**: `EDa5ELoxLMCfpN05PazY`

#### Error Message:
```text
NG0750
```

#### Stack Trace:
```text
T@https://epicenter-app.web.app/chunk-5XXSSO2E.js:3:34498
@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:71836
```

---
### #6. [🟠 ERROR] Error: NG02100
- **Badge**: `🔥 ACTIVE RECENTLY` | Status: `⚠️ UNRESOLVED`
- **Total Occurrences**: **6** (across 6 log docs)
- **Last Seen**: **10/9/2026, 7:59:27 PM**
- **First Seen**: 9/11/2026, 9:54:12 PM
- **Affected URL(s)**: `/store/cash`
- **Affected User(s)**: `Aljay Tindoy`
- **Sample Document ID**: `BqvDlfbHBhzxJrCUmxxb`

#### Error Message:
```text
NG02100
```

#### Stack Trace:
```text
Us@https://epicenter-app.web.app/chunk-BW7RIKW5.js:1:59729
transform@https://epicenter-app.web.app/chunk-BW7RIKW5.js:1:69849
ng@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:93390
Ft@https://epicenter-app.web.app/chunk-PF6IKNRJ.js:1:10040
gp@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:22731
GI@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:28152
ic@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:29357
Mp@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:29189
_p@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:28929
GI@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:28322
ic@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:29357
Mp@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:29189
_p@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:28929
GI@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:28322
ic@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:29357
Mp@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:29189
_p@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:28929
GI@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:28322
ic@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:29357
Mp@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:29189
QI@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:29125
Np@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:29535
GI@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:28507
ic@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:29357
Mp@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:29189
_p@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:28929
GI@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:28322
ic@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:29357
Mp@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:29189
QI@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:29125
Np@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:29535
GI@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:28507
ic@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:29357
WI@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:27840
Tp@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:27771
synchronizeOnce@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:69830
synchronize@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:69502
tickImpl@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:1817
_tick@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:68988
@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:97437
tick@https://epicenter-app.web.app/chunk-5XXSSO2E.js:5:97394
@https://epicenter-app.web.app/chunk-5XXSSO2E.js:4:17096
```

---
### #7. [🟠 ERROR] Error: You have provided invalid Date format. Please provide a valid JavaScript Date
- **Badge**: `🕒 INACTIVE PAST WEEK` | Status: `⚠️ UNRESOLVED`
- **Total Occurrences**: **11** (across 9 log docs)
- **Last Seen**: **9/29/2026, 9:13:33 AM**
- **First Seen**: 9/11/2026, 11:05:23 PM
- **Affected URL(s)**: `/reports`
- **Affected User(s)**: `Jireh Padua`
- **Sample Document ID**: `8xhLqb0jQPrKz6EOQVSd`

#### Error Message:
```text
You have provided invalid Date format. Please provide a valid JavaScript Date
```

#### Stack Trace:
```text
Error: You have provided invalid Date format. Please provide a valid JavaScript Date
    at l (https://epicenter-app.web.app/chunk-HD5SNT5W.js:27:135124)
    at A.parseDataAxisCharts (https://epicenter-app.web.app/chunk-HD5SNT5W.js:27:136429)
    at A.parseData (https://epicenter-app.web.app/chunk-HD5SNT5W.js:27:143434)
    at A.create (https://epicenter-app.web.app/chunk-HD5SNT5W.js:833:3661)
    at https://epicenter-app.web.app/chunk-HD5SNT5W.js:833:2238
    at new Promise (<anonymous>)
    at A.render (https://epicenter-app.web.app/chunk-HD5SNT5W.js:833:1221)
    at https://epicenter-app.web.app/chunk-ROBBX7DT.js:1:2302
    at rr.runOutsideAngular (https://epicenter-app.web.app/chunk-5XXSSO2E.js:4:20369)
    at o.render (https://epicenter-app.web.app/chunk-ROBBX7DT.js:1:2258)
```

---
### #8. [🟠 ERROR] FirebaseError: Firebase: Error (auth/network-request-failed).
- **Badge**: `🕒 INACTIVE PAST WEEK` | Status: `⚠️ UNRESOLVED`
- **Total Occurrences**: **1** (across 1 log docs)
- **Last Seen**: **9/22/2026, 7:35:09 AM**
- **First Seen**: 9/22/2026, 7:35:09 AM
- **Affected URL(s)**: `/`
- **Affected User(s)**: Anonymous / Guest
- **Sample Document ID**: `9BBuVC7oGYKUOsqJ6Vyp`

#### Error Message:
```text
Firebase: Error (auth/network-request-failed).
```

#### Stack Trace:
```text
FirebaseError: Firebase: Error (auth/network-request-failed).
    at Zh (https://epicenter-app.web.app/chunk-BW7RIKW5.js:3:4505)
    at Ut (https://epicenter-app.web.app/chunk-BW7RIKW5.js:3:4052)
    at Zy (https://epicenter-app.web.app/chunk-BW7RIKW5.js:3:10360)
    at async Bb (https://epicenter-app.web.app/chunk-BW7RIKW5.js:3:15746)
    at async n.refresh (https://epicenter-app.web.app/chunk-BW7RIKW5.js:3:17185)
    at async n.getToken (https://epicenter-app.web.app/chunk-BW7RIKW5.js:3:17013)
    at async Gs (https://epicenter-app.web.app/chunk-BW7RIKW5.js:3:13407)
    at async n.getIdToken (https://epicenter-app.web.app/chunk-BW7RIKW5.js:3:18767)
    at async td (https://epicenter-app.web.app/chunk-BW7RIKW5.js:3:12504)
```

---
### #9. [🔴 FATAL] TypeError: Failed to fetch dynamically imported module: https://epicenter-app.web.app/chunk-ODYOBKR4.js
- **Badge**: `🕒 INACTIVE PAST WEEK` | Status: `⚠️ UNRESOLVED`
- **Total Occurrences**: **2** (across 2 log docs)
- **Last Seen**: **9/18/2026, 9:37:21 AM**
- **First Seen**: 9/18/2026, 9:37:21 AM
- **Affected URL(s)**: `/`
- **Affected User(s)**: Anonymous / Guest
- **Sample Document ID**: `3hhluJNGLyAy3a9rUHXL`

#### Error Message:
```text
Failed to fetch dynamically imported module: https://epicenter-app.web.app/chunk-ODYOBKR4.js
```

#### Stack Trace:
```text
TypeError: Failed to fetch dynamically imported module: https://epicenter-app.web.app/chunk-ODYOBKR4.js
```

---
### #10. [🔴 FATAL] TypeError: Importing a module script failed.
- **Badge**: `🕒 INACTIVE PAST WEEK` | Status: `⚠️ UNRESOLVED`
- **Total Occurrences**: **4** (across 4 log docs)
- **Last Seen**: **9/17/2026, 9:16:05 PM**
- **First Seen**: 9/17/2026, 7:28:36 PM
- **Affected URL(s)**: `/`
- **Affected User(s)**: Anonymous / Guest
- **Sample Document ID**: `X1acPMDppiNqMHd5nFPi`

#### Error Message:
```text
Importing a module script failed.
```

#### Stack Trace:
```text
No stack trace available
```

---
### #11. [🟠 ERROR] Error: NG04002: 'logout'
- **Badge**: `🕒 INACTIVE PAST WEEK` | Status: `⚠️ UNRESOLVED`
- **Total Occurrences**: **1** (across 1 log docs)
- **Last Seen**: **9/15/2026, 10:37:56 PM**
- **First Seen**: 9/15/2026, 10:37:56 PM
- **Affected URL(s)**: `/`
- **Affected User(s)**: Anonymous / Guest
- **Sample Document ID**: `MGOmfBWJz4kQSr2ECm4d`

#### Error Message:
```text
NG04002: 'logout'
```

#### Stack Trace:
```text
Error: NG04002: 'logout'
    at Gi.noMatchError (https://epicenter-app.web.app/chunk-NBFPB53G.js:1:42791)
    at Gi.match (https://epicenter-app.web.app/chunk-NBFPB53G.js:1:43532)
    at async Gi.recognize (https://epicenter-app.web.app/chunk-NBFPB53G.js:1:42930)
    at async https://epicenter-app.web.app/chunk-NBFPB53G.js:1:47409
```

---
### #12. [🟠 ERROR] UnknownError: Attempt to iterate a cursor that doesn't exist
 UnknownError: Attempt to iterate a cursor that doesn't exist
- **Badge**: `🕒 INACTIVE PAST WEEK` | Status: `⚠️ UNRESOLVED`
- **Total Occurrences**: **1** (across 1 log docs)
- **Last Seen**: **9/14/2026, 8:01:46 PM**
- **First Seen**: 9/14/2026, 8:01:46 PM
- **Affected URL(s)**: `/members?search=venz`
- **Affected User(s)**: `Angelito Miranda`
- **Sample Document ID**: `Vx7F97Mgt767R6jFgxSS`

#### Error Message:
```text
Attempt to iterate a cursor that doesn't exist
 UnknownError: Attempt to iterate a cursor that doesn't exist
```

#### Stack Trace:
```text
No stack trace available
```

---
