import { Component, ChangeDetectorRef, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MediaMatcher } from '@angular/cdk/layout';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { slideInOut } from './core/animations/animations';
import { ShiftStatusWidget } from './features/store/components/shift-status-widget/shift-status-widget';
import { AuthService } from './core/services/auth.service';
import { QuotaStatusWidget } from './core/components/quota-status-widget/quota-status-widget';
import { StaffRemindersComponent } from './core/components/staff-reminders/staff-reminders';
import { TutorialService } from './core/services/tutorial.service';
import { TUTORIALS } from './core/constants/tutorials';
import { TutorialWizardComponent } from './shared/components/tutorial-wizard/tutorial-wizard.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, RouterOutlet, RouterLink, RouterLinkActive,
    MatToolbarModule, MatButtonModule, MatIconModule, MatSidenavModule, MatListModule, MatDividerModule,
    ShiftStatusWidget,
    QuotaStatusWidget,
    StaffRemindersComponent,
    TutorialWizardComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  animations: [slideInOut]
})
export class App implements OnDestroy {
  title = 'Epicenter Gym Management System';
  mobileQuery: MediaQueryList;
  private _mobileQueryListener: () => void;

  readonly authService = inject(AuthService);
  private tutorialService = inject(TutorialService);

  constructor() {
    const changeDetectorRef = inject(ChangeDetectorRef);
    const media = inject(MediaMatcher);

    this.mobileQuery = media.matchMedia('(max-width: 1200px)');
    this._mobileQueryListener = () => changeDetectorRef.detectChanges();
    this.mobileQuery.addListener(this._mobileQueryListener);

    // Register Tutorials
    Object.values(TUTORIALS).forEach(t => this.tutorialService.registerTutorial(t));

    // Trigger Intro Tutorial on Login
    this.authService.user$.subscribe(user => {
      if (user) {
        // timeout to ensure view is ready or just nice UX
        setTimeout(() => {
          this.tutorialService.startTutorial(TUTORIALS['INTRO_SHIFT'].id);
        }, 2000);
      }
    });
  }

  ngOnDestroy(): void {
    this.mobileQuery.removeListener(this._mobileQueryListener);
  }

  getRouteAnimation(outlet: RouterOutlet) {
    return outlet && outlet.activatedRouteData && outlet.activatedRouteData['animation'];
  }

  logout() {
    this.authService.logout().subscribe();
  }
}
