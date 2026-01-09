import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

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
