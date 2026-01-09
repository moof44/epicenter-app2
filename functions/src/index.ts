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
        // roles is an array of strings, e.g., ['MANAGER', 'TRAINER']

        // standard approach: verify if we want to store roles as an array in claims or individual boolean flags
        // The prompt mentions "Set Custom Claims on the user record for roles".
        // Usually boolean flags are easier for security rules: user.token.ADMIN === true
        // Or we can store 'roles': ['ADMIN'] in the token.
        // Let's store 'roles' array in the token for flexibility as per prompt "roles (string[])".
        // However, security rules often work better with map or checking existance.
        // Let's stick to adding a `roles` claim.
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
        // Determine if it's an auth error or other
        if (error.code === 'auth/email-already-exists') {
            throw new functions.https.HttpsError('already-exists', 'The email address is already in use.');
        }
        throw new functions.https.HttpsError('internal', 'Unable to create account.', error);
    }
});
