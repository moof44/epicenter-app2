import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { NotificationService, NotificationItem } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { fadeIn } from '../../core/animations/animations';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css',
  animations: [fadeIn]
})
export class NotificationsComponent implements OnInit {
  notifService = inject(NotificationService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private functions = inject(Functions, { optional: true });
  private snackBar = inject(MatSnackBar);

  isPurging = signal(false);
  selectedFilter = signal<'ALL' | 'UNREAD' | 'alert' | 'warning' | 'summary' | 'info'>('ALL');

  // Computed Metrics
  totalCount = computed(() => this.notifService.notifications().length);
  unreadCount = computed(() => this.notifService.unreadCount());
  alertCount = computed(() => this.notifService.notifications().filter(n => n.type === 'alert').length);
  summaryCount = computed(() => this.notifService.notifications().filter(n => n.type === 'summary' || n.type === 'warning').length);

  // Filtered Notifications List
  filteredNotifications = computed(() => {
    const list = this.notifService.notifications();
    const filter = this.selectedFilter();

    if (filter === 'UNREAD') {
      return list.filter(n => !n.read);
    }
    if (filter === 'alert' || filter === 'warning' || filter === 'summary' || filter === 'info') {
      return list.filter(n => n.type === filter);
    }
    return list;
  });

  ngOnInit() {
    const user = this.authService.userProfile();
    if (user) {
      this.notifService.requestPushPermission();
    }
  }

  setFilter(filter: 'ALL' | 'UNREAD' | 'alert' | 'warning' | 'summary' | 'info') {
    this.selectedFilter.set(filter);
  }

  async purgeSpam() {
    if (!this.functions) {
      this.snackBar.open('Cloud functions not initialized.', 'Close', { duration: 3000 });
      return;
    }

    this.isPurging.set(true);
    try {
      const purgeFn = httpsCallable(this.functions, 'purgeLegacyNotificationAndChatSpam');
      const res: any = await purgeFn();
      const user = this.authService.userProfile();
      if (user) {
        await this.notifService.markAllAsRead(user.uid);
      }
      this.snackBar.open(`Cleaned ${res.data?.deletedNotifsCount || 0} notifications & ${res.data?.deletedChatCount || 0} chat spam messages!`, 'OK', { duration: 5000 });
    } catch (err: any) {
      console.error('Error purging spam:', err);
      this.snackBar.open('Error cleaning spam: ' + (err.message || 'Unknown error'), 'Close', { duration: 4000 });
    } finally {
      this.isPurging.set(false);
    }
  }

  markAllRead() {
    const user = this.authService.userProfile();
    if (user) {
      this.notifService.markAllAsRead(user.uid);
    }
  }

  handleRowClick(item: NotificationItem) {
    const user = this.authService.userProfile();
    if (user) {
      this.notifService.markAsRead(user.uid, item.id);
    }

    if (item.actionUrl) {
      this.router.navigateByUrl(item.actionUrl);
    }
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  formatDateTime(timestamp: any): string {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : (timestamp instanceof Date ? timestamp : new Date(timestamp));
    return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }
}
