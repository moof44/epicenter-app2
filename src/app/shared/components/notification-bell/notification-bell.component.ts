import { Component, inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { NotificationService, NotificationItem } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule,
    MatMenuModule,
    MatDividerModule
  ],
  template: `
    <button mat-icon-button [matMenuTriggerFor]="notifMenu" title="Notifications">
      <mat-icon [matBadge]="notifService.unreadCount() > 0 ? notifService.unreadCount() : null" matBadgeColor="warn">
        {{ notifService.unreadCount() > 0 ? 'notifications_active' : 'notifications' }}
      </mat-icon>
    </button>

    <mat-menu #notifMenu="matMenu" xPosition="before" class="notification-menu-panel">
      <div class="notif-header" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()" role="presentation" tabindex="-1">
        <span>Notifications</span>
        <button mat-button color="primary" class="mark-all-read-btn" 
                *ngIf="notifService.unreadCount() > 0" 
                (click)="markAllRead()">
          Mark all read
        </button>
      </div>
      <mat-divider></mat-divider>
      <div class="notif-list-container" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()" role="presentation" tabindex="-1">
        <div *ngIf="notifService.notifications().length === 0" class="empty-notif">
          <mat-icon class="empty-icon">notifications_off</mat-icon>
          <p>No notifications yet</p>
        </div>
        <button mat-menu-item *ngFor="let item of notifService.notifications() | slice:0:10"
                (click)="handleNotifClick(item)"
                [class.unread-item]="!item.read"
                class="notif-item">
          <div class="notif-item-content">
            <div class="notif-item-title-row">
              <span class="notif-item-title">{{ item.title }}</span>
              <span class="notif-item-time">{{ formatTime(item.timestamp) }}</span>
            </div>
            <p class="notif-item-body">{{ item.body }}</p>
          </div>
        </button>
      </div>
      <mat-divider></mat-divider>
      <button mat-menu-item class="view-all-btn" (click)="goToAllNotifications()">
        View All Notifications
      </button>
    </mat-menu>
  `,
  styles: [`
    /* Global class overrides since mat-menu is rendered in overlay container */
    .notification-menu-panel.mat-mdc-menu-panel {
      max-width: 360px !important;
      width: 360px;
      border-radius: 8px;
    }
    .notif-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      font-weight: 500;
      font-size: 1rem;
      color: #202124;
      background-color: #f8f9fa;
    }
    .mark-all-read-btn.mat-mdc-button {
      font-size: 0.8rem !important;
      padding: 0 8px !important;
      min-width: unset !important;
      height: 28px !important;
      line-height: 28px !important;
    }
    .notif-list-container {
      max-height: 280px;
      overflow-y: auto;
    }
    .empty-notif {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      color: #70757a;
    }
    .empty-icon {
      font-size: 2rem;
      width: 32px;
      height: 32px;
      margin-bottom: 4px;
    }
    .notif-item.mat-mdc-menu-item {
      padding: 10px 16px !important;
      height: auto !important;
      line-height: normal !important;
      white-space: normal !important;
      border-bottom: 1px solid #f1f3f4;
    }
    .notif-item.unread-item {
      background-color: #e8f0fe !important;
    }
    .notif-item-content {
      display: flex;
      flex-direction: column;
      width: 100%;
      gap: 4px;
    }
    .notif-item-title-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      width: 100%;
      gap: 8px;
    }
    .notif-item-title {
      font-weight: 500;
      font-size: 0.85rem;
      color: #202124;
      flex: 1;
    }
    .notif-item-time {
      font-size: 0.7rem;
      color: #70757a;
    }
    .notif-item-body {
      margin: 0;
      font-size: 0.8rem;
      color: #5f6368;
      line-height: 1.4;
      word-break: break-word;
    }
    .view-all-btn.mat-mdc-menu-item {
      text-align: center !important;
      color: #1a73e8 !important;
      font-weight: 500;
      justify-content: center;
      height: 40px !important;
    }
  `],
  encapsulation: ViewEncapsulation.None
})
export class NotificationBellComponent {
  notifService = inject(NotificationService);
  private authService = inject(AuthService);
  private router = inject(Router);

  markAllRead() {
    const user = this.authService.userProfile();
    if (user) {
      this.notifService.markAllAsRead(user.uid);
    }
  }

  handleNotifClick(item: NotificationItem) {
    const user = this.authService.userProfile();
    if (user) {
      this.notifService.markAsRead(user.uid, item.id);
    }

    if (item.actionUrl) {
      this.router.navigateByUrl(item.actionUrl);
    }
  }

  goToAllNotifications() {
    this.router.navigate(['/notifications']);
  }

  formatTime(timestamp: any): string {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}
