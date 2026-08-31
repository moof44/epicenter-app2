import { Component, ChangeDetectorRef, OnDestroy, inject, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { MediaMatcher } from '@angular/cdk/layout';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatBadgeModule } from '@angular/material/badge';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { slideInOut } from './core/animations/animations';
import { ShiftStatusWidget } from './features/store/components/shift-status-widget/shift-status-widget';
import { AuthService } from './core/services/auth.service';
import { QuotaStatusWidget } from './core/components/quota-status-widget/quota-status-widget';
import { StaffRemindersComponent } from './core/components/staff-reminders/staff-reminders';
import { IdleRedirectService } from './core/services/idle-redirect.service';
import { ChatComponent } from './features/chat/chat.component';
import { ChatService } from './core/services/chat.service';
import { NotificationBellComponent } from './shared/components/notification-bell/notification-bell.component';
import { NotificationService } from './core/services/notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, RouterOutlet, RouterLink, RouterLinkActive,
    MatToolbarModule, MatButtonModule, MatIconModule, MatSidenavModule,
    MatBadgeModule,
    ShiftStatusWidget,
    QuotaStatusWidget,
    StaffRemindersComponent,
    ChatComponent,
    NotificationBellComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  animations: [slideInOut]
})
export class App implements OnDestroy {
  title = 'Epicenter Gym Management System';
  mobileQuery: MediaQueryList;
  private _mobileQueryListener: () => void;
  private routerSub: Subscription;

  @ViewChild('snav') sidenav!: MatSidenav;

  readonly authService = inject(AuthService);
  readonly chatService = inject(ChatService);
  readonly notificationService = inject(NotificationService);
  readonly router = inject(Router);
  private idleRedirectService = inject(IdleRedirectService);

  // Collapsible section signals
  inventoryExpanded = signal(false);
  financeExpanded = signal(false);
  systemExpanded = signal(false);

  constructor() {
    const changeDetectorRef = inject(ChangeDetectorRef);
    const media = inject(MediaMatcher);

    this.mobileQuery = media.matchMedia('(max-width: 1200px)');
    this._mobileQueryListener = () => changeDetectorRef.detectChanges();
    this.mobileQuery.addListener(this._mobileQueryListener);

    this.idleRedirectService.init();

    // Default expanded on tall screens (>= 900px)
    if (typeof window !== 'undefined' && window.innerHeight >= 900) {
      this.inventoryExpanded.set(true);
      this.financeExpanded.set(true);
      this.systemExpanded.set(true);
    }

    // Auto-expand section if active route is inside it
    this.checkActiveSection(this.router.url);
    this.routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.checkActiveSection(event.urlAfterRedirects || event.url);
      });
  }

  private checkActiveSection(url: string) {
    if (!url) return;
    if (url.includes('/store/stock-take') || url.includes('/store/restock') || url.includes('/store/inventory-history')) {
      this.inventoryExpanded.set(true);
    }
    if (url.includes('/store/financial-health') || url.includes('/store/payables') || url.includes('/store/purchases') || url.includes('/store/purchase-requests')) {
      this.financeExpanded.set(true);
    }
    if (url.includes('/settings') || url.includes('/audit-log') || url.includes('/error-logs')) {
      this.systemExpanded.set(true);
    }
  }

  toggleInventory() {
    this.inventoryExpanded.update(v => !v);
  }

  toggleFinance() {
    this.financeExpanded.update(v => !v);
  }

  toggleSystem() {
    this.systemExpanded.update(v => !v);
  }

  getUserInitials(): string {
    const user = this.authService.userProfile();
    if (!user) return 'EP';
    if (user.displayName) {
      const parts = user.displayName.trim().split(' ');
      if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      return parts[0].substring(0, 2).toUpperCase();
    }
    if (user.email) return user.email.substring(0, 2).toUpperCase();
    return 'EP';
  }

  getUserDisplayName(): string {
    const user = this.authService.userProfile();
    return user?.displayName || user?.email?.split('@')[0] || 'Staff Member';
  }

  getUserPrimaryRole(): string {
    const user = this.authService.userProfile();
    if (!user?.roles || user.roles.length === 0) return 'STAFF';
    if (user.roles.includes('ADMIN')) return 'ADMIN';
    if (user.roles.includes('MANAGER')) return 'MANAGER';
    if (user.roles.includes('TRAINER')) return 'TRAINER';
    return user.roles[0];
  }

  getRouteAnimation(outlet: RouterOutlet) {
    return outlet && outlet.activatedRouteData && outlet.activatedRouteData['animation'];
  }

  toggleChat() {
    this.chatService.isChatOpen.update(v => !v);
  }

  logout() {
    this.authService.logout().subscribe();
  }

  ngOnDestroy(): void {
    this.mobileQuery.removeListener(this._mobileQueryListener);
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
  }
}
