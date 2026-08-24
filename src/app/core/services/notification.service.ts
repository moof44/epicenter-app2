import { Injectable, inject, signal, effect, OnDestroy } from '@angular/core';
import { Firestore, collection, collectionData, doc, setDoc, query, orderBy, limit, updateDoc, Timestamp } from '@angular/fire/firestore';
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
  private vapidKey = 'BH0q7xZ4YJ8_5eI9g7J4K5V8AYUMMo_d7Pc8x_vUYK1WvUYM_Uu8e_x-xAYU-v1_XAYUMMo';

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
        }, 1000);
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
      console.warn('Web Push Notifications are not supported in this browser.');
      return;
    }

    try {
      // 1. Request Browser Permission
      const permission = await Notification.requestPermission();
      if (permission === 'granted' && this.messaging) {
        // 2. Fetch FCM Token
        const token = await getToken(this.messaging, {
          vapidKey: this.vapidKey
        });

        if (token) {
          // 3. Register Token in user's subcollection
          await this.registerDeviceToken(user.uid, token);
        }
      }

      // 4. Register Foreground Message Handler
      this.setupForegroundListener();
    } catch (err) {
      console.warn('Failed to initialize push notifications:', err);
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
