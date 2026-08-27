import { Injectable, inject, signal, effect, OnDestroy } from '@angular/core';
import { Firestore, collection, collectionData, doc, setDoc, query, orderBy, limit, updateDoc, Timestamp, getDocs, where, writeBatch } from '@angular/fire/firestore';
import { Messaging, getToken, onMessage } from '@angular/fire/messaging';
import { Observable, Subscription } from 'rxjs';
import { AuthService } from './auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'alert' | 'warning' | 'summary';
  read: boolean;
  timestamp: any;
  actionUrl?: string;
  metadata?: any;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private messaging = inject(Messaging, { optional: true });
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  // VAPID key from Firebase Console -> Project Settings -> Cloud Messaging -> Web Configuration
  // Leave empty until a valid Web Push Certificate key pair is generated in Firebase Console
  private vapidKey = '';

  notifications = signal<NotificationItem[]>([]);
  unreadCount = signal(0);

  private notificationsSub: Subscription | null = null;
  private messageUnsubscribe: (() => void) | null = null;

  constructor() {
    effect(() => {
      const user = this.authService.userProfile();
      if (user) {
        setTimeout(() => {
          this.setupNotificationsListener(user.uid);
          this.requestPushPermission();
        }, 2500);
      } else {
        this.cleanup();
      }
    });
  }

  private setupNotificationsListener(userId: string) {
    this.cleanupListener();

    const notifCol = collection(this.firestore, `users/${userId}/notifications`);
    const q = query(notifCol, orderBy('timestamp', 'desc'), limit(50));

    this.notificationsSub = (collectionData(q, { idField: 'id' }) as Observable<NotificationItem[]>).subscribe(notifs => {
      this.notifications.set(notifs || []);
      const unread = (notifs || []).filter(n => !n.read).length;
      this.unreadCount.set(unread);
    });
  }

  async requestPushPermission() {
    const user = this.authService.userProfile();
    if (!user) return;

    if (!('Notification' in window) || !('serviceWorker' in navigator) || !this.messaging) {
      return;
    }

    try {
      // 1. Request Browser Permission
      const permission = await Notification.requestPermission();
      if (permission === 'granted' && this.messaging && this.vapidKey) {
        try {
          // 2. Fetch FCM Token
          const token = await getToken(this.messaging, {
            vapidKey: this.vapidKey
          });

          if (token) {
            // 3. Register Token in user's subcollection
            await this.registerDeviceToken(user.uid, token);
          }
        } catch (fcmErr: any) {
          // If VAPID key is mismatched/invalid in Firebase console, log diagnostic info without breaking app
          console.info('[FCM] Push token registration skipped (Valid Web Push VAPID key required from Firebase Console):', fcmErr?.message || fcmErr);
        }
      }

      // 4. Register Foreground Message Handler
      this.setupForegroundListener();
    } catch (err) {
      console.warn('[NotificationService] Failed to initialize push notifications:', err);
    }
  }

  private async registerDeviceToken(userId: string, token: string) {
    const storageKey = `fcm_registered_${userId}_${token.substring(0, 20)}`;
    const lastWrite = localStorage.getItem(storageKey);
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;

    if (lastWrite && parseInt(lastWrite, 10) > threeDaysAgo) {
      // Skip redundant Firestore write (saves costs)
      return;
    }

    const tokenDocId = btoa(token).replace(/=/g, '').substring(0, 50); // Unique safe doc ID
    const tokenRef = doc(this.firestore, `users/${userId}/fcmTokens/${tokenDocId}`);
    
    await setDoc(tokenRef, {
      token,
      platform: this.getPlatform(),
      userAgent: navigator.userAgent,
      createdAt: Timestamp.now(),
      lastUsedAt: Timestamp.now()
    }, { merge: true });

    localStorage.setItem(storageKey, Date.now().toString());
  }

  private getPlatform(): 'desktop' | 'android' | 'ios' {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('android')) return 'android';
    if (ua.includes('iphone') || ua.includes('ipad')) return 'ios';
    return 'desktop';
  }

  private setupForegroundListener() {
    if (!this.messaging) return;
    if (this.messageUnsubscribe) {
      this.messageUnsubscribe();
    }

    this.messageUnsubscribe = onMessage(this.messaging, (payload) => {
      console.log('Foreground Push Message received:', payload);
      if (payload.notification) {
        const title = payload.notification.title || 'Vigilance Alert';
        const body = payload.notification.body || '';
        const actionUrl = payload.data?.['actionUrl'];

        // Display slide-out toast notification (MatSnackBar)
        const snackBarRef = this.snackBar.open(`${title}: ${body}`, 'View', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
          panelClass: ['notification-toast']
        });

        // Redirect user if they click the snackbar action
        if (actionUrl) {
          snackBarRef.onAction().subscribe(() => {
            this.router.navigateByUrl(actionUrl);
          });
        }
      }
    });
  }

  async markAsRead(userId: string, notifId: string) {
    try {
      const notifRef = doc(this.firestore, `users/${userId}/notifications/${notifId}`);
      await updateDoc(notifRef, { read: true });
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }

  async markAllAsRead(userId: string) {
    try {
      const unreadNotifs = this.notifications().filter(n => !n.read);
      const promises = unreadNotifs.map(n => {
        const ref = doc(this.firestore, `users/${userId}/notifications/${n.id}`);
        return updateDoc(ref, { read: true });
      });
      await Promise.all(promises);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  }

  async notifyAdmins(title: string, body: string, actionUrl?: string, metadata?: any): Promise<void> {
    try {
      const usersSnap = await getDocs(query(collection(this.firestore, 'users'), where('roles', 'array-contains-any', ['ADMIN', 'MANAGER'])));
      const batch = writeBatch(this.firestore);
      usersSnap.forEach(userDoc => {
        const notifRef = doc(collection(this.firestore, `users/${userDoc.id}/notifications`));
        const notif: Omit<NotificationItem, 'id'> = {
          title,
          body,
          type: 'warning',
          read: false,
          timestamp: new Date(),
          actionUrl,
          metadata
        };
        batch.set(notifRef, notif);
      });
      await batch.commit();
    } catch (err) {
      console.warn('Failed to send admin notification:', err);
    }
  }

  private cleanupListener() {
    if (this.notificationsSub) {
      this.notificationsSub.unsubscribe();
      this.notificationsSub = null;
    }
  }

  private cleanup() {
    this.cleanupListener();
    if (this.messageUnsubscribe) {
      this.messageUnsubscribe();
      this.messageUnsubscribe = null;
    }
    this.notifications.set([]);
    this.unreadCount.set(0);
  }

  ngOnDestroy() {
    this.cleanup();
  }
}
