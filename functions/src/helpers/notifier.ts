import * as admin from 'firebase-admin';

let cachedStaff: { id: string; roles: string[]; isActive: boolean }[] | null = null;
let cacheExpiry = 0;

/**
 * Retrieves the list of active staff members, caching it in global memory for 5 minutes
 * to minimize Firestore read counts on rapid sequential operations.
 */
async function getActiveStaff(db: admin.firestore.Firestore): Promise<{ id: string; roles: string[]; isActive: boolean }[]> {
  const now = Date.now();
  if (cachedStaff && now < cacheExpiry) {
    return cachedStaff;
  }

  try {
    const snap = await db.collection('users')
      .where('isActive', '!=', false)
      .get();

    cachedStaff = snap.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          roles: data.roles || [],
          isActive: data.isActive !== false
        };
      })
      .filter(u => u.isActive);

    cacheExpiry = now + 5 * 60 * 1000; // Cache valid for 5 minutes
    return cachedStaff;
  } catch (error) {
    console.error('Failed to fetch active staff for caching:', error);
    // If query fails, return stale cache as fallback if available, else empty array
    return cachedStaff || [];
  }
}

export async function sendNotificationsToRoles(
  roles: string[],
  payload: { 
    title: string; 
    body: string; 
    type: 'info' | 'alert' | 'warning' | 'summary'; 
    actionUrl?: string; 
    metadata?: any; 
  }
) {
  const db = admin.firestore();
  
  try {
    // 1. Get active staff (using in-memory cache if warm)
    const staffList = await getActiveStaff(db);
    
    // Filter staff UIDs matching target roles
    const userIds = staffList
      .filter(u => u.roles.some(r => roles.includes(r)))
      .map(u => u.id);

    if (userIds.length === 0) {
      console.log('No active users found for roles:', roles);
      return;
    }

    for (const uid of userIds) {
      // 2. Add Notification Document to User subcollection
      const notifRef = await db.collection(`users/${uid}/notifications`).add({
        title: payload.title,
        body: payload.body,
        type: payload.type,
        read: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        actionUrl: payload.actionUrl || '',
        metadata: payload.metadata || {}
      });

      // 3. Query Registered Device Tokens
      const tokensSnap = await db.collection(`users/${uid}/fcmTokens`).get();
      const tokens = tokensSnap.docs.map(doc => doc.data().token);
      
      if (tokens.length > 0) {
        const message = {
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data: {
            actionUrl: payload.actionUrl || '/',
            notificationId: notifRef.id
          },
          tokens: tokens
        };

        // 4. Send multicast messages
        const response = await admin.messaging().sendEachForMulticast(message);
        
        // 5. Clean up / Prune invalid and expired registration tokens
        const tokensToDelete: Promise<any>[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errorCode = resp.error?.code;
            if (
              errorCode === 'messaging/invalid-registration-token' || 
              errorCode === 'messaging/registration-token-not-registered'
            ) {
              const tokenDocId = tokensSnap.docs[idx].id;
              tokensToDelete.push(db.doc(`users/${uid}/fcmTokens/${tokenDocId}`).delete());
            }
          }
        });

        if (tokensToDelete.length > 0) {
          console.log(`Pruning ${tokensToDelete.length} invalid tokens for user ${uid}`);
          await Promise.all(tokensToDelete);
        }
      }
    }
  } catch (error) {
    console.error('Error in sendNotificationsToRoles helper:', error);
  }
}
