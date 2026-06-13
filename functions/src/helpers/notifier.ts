import * as admin from 'firebase-admin';

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
    // 1. Fetch active users matching the roles
    const usersSnap = await db.collection('users')
      .where('roles', 'array-contains-any', roles)
      .where('isActive', '!=', false) // includes undefined (default active) and explicit true
      .get();

    const userIds = usersSnap.docs
      .filter(doc => {
        const u = doc.data();
        // In array-contains-any queries, double check if active
        return u.isActive !== false;
      })
      .map(doc => doc.id);

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
