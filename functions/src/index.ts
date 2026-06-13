import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { sendNotificationsToRoles } from './helpers/notifier';

admin.initializeApp();

/**
 * Creates a new staff account.
 * This function must be called by an ADMIN user.
 */
export const createStaffAccount = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
    // 1. Security Check
    if (!context.auth || !context.auth.token.roles || !context.auth.token.roles.includes('ADMIN')) {
        throw new functions.https.HttpsError(
            'permission-denied',
            'Only admins can create new accounts.'
        );
    }

    const { email, password, displayName, roles, profileData } = data;

    // Basic Validation
    if (!email || !password || !displayName || !roles || !Array.isArray(roles) || roles.length === 0) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Missing required fields: email, password, displayName, roles.'
        );
    }

    try {
        // 2. Create Auth User
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName,
        });

        const uid = userRecord.uid;

        // 3. Set Custom Claims for Roles
        await admin.auth().setCustomUserClaims(uid, { roles });

        // 4. Save Profile to Firestore
        const userDoc = {
            uid,
            email,
            displayName,
            roles,
            ...profileData, // phone, address, etc.
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await admin.firestore().collection('users').doc(uid).set(userDoc);

        return { success: true, uid };

    } catch (error: any) {
        console.error('Error creating staff account:', error);
        if (error.code === 'auth/email-already-exists') {
            throw new functions.https.HttpsError('already-exists', 'The email address is already in use.');
        }
        throw new functions.https.HttpsError('internal', 'Unable to create account.', error);
    }
});

/**
 * Updates an existing staff account.
 * This function must be called by an ADMIN user.
 */
export const updateStaffAccount = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
    // 1. Security Check
    if (!context.auth || !context.auth.token.roles || !context.auth.token.roles.includes('ADMIN')) {
        throw new functions.https.HttpsError(
            'permission-denied',
            'Only admins can update accounts.'
        );
    }

    const { uid, password, displayName, roles, profileData } = data;

    if (!uid) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required field: uid.');
    }

    try {
        // 2. Update Auth User (if password or displayName changed)
        const updateRequest: admin.auth.UpdateRequest = {};
        if (password) updateRequest.password = password;
        if (displayName) updateRequest.displayName = displayName;

        if (Object.keys(updateRequest).length > 0) {
            await admin.auth().updateUser(uid, updateRequest);
        }

        // 3. Update Custom Claims (if roles changed)
        if (roles && Array.isArray(roles)) {
            await admin.auth().setCustomUserClaims(uid, { roles });
        }

        // 4. Update Firestore Profile
        // We use merge: true implicitly by using update() or just partial object
        // NOTE: If roles is NOT provided, we shouldn't wipe it.
        const firestoreUpdate: any = {};
        if (displayName) firestoreUpdate.displayName = displayName;
        if (roles) firestoreUpdate.roles = roles;
        if (profileData) {
            // Flatten profile data or just spread it if structure matches
            // We assume profileData fields are top-level or match User model
            if (profileData.phone) firestoreUpdate.phone = profileData.phone;
            if (profileData.address) firestoreUpdate.address = profileData.address;
        }

        firestoreUpdate.updatedAt = admin.firestore.FieldValue.serverTimestamp();

        await admin.firestore().collection('users').doc(uid).update(firestoreUpdate);

        return { success: true, uid };

    } catch (error: any) {
        console.error('Error updating staff account:', error);
        throw new functions.https.HttpsError('internal', 'Unable to update account.', error);
    }
});

/**
 * Deletes a staff account.
 * This function must be called by an ADMIN user.
 */
/**
 * Toggles the status of a staff account (Soft Delete).
 * This function must be called by an ADMIN user.
 */
export const toggleStaffStatus = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
    // 1. Security Check
    if (!context.auth || !context.auth.token.roles || !context.auth.token.roles.includes('ADMIN')) {
        throw new functions.https.HttpsError(
            'permission-denied',
            'Only admins can change account status.'
        );
    }

    const { uid, isActive } = data;

    if (!uid || typeof isActive !== 'boolean') {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: uid, isActive.');
    }

    try {
        // 2. Toggle Auth User Disabled State
        // if isActive is true, we want disabled to be false
        await admin.auth().updateUser(uid, {
            disabled: !isActive
        });

        // 3. Update Firestore Profile Status
        await admin.firestore().collection('users').doc(uid).update({
            isActive: isActive,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, uid, isActive };

    } catch (error: any) {
        console.error('Error toggling staff status:', error);
        throw new functions.https.HttpsError('internal', 'Unable to change account status.', error);
    }
});

/**
 * Forcefully logs out all users by revoking refresh tokens and updating a global timestamp.
 * This function must be called by an ADMIN user.
 */
export const emergencyLogoutAll = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
    // 1. Security Check
    if (!context.auth || !context.auth.token.roles || !context.auth.token.roles.includes('ADMIN')) {
        throw new functions.https.HttpsError(
            'permission-denied',
            'Only admins can perform emergency logout.'
        );
    }

    try {
        // 2. Revoke Refresh Tokens for ALL Users
        // Note: listUsers() retrieves max 1000 users at a time. For large scale, we need pagination.
        // For this project size, we'll assume < 1000 or iterate if needed.
        let nextPageToken;
        let count = 0;

        do {
            const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
            const uids = listUsersResult.users.map(u => u.uid);

            // Revoke tokens in parallel batches
            // Note: revokeRefreshTokens is per user.
            await Promise.all(uids.map(uid => admin.auth().revokeRefreshTokens(uid)));

            count += uids.length;
            nextPageToken = listUsersResult.pageToken;
        } while (nextPageToken);

        // 3. Update Global Signal in Firestore
        // This triggers the client-side listener to logout immediately.
        await admin.firestore().collection('system').doc('settings').set({
            minAuthTimestamp: admin.firestore.FieldValue.serverTimestamp(),
            lastEmergencyLogoutBy: context.auth.uid,
            lastEmergencyLogoutAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        return { success: true, userCount: count };

    } catch (error: any) {
        console.error('Error in emergency logout:', error);
        throw new functions.https.HttpsError('internal', 'Emergency logout failed.', error);
    }
});

/**
 * Creates a new portal account for a member.
 * Only callable by authenticated staff members (ADMIN, MANAGER, STAFF, TRAINER).
 */
export const createMemberPortalAccount = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
    // 1. Security Check: Must be authenticated and have staff role
    if (!context.auth || !context.auth.token.roles || 
        !context.auth.token.roles.some((r: string) => ['ADMIN', 'MANAGER', 'STAFF', 'TRAINER'].includes(r))) {
        throw new functions.https.HttpsError(
            'permission-denied',
            'Only gym staff can create member portal accounts.'
        );
    }

    const { memberId } = data;
    if (!memberId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required field: memberId.');
    }

    try {
        const db = admin.firestore();

        // 2. Fetch the member doc
        const memberRef = db.collection('members').doc(memberId);
        const memberSnap = await memberRef.get();
        if (!memberSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Member not found.');
        }

        const memberData = memberSnap.data() || {};
        const phone = memberData.contactNumber;
        const birthdayVal = memberData.birthday;

        if (!phone) {
            throw new functions.https.HttpsError('failed-precondition', 'Member does not have a contact number registered.');
        }
        if (!birthdayVal) {
            throw new functions.https.HttpsError('failed-precondition', 'Member does not have a birthdate registered.');
        }

        // Normalize Phone Number (strip non-digits, replace starting +63 or 63 with 0)
        let cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.startsWith('63')) {
            cleanPhone = '0' + cleanPhone.substring(2);
        } else if (cleanPhone.length === 10 && cleanPhone.startsWith('9')) {
            cleanPhone = '0' + cleanPhone;
        }

        if (cleanPhone.length !== 11) {
            throw new functions.https.HttpsError('failed-precondition', `Invalid phone number format: "${phone}". Must be an 11-digit mobile number.`);
        }

        // Format Birthday PIN (from Firestore Date/Timestamp to MMDDYYYY string)
        let birthdayDate: Date;
        if (birthdayVal.toDate && typeof birthdayVal.toDate === 'function') {
            birthdayDate = birthdayVal.toDate();
        } else {
            birthdayDate = new Date(birthdayVal);
        }

        if (isNaN(birthdayDate.getTime())) {
            throw new functions.https.HttpsError('failed-precondition', 'Invalid birthdate format registered.');
        }

        const mm = String(birthdayDate.getMonth() + 1).padStart(2, '0');
        const dd = String(birthdayDate.getDate()).padStart(2, '0');
        const yyyy = String(birthdayDate.getFullYear());
        const birthdayPin = `${mm}${dd}${yyyy}`; // MMDDYYYY PIN

        const email = `${cleanPhone}@epicentergym.ph`;

        // Check if user already exists in Auth
        let userRecord: admin.auth.UserRecord;
        try {
            userRecord = await admin.auth().getUserByEmail(email);
            
            // If user exists, we check if they already have portalUid set in member doc
            const portalUid = userRecord.uid;
            await memberRef.update({ portalUid });
            
            // Ensure the user's Firestore profile exists
            const userDocRef = db.collection('users').doc(portalUid);
            const userDocSnap = await userDocRef.get();
            if (!userDocSnap.exists) {
                await userDocRef.set({
                    uid: portalUid,
                    email,
                    displayName: memberData.name || '',
                    roles: ['MEMBER'],
                    memberId,
                    isActive: true,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }

            return { success: true, uid: portalUid, alreadyExisted: true };
        } catch (authError: any) {
            if (authError.code !== 'auth/user-not-found') {
                throw authError;
            }
            
            // Create a new Firebase Auth user
            userRecord = await admin.auth().createUser({
                email,
                password: birthdayPin,
                displayName: memberData.name || '',
            });

            const uid = userRecord.uid;

            // Set MEMBER custom claim
            await admin.auth().setCustomUserClaims(uid, { roles: ['MEMBER'] });

            // Create Firestore users document
            await db.collection('users').doc(uid).set({
                uid,
                email,
                displayName: memberData.name || '',
                roles: ['MEMBER'],
                memberId,
                isActive: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Backlink portalUid in members doc
            await memberRef.update({ portalUid: uid });

            return { success: true, uid };
        }
    } catch (error: any) {
        console.error('Error creating member portal account:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Unable to create member portal account.', error);
    }
});

/**
 * Generates a short-lived custom token for auto-logging in via QR code.
 * Only callable by authenticated staff members (ADMIN, MANAGER, STAFF, TRAINER).
 */
export const generatePortalLoginToken = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
    // 1. Security Check: Must be authenticated and have staff role
    if (!context.auth || !context.auth.token.roles || 
        !context.auth.token.roles.some((r: string) => ['ADMIN', 'MANAGER', 'STAFF', 'TRAINER'].includes(r))) {
        throw new functions.https.HttpsError(
            'permission-denied',
            'Only gym staff can generate login tokens.'
        );
    }

    const { memberId } = data;
    if (!memberId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required field: memberId.');
    }

    try {
        const db = admin.firestore();

        // Get member doc to retrieve portalUid
        const memberSnap = await db.collection('members').doc(memberId).get();
        if (!memberSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Member not found.');
        }

        const memberData = memberSnap.data() || {};
        const portalUid = memberData.portalUid;

        if (!portalUid) {
            throw new functions.https.HttpsError('failed-precondition', 'Member does not have a portal account created yet.');
        }

        // Generate Custom Login Token (JWT valid for 5 mins by default)
        const customToken = await admin.auth().createCustomToken(portalUid);

        return { success: true, token: customToken };
    } catch (error: any) {
        console.error('Error generating login token:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Unable to generate login token.', error);
    }
});

/**
 * Triggered when a new store sale transaction is completed.
 * Writes a formatted message to the global chat room.
 */
export const onTransactionCreated = functions.firestore.document('/transactions/{transactionId}').onCreate(async (snapshot, context) => {
    const transaction = snapshot.data() || {};
    const db = admin.firestore();

    const items = transaction.items || [];
    const itemsList = items.map((item: any) => `${item.productName}${item.quantity > 1 ? ' (x' + item.quantity + ')' : ''}`).join(', ');

    const content = `💰 **New Sale** by **${transaction.staffName || 'Staff'}**! Total: **$${transaction.totalAmount}** via **${transaction.paymentMethod || 'CASH'}** (Items: ${itemsList || 'None'}). Great job! 🚀`;

    await db.collection('chats/global/messages').add({
        senderId: 'system',
        senderName: 'GymBot',
        senderAvatar: '',
        content,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        type: 'system',
        metadata: {
            transactionType: 'STORE_SALE',
            referencedId: context.params.transactionId,
            amount: transaction.totalAmount
        }
    });
});

/**
 * Triggered when a transaction is updated (specifically voided).
 * Writes a warning message to the global chat room.
 */
export const onTransactionUpdated = functions.firestore.document('/transactions/{transactionId}').onUpdate(async (change, context) => {
    const before = change.before.data() || {};
    const after = change.after.data() || {};
    const db = admin.firestore();

    if (before.status !== 'VOID' && after.status === 'VOID') {
        const content = `⚠️ **Sale Voided** by **${after.voidedBy || 'Staff'}**! Sale ID: #${context.params.transactionId.slice(0, 8)}. Reason: ${after.voidReason || 'None'}`;
        await db.collection('chats/global/messages').add({
            senderId: 'system',
            senderName: 'GymBot',
            senderAvatar: '',
            content,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            type: 'system',
            metadata: {
                transactionType: 'STORE_SALE_VOIDED',
                referencedId: context.params.transactionId,
                amount: after.totalAmount
            }
        });

        // Trigger manager/admin notifications (Phase 2)
        await sendNotificationsToRoles(['ADMIN', 'MANAGER'], {
            title: '⚠️ Transaction Voided',
            body: `Sale #${context.params.transactionId.slice(0, 8)} was voided by ${after.voidedBy || 'Staff'}. Reason: ${after.voidReason || 'None'}`,
            type: 'warning',
            actionUrl: '/store/transactions',
            metadata: {
                triggeredBy: after.voidedBy,
                itemId: context.params.transactionId
            }
        });
    }
});

/**
 * Triggered when a shift is opened.
 * Writes an opening log message to the global chat room.
 */
export const onShiftCreated = functions.firestore.document('/shifts/{shiftId}').onCreate(async (snapshot, context) => {
    const shift = snapshot.data() || {};
    if (shift.status === 'OPEN') {
        const content = `🔓 **Shift Opened** by **${shift.openedBy || 'Staff'}**. Starting Float: **$${shift.openingBalance}**.`;
        const db = admin.firestore();
        await db.collection('chats/global/messages').add({
            senderId: 'system',
            senderName: 'GymBot',
            senderAvatar: '',
            content,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            type: 'system',
            metadata: {
                transactionType: 'SHIFT_OPENED',
                referencedId: context.params.shiftId,
                amount: shift.openingBalance
            }
        });
    }
});

/**
 * Triggered when a shift is updated.
 * Handles shift closures and cash register movements (expenses, float additions).
 */
export const onShiftUpdated = functions.firestore.document('/shifts/{shiftId}').onUpdate(async (change, context) => {
    const before = change.before.data() || {};
    const after = change.after.data() || {};
    const db = admin.firestore();

    // 1. Shift Closing detection
    if (before.status === 'OPEN' && after.status === 'CLOSED') {
        const content = `🔒 **Shift Closed** by **${after.closedBy || 'Staff'}**. Expected: **$${after.expectedClosingBalance}** | Actual: **$${after.actualClosingBalance}** | Discrepancy: **$${after.discrepancy || 0}** (Sales: $${after.totalSales || 0}).`;
        await db.collection('chats/global/messages').add({
            senderId: 'system',
            senderName: 'GymBot',
            senderAvatar: '',
            content,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            type: 'system',
            metadata: {
                transactionType: 'SHIFT_CLOSED',
                referencedId: context.params.shiftId,
                amount: after.discrepancy || 0
            }
        });

        // Trigger discrepancy alert notification if discrepancy exists (Phase 2)
        if (after.discrepancy && Math.abs(after.discrepancy) > 0.01) {
            await sendNotificationsToRoles(['ADMIN', 'MANAGER'], {
                title: 'Shift Closed - Discrepancy Alert',
                body: `Shift closed by ${after.closedBy || 'Staff'} with a discrepancy of $${after.discrepancy}.`,
                type: 'alert',
                actionUrl: '/store/shifts',
                metadata: {
                    triggeredBy: after.closedBy,
                    itemId: context.params.shiftId
                }
            });
        }
    }

    // 2. Cash transactions (Expense, Float In/Out) detection
    const beforeTx = before.transactions || [];
    const afterTx = after.transactions || [];

    if (afterTx.length > beforeTx.length) {
        const newTxs = afterTx.slice(beforeTx.length);
        for (const tx of newTxs) {
            // Skip 'Sale' as it is handled by the transactions trigger
            if (tx.type === 'Sale') continue;

            let prefix = '';
            let txType: any = '';
            if (tx.type === 'Expense') {
                prefix = '💸 **Cash Outflow (Expense)**';
                txType = 'CASH_EXPENSE';
            } else if (tx.type === 'Float_In') {
                prefix = '💵 **Cash Inflow (Float In)**';
                txType = 'CASH_FLOAT';
            } else if (tx.type === 'Float_Out') {
                prefix = '💸 **Cash Outflow (Float Out)**';
                txType = 'CASH_FLOAT';
            }

            if (prefix) {
                const content = `${prefix} recorded by **${tx.performedBy || 'Staff'}**. Amount: **$${tx.amount}** | Reason: **${tx.reason || 'None'}**.`;
                await db.collection('chats/global/messages').add({
                    senderId: 'system',
                    senderName: 'GymBot',
                    senderAvatar: '',
                    content,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    type: 'system',
                    metadata: {
                        transactionType: txType,
                        referencedId: context.params.shiftId,
                        amount: tx.amount
                    }
                });
            }
        }
    }
});

/**
 * Triggered when a member registers check-in attendance.
 * Notifies staff and managers to offer personalized greeting/assistance.
 */
export const onMemberCheckInNotification = functions.firestore.document('/attendance/{attendanceId}').onCreate(async (snapshot, context) => {
    const attendance = snapshot.data() || {};
    const memberName = attendance.memberName || 'A member';
    const db = admin.firestore();

    const staffName = attendance.checkedInBy?.name;
    const staffMention = staffName ? `@${staffName}` : 'Staff';

    const content = `🔔 **Member Checked In**: **${memberName}** has checked in! ${staffMention}, please offer our products and services. 🌟`;

    await db.collection('chats/global/messages').add({
        senderId: 'system',
        senderName: 'GymBot',
        senderAvatar: '',
        content,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        type: 'system',
        metadata: {
            transactionType: 'MEMBER_CHECK_IN',
            referencedId: context.params.attendanceId
        }
    });

    await sendNotificationsToRoles(['ADMIN', 'MANAGER', 'STAFF'], {
        title: 'Member Checked In',
        body: `${memberName} has checked in. Ensure staff offer excellent service!`,
        type: 'info',
        actionUrl: '/attendance',
        metadata: {
            itemId: attendance.memberId || ''
        }
    });
});

/**
 * Scheduled nightly function (running at 9:00 PM) to aggregate the day's operations
 * (total sales, check-ins, register discrepancies) and notify admins/managers.
 */
export const onDailySummaryReport = functions.pubsub.schedule('0 21 * * *')
    .timeZone('Asia/Manila') // Match local timezone
    .onRun(async (context) => {
        const db = admin.firestore();
        // Resolve timezone-safe local date boundary for Asia/Manila (GMT+8)
        const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
        const todayLocalStart = new Date(`${dateStr}T00:00:00+08:00`);
        
        try {
            // 1. Query today's sales transactions
            const txsSnap = await db.collection('transactions')
                .where('date', '>=', todayLocalStart)
                .get();
            
            let totalSales = 0;
            txsSnap.docs.forEach(doc => {
                const tx = doc.data();
                if (tx.status !== 'VOID') {
                    totalSales += tx.totalAmount || 0;
                }
            });

            // 2. Query today's attendance count
            const attendanceSnap = await db.collection('attendance')
                .where('checkInTime', '>=', todayLocalStart)
                .get();
            const attendanceCount = attendanceSnap.size;

            // 3. Query today's closed shifts to calculate total discrepancy
            // We query by date range to read only today's shifts (saves Firestore reads)
            const shiftsSnap = await db.collection('shifts')
                .where('endTime', '>=', todayLocalStart)
                .get();
            
            let totalDiscrepancies = 0;
            shiftsSnap.docs.forEach(doc => {
                const shift = doc.data();
                if (shift.status === 'CLOSED') {
                    totalDiscrepancies += shift.discrepancy || 0;
                }
            });

            // 4. Send report
            const body = `Sales: $${totalSales.toFixed(2)} | Attendance: ${attendanceCount} check-ins | Discrepancies: $${totalDiscrepancies.toFixed(2)}`;
            await sendNotificationsToRoles(['ADMIN', 'MANAGER'], {
                title: '📊 Daily Gym Summary',
                body,
                type: 'summary',
                actionUrl: '/reports',
                metadata: {
                    totalSales,
                    attendanceCount,
                    totalDiscrepancies
                }
            });
            console.log('Daily summary successfully dispatched:', body);
        } catch (err) {
            console.error('Failed to compile daily operations summary:', err);
        }
    });

