import { Component, inject, HostListener, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { LayoutService } from './layout.service';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <!-- Mobile View -->
    @if (layout.isMobile()) {
      <div class="flex flex-col min-h-screen bg-bg-primary text-text-primary">
        <!-- Top Fixed Header -->
        <header class="fixed top-0 inset-x-0 h-16 bg-bg-surface border-b border-bg-surface-alt z-50 flex items-center justify-between px-4 pt-safe">
          <div class="flex items-center gap-2">
            <img src="assets/logo.png" alt="Epicenter Gym" class="w-8 h-8 filter drop-shadow">
            <span class="font-oswald text-lg font-black tracking-wider uppercase text-gold-primary">EPICENTER PORTAL</span>
          </div>
          <button (click)="logout()" class="text-xs font-oswald font-bold text-red-500 uppercase tracking-wider active:scale-95 transition-all">
            Sign Out
          </button>
        </header>

        <!-- Connection State Banner (Mobile) -->
        @if (isOffline()) {
          <div class="fixed top-16 inset-x-0 h-8 bg-gradient-to-r from-gold-primary to-gold-dark text-black flex items-center justify-center gap-1.5 font-bold font-oswald text-[10px] uppercase tracking-wider z-40 shadow">
            <span>⚡ Offline Mode: Showing cached data</span>
          </div>
        }

        <!-- Main Safe-Zone Content View -->
        <main 
          [class.pt-20]="!isOffline()"
          [class.pt-28]="isOffline()"
          class="flex-grow pb-20 px-4"
        >
          <router-outlet></router-outlet>
        </main>

        <!-- Bottom Fixed Navigation Tab Bar (Premium Touch Feel) -->
        <nav class="fixed bottom-0 inset-x-0 bg-bg-surface border-t border-bg-surface-alt pb-safe h-16 flex items-center justify-around z-40 shadow-[0_-4px_16px_rgba(0,0,0,0.5)]">
          <a
            routerLink="/dashboard/home"
            routerLinkActive="text-gold-light border-t-2 border-gold-primary"
            class="flex flex-col items-center justify-center flex-1 h-full text-text-secondary font-oswald text-[10px] tracking-wider uppercase select-none transition-all active:scale-95 border-t-2 border-transparent"
          >
            <!-- Home Icon -->
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5 mb-0.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            Home
          </a>

          <a
            routerLink="/dashboard/progress"
            routerLinkActive="text-gold-light border-t-2 border-gold-primary"
            class="flex flex-col items-center justify-center flex-1 h-full text-text-secondary font-oswald text-[10px] tracking-wider uppercase select-none transition-all active:scale-95 border-t-2 border-transparent"
          >
            <!-- Progress / Somatic Icon -->
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5 mb-0.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
            </svg>
            Progress
          </a>

          <a
            routerLink="/dashboard/attendance"
            routerLinkActive="text-gold-light border-t-2 border-gold-primary"
            class="flex flex-col items-center justify-center flex-1 h-full text-text-secondary font-oswald text-[10px] tracking-wider uppercase select-none transition-all active:scale-95 border-t-2 border-transparent"
          >
            <!-- Attendance Heatmap Icon -->
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5 mb-0.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            Attendance
          </a>

          <a
            routerLink="/dashboard/profile"
            routerLinkActive="text-gold-light border-t-2 border-gold-primary"
            class="flex flex-col items-center justify-center flex-1 h-full text-text-secondary font-oswald text-[10px] tracking-wider uppercase select-none transition-all active:scale-95 border-t-2 border-transparent"
          >
            <!-- Profile Icon -->
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5 mb-0.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            Profile
          </a>
        </nav>
      </div>
    } @else {
      <!-- Desktop & Tablet Landscape View -->
      <div class="flex min-h-screen bg-bg-primary text-text-primary">
        <!-- Sidebar Navigation -->
        <nav class="w-64 h-screen fixed left-0 top-0 border-r border-bg-surface-alt bg-bg-surface z-40 flex flex-col justify-between p-6 select-none shadow-[4px_0_16px_rgba(0,0,0,0.5)]">
          <div class="flex flex-col gap-8">
            <!-- App Branding Logo -->
            <div class="flex items-center gap-3">
              <img src="assets/logo.png" alt="Epicenter Logo" class="w-10 h-10 filter drop-shadow">
              <div class="flex flex-col">
                <span class="text-base font-oswald font-black leading-none tracking-wider text-gold-primary">EPICENTER</span>
                <span class="text-[10px] text-text-secondary font-bold tracking-widest uppercase mt-0.5">Members Portal</span>
              </div>
            </div>

            <!-- Links Collection -->
            <div class="flex flex-col gap-2">
              <a
                routerLink="/dashboard/home"
                routerLinkActive="bg-bg-surface-alt text-gold-light border-l-4 border-gold-primary"
                class="flex items-center gap-3 px-4 py-3 text-sm font-bold text-text-secondary rounded-xl hover:bg-bg-surface-alt hover:text-text-primary transition-all border-l-4 border-transparent active:scale-98"
              >
                <!-- Home Icon -->
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
                Dashboard
              </a>

              <a
                routerLink="/dashboard/progress"
                routerLinkActive="bg-bg-surface-alt text-gold-light border-l-4 border-gold-primary"
                class="flex items-center gap-3 px-4 py-3 text-sm font-bold text-text-secondary rounded-xl hover:bg-bg-surface-alt hover:text-text-primary transition-all border-l-4 border-transparent active:scale-98"
              >
                <!-- Progress Icon -->
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
                </svg>
                My Progress
              </a>

              <a
                routerLink="/dashboard/attendance"
                routerLinkActive="bg-bg-surface-alt text-gold-light border-l-4 border-gold-primary"
                class="flex items-center gap-3 px-4 py-3 text-sm font-bold text-text-secondary rounded-xl hover:bg-bg-surface-alt hover:text-text-primary transition-all border-l-4 border-transparent active:scale-98"
              >
                <!-- Attendance Icon -->
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
                My Attendance
              </a>

              <a
                routerLink="/dashboard/workout"
                routerLinkActive="bg-bg-surface-alt text-gold-light border-l-4 border-gold-primary"
                class="flex items-center gap-3 px-4 py-3 text-sm font-bold text-text-secondary rounded-xl hover:bg-bg-surface-alt hover:text-text-primary transition-all border-l-4 border-transparent active:scale-98"
              >
                <!-- Workout Icon -->
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5M3 9v6M21 9v6M6 6v12M18 6v12" />
                </svg>
                Workout Log
              </a>


              <a
                routerLink="/dashboard/profile"
                routerLinkActive="bg-bg-surface-alt text-gold-light border-l-4 border-gold-primary"
                class="flex items-center gap-3 px-4 py-3 text-sm font-bold text-text-secondary rounded-xl hover:bg-bg-surface-alt hover:text-text-primary transition-all border-l-4 border-transparent active:scale-98"
              >
                <!-- Profile Icon -->
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
                My Profile
              </a>
            </div>
          </div>

          <!-- Bottom Footer Panel with Sign Out -->
          <button
            (click)="logout()"
            class="flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 rounded-xl hover:bg-red-950/20 transition-all active:scale-98 w-full text-left"
          >
            <!-- Logout Icon -->
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            Sign Out
          </button>
        </nav>

        <!-- Connection State Banner (Desktop) -->
        @if (isOffline()) {
          <div class="fixed top-0 left-64 right-0 h-8 bg-gradient-to-r from-gold-primary to-gold-dark text-black flex items-center justify-center gap-1.5 font-bold font-oswald text-[10px] uppercase tracking-wider z-40 shadow">
            <span>⚡ Offline Mode: Showing cached data</span>
          </div>
        }

        <!-- Main Content offset by sidebar -->
        <main 
          [class.pt-8]="!isOffline()"
          [class.pt-16]="isOffline()"
          class="flex-grow ml-64 min-h-screen p-8 bg-bg-primary overflow-x-hidden"
        >
          <router-outlet></router-outlet>
        </main>
      </div>
    }

    <!-- Floating PWA Install Prompt popup (Mobile-Only overlay) -->
    @if (deferredPrompt() && layout.isMobile()) {
      <div class="fixed bottom-20 left-4 right-4 bg-bg-surface border border-bg-surface-alt p-4 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] z-50 flex items-center justify-between animate-slide-up">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-gold-dim rounded-xl text-gold-primary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </div>
          <div class="flex flex-col">
            <span class="text-sm font-bold font-oswald text-text-primary uppercase tracking-wide">Install Epicenter App</span>
            <span class="text-[10px] text-text-secondary">Keep tracker on your home screen</span>
          </div>
        </div>
        
        <div class="flex items-center gap-2">
          <button (click)="installApp()" class="px-4 py-1.5 bg-gradient-to-b from-gold-primary to-gold-dark text-black border border-gold-light text-xs font-bold font-oswald uppercase tracking-wider rounded-lg active:scale-95 transition-all">
            Install
          </button>
          <button (click)="dismissInstall()" class="p-1 text-text-muted hover:text-text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes slideUp {
      from { transform: translateY(100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .animate-slide-up {
      animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  `]
})
export class AppLayoutComponent {
  readonly layout = inject(LayoutService);
  private authService = inject(AuthService);
  private router = inject(Router);

  readonly deferredPrompt = signal<any | null>(null);
  readonly isOffline = signal<boolean>(!navigator.onLine);

  @HostListener('window:online')
  onOnline() {
    this.isOffline.set(false);
  }

  @HostListener('window:offline')
  onOffline() {
    this.isOffline.set(true);
  }

  @HostListener('window:beforeinstallprompt', ['$event'])
  onBeforeInstallPrompt(e: any) {
    e.preventDefault();
    this.deferredPrompt.set(e);
  }

  installApp() {
    const promptEvent = this.deferredPrompt();
    if (!promptEvent) return;
    promptEvent.prompt();
    promptEvent.userChoice.then(() => {
      this.deferredPrompt.set(null);
    });
  }

  dismissInstall() {
    this.deferredPrompt.set(null);
  }

  logout() {
    this.authService.logout().then(() => {
      this.router.navigate(['/login']);
    });
  }
}
