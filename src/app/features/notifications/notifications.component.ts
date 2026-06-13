import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { NotificationService, NotificationItem } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule
  ],
  template: `
    <div class="notifications-page-container">
      <div class="page-header">
        <button mat-icon-button (click)="goBack()" title="Back to Dashboard">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>Vigilance Notifications Center</h1>
      </div>

      <mat-card class="notifications-card">
        <mat-card-header class="card-header-row">
          <mat-card-title>All Messages</mat-card-title>
          <button mat-raised-button color="primary" 
                  *ngIf="notifService.unreadCount() > 0"
                  (click)="markAllRead()">
            <mat-icon>done_all</mat-icon> Mark All As Read
          </button>
        </mat-card-header>
        
        <mat-divider></mat-divider>
        
        <mat-card-content class="notifications-list">
          <div *ngIf="notifService.notifications().length === 0" class="empty-page-state">
            <mat-icon class="large-empty-icon">notifications_off</mat-icon>
            <p>You have no historical notifications yet.</p>
          </div>

          <button type="button" *ngFor="let item of notifService.notifications()" 
               [ngClass]="{
                 'notif-row-item': true, 
                 'unread-row': !item.read,
                 'notif-alert': item.type === 'alert',
                 'notif-warning': item.type === 'warning',
                 'notif-summary': item.type === 'summary',
                 'notif-info': item.type === 'info'
               }"
               (click)="handleRowClick(item)">
            
            <div class="notif-icon-wrapper">
              <mat-icon class="status-icon" *ngIf="item.type === 'alert'">error_outline</mat-icon>
              <mat-icon class="status-icon" *ngIf="item.type === 'warning'">warning_amber</mat-icon>
              <mat-icon class="status-icon" *ngIf="item.type === 'summary'">analytics</mat-icon>
              <mat-icon class="status-icon" *ngIf="item.type === 'info' || !item.type">info_outline</mat-icon>
            </div>

            <div class="notif-body-wrapper">
              <div class="notif-row-header">
                <span class="row-title">{{item.title}}</span>
                <span class="row-time">{{formatDateTime(item.timestamp)}}</span>
              </div>
              <p class="row-body-text">{{item.body}}</p>
              
              <div class="row-action-row" *ngIf="item.actionUrl">
                <span class="action-link-text">
                  <mat-icon class="link-arrow">arrow_forward</mat-icon> Click to view details
                </span>
              </div>
            </div>

            <div class="unread-dot-indicator" *ngIf="!item.read" title="Unread"></div>
          </button>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .notifications-page-container {
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
      box-sizing: border-box;
      min-height: calc(100vh - 80px);
    }
    .page-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 8px;
    }
    .page-header h1 {
      margin: 0;
      font-size: 1.8rem;
      font-weight: 500;
      color: #202124;
    }
    .notifications-card {
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e0e0e0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important;
    }
    .card-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px !important;
      background-color: #f8f9fa;
    }
    .card-header-row .mat-card-title {
      font-size: 1.1rem;
      font-weight: 500;
      margin: 0;
    }
    .notifications-list {
      padding: 0 !important;
    }
    .empty-page-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px 24px;
      color: #5f6368;
      text-align: center;
    }
    .large-empty-icon {
      font-size: 4rem;
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
      color: #9e9e9e;
    }
    .notif-row-item {
      display: flex;
      padding: 16px 24px;
      border-bottom: 1px solid #f1f3f4;
      cursor: pointer;
      position: relative;
      transition: background-color 0.2s ease;
      gap: 16px;
      align-items: flex-start;
      background: none;
      border: none;
      width: 100%;
      text-align: left;
    }
    .notif-row-item:hover {
      background-color: #f8f9fa;
    }
    .unread-row {
      background-color: #f4f8ff;
    }
    .unread-row:hover {
      background-color: #ecf3fe;
    }
    
    /* Icon configurations by severity type */
    .notif-icon-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .notif-info .notif-icon-wrapper {
      background-color: #e8f0fe;
      color: #1a73e8;
    }
    .notif-alert .notif-icon-wrapper {
      background-color: #fce8e6;
      color: #d93025;
    }
    .notif-warning .notif-icon-wrapper {
      background-color: #fef7e0;
      color: #f9ab00;
    }
    .notif-summary .notif-icon-wrapper {
      background-color: #f3e5f5;
      color: #8e24aa;
    }
    .status-icon {
      width: 24px;
      height: 24px;
      font-size: 24px;
    }
    
    /* Content wrappers */
    .notif-body-wrapper {
      display: flex;
      flex-direction: column;
      flex: 1;
      gap: 4px;
    }
    .notif-row-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      width: 100%;
      gap: 12px;
    }
    .row-title {
      font-weight: 500;
      font-size: 0.95rem;
      color: #202124;
    }
    .unread-row .row-title {
      color: #1a73e8;
    }
    .row-time {
      font-size: 0.75rem;
      color: #70757a;
    }
    .row-body-text {
      margin: 0;
      font-size: 0.85rem;
      color: #5f6368;
      line-height: 1.5;
      word-break: break-word;
    }
    .row-action-row {
      margin-top: 6px;
    }
    .action-link-text {
      display: flex;
      align-items: center;
      font-size: 0.8rem;
      color: #1a73e8;
      font-weight: 500;
      gap: 4px;
    }
    .link-arrow {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
    
    /* Blue unread circular indicator */
    .unread-dot-indicator {
      width: 10px;
      height: 10px;
      background-color: #1a73e8;
      border-radius: 50%;
      align-self: center;
      margin-left: 8px;
    }
    
    @media (max-width: 600px) {
      .notifications-page-container {
        padding: 12px;
      }
      .notif-row-item {
        padding: 12px 16px;
      }
      .page-header h1 {
        font-size: 1.4rem;
      }
    }
  `]
})
export class NotificationsComponent implements OnInit {
  notifService = inject(NotificationService);
  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit() {
    // Permission request logic can be run on component init
    const user = this.authService.userProfile();
    if (user) {
      this.notifService.requestPushPermission();
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
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }
}
