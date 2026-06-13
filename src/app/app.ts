import { Component, ChangeDetectorRef, OnDestroy, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MediaMatcher } from '@angular/cdk/layout';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { slideInOut } from './core/animations/animations';
import { ShiftStatusWidget } from './features/store/components/shift-status-widget/shift-status-widget';
import { AuthService } from './core/services/auth.service';
import { QuotaStatusWidget } from './core/components/quota-status-widget/quota-status-widget';
import { StaffRemindersComponent } from './core/components/staff-reminders/staff-reminders';
import { IdleRedirectService } from './core/services/idle-redirect.service';
import { ChatComponent } from './features/chat/chat.component';
import { ChatService } from './core/services/chat.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, RouterOutlet, RouterLink, RouterLinkActive,
    MatToolbarModule, MatButtonModule, MatIconModule, MatSidenavModule, MatListModule, MatDividerModule,
    MatBadgeModule,
    ShiftStatusWidget,
    QuotaStatusWidget,
    StaffRemindersComponent,
    ChatComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  animations: [slideInOut]
})
export class App implements OnDestroy {
  title = 'Epicenter Gym Management System';
  mobileQuery: MediaQueryList;
  private _mobileQueryListener: () => void;

  @ViewChild('snav') sidenav!: MatSidenav;

  readonly authService = inject(AuthService);
  readonly chatService = inject(ChatService);
  private idleRedirectService = inject(IdleRedirectService);

  constructor() {
    const changeDetectorRef = inject(ChangeDetectorRef);
    const media = inject(MediaMatcher);

    this.mobileQuery = media.matchMedia('(max-width: 1200px)');
    this._mobileQueryListener = () => changeDetectorRef.detectChanges();
    this.mobileQuery.addListener(this._mobileQueryListener);

    this.idleRedirectService.init();


  }

  ngOnDestroy(): void {
    this.mobileQuery.removeListener(this._mobileQueryListener);
  }

  getRouteAnimation(outlet: RouterOutlet) {
    return outlet && outlet.activatedRouteData && outlet.activatedRouteData['animation'];
  }

  toggleChat() {
    this.chatService.isChatOpen.set(!this.chatService.isChatOpen());
  }

  logout() {
    // Close sidenav immediately to prevent it from staying visible on the login page
    this.sidenav?.close();
    this.authService.logout().subscribe();
  }
}
