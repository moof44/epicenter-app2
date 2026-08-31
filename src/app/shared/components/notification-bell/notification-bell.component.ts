import { Component, inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
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
    MatDividerModule,
    MatTooltipModule
  ],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.css',
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
    const date = timestamp.toDate ? timestamp.toDate() : (timestamp instanceof Date ? timestamp : new Date(timestamp));
    
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
