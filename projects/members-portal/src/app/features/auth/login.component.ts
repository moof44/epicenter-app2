import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-bg-primary text-text-primary flex flex-col justify-center items-center px-4 py-12 select-none">
      
      <!-- Brand Logo Header -->
      <div class="flex flex-col items-center mb-8">
        <img src="assets/logo.png" alt="Epicenter Gym Logo" class="w-24 h-24 mb-4 filter drop-shadow-[0_0_20px_rgba(212,175,55,0.3)]">
        <h1 class="text-3xl font-black tracking-wider text-gold-primary">EPICENTER GYM</h1>
        <p class="text-xs text-text-secondary font-bold tracking-widest uppercase mt-1">Members Portal</p>
      </div>

      <!-- Login Card Container -->
      <div class="w-full max-w-md card-surface flex flex-col gap-6">
        
        @if (isLoadingToken()) {
          <!-- Auto-login loading indicator -->
          <div class="flex flex-col items-center justify-center py-10 gap-3">
            <svg class="animate-spin h-10 w-10 text-gold-primary" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="text-sm font-bold uppercase tracking-wider text-gold-light">Signing in via QR Code...</span>
          </div>
        } @else {
          <h2 class="text-xl font-bold tracking-wide text-gold-primary border-b border-bg-surface-alt pb-3">Member Sign In</h2>

          <!-- Error Alert Banner -->
          @if (errorMessage()) {
            <div class="bg-red-950/20 border border-red-800 text-red-400 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
              <span class="text-base">⚠️</span>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <form (submit)="onSubmit()" class="flex flex-col gap-4">
            <!-- Phone Input -->
            <div class="flex flex-col gap-1.5">
              <label for="phone-input" class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Phone Number</label>
              <input 
                id="phone-input"
                type="tel" 
                [(ngModel)]="phone" 
                name="phone" 
                placeholder="e.g. 09171234567"
                required
                class="w-full h-12 px-4 rounded-xl bg-bg-surface-alt border border-bg-surface-alt text-text-primary placeholder-text-muted focus:border-gold-primary focus:outline-none transition-colors"
              />
            </div>

            <!-- Birthday PIN Input -->
            <div class="flex flex-col gap-1.5">
              <label for="pin-input" class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Birthday PIN (MMDDYYYY)</label>
              <input 
                id="pin-input"
                type="password" 
                [(ngModel)]="birthdayPin" 
                name="birthdayPin" 
                placeholder="e.g. 12251995"
                required
                class="w-full h-12 px-4 rounded-xl bg-bg-surface-alt border border-bg-surface-alt text-text-primary placeholder-text-muted focus:border-gold-primary focus:outline-none transition-colors"
              />
            </div>

            <!-- Submit Button -->
            <button 
              type="submit" 
              [disabled]="isSubmitting()"
              class="w-full btn-primary font-bold tracking-wider uppercase mt-2 flex items-center justify-center gap-2"
            >
              @if (isSubmitting()) {
                <svg class="animate-spin h-5 w-5 text-black" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying Credentials...
              } @else {
                Sign In
              }
            </button>
          </form>

          <!-- Advisory Guidance Card -->
          <div class="bg-bg-surface-alt border border-bg-surface-alt/50 p-4 rounded-xl flex flex-col gap-2">
            <span class="text-[10px] text-gold-light font-bold uppercase tracking-wider">Default Login PINs</span>
            <ul class="text-[11px] text-text-secondary list-disc pl-4 flex flex-col gap-1 leading-relaxed">
              <li>Your username is your registered **11-digit mobile number** (e.g. 09171234567).</li>
              <li>Your password is your **birthdate** as an 8-digit PIN (MMDDYYYY, e.g. 12251995).</li>
              <li>If you are at the gym, ask your trainer to scan the **Auto-Login QR Code** to sign in instantly.</li>
            </ul>
          </div>
        }

      </div>
    </div>
  `,
  styles: []
})
export class LoginComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  phone = '';
  birthdayPin = '';

  isSubmitting = signal<boolean>(false);
  isLoadingToken = signal<boolean>(false);
  errorMessage = signal<string>('');

  ngOnInit() {
    // Check for query custom token (QR login flow)
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (token) {
        this.handleTokenLogin(token);
      }
    });
  }

  private async handleTokenLogin(token: string) {
    this.isLoadingToken.set(true);
    this.errorMessage.set('');
    try {
      await this.authService.loginWithCustomToken(token);
      this.router.navigate(['/dashboard/home']);
    } catch (err: any) {
      console.error('Custom token sign-in failed:', err);
      this.errorMessage.set('QR Code login expired or invalid. Please log in manually or scan a new code.');
      this.isLoadingToken.set(false);
    }
  }

  async onSubmit() {
    if (this.isSubmitting()) return;
    this.isSubmitting.set(true);
    this.errorMessage.set('');

    try {
      await this.authService.loginWithCredentials(this.phone, this.birthdayPin);
      this.router.navigate(['/dashboard/home']);
    } catch (err: any) {
      console.error('Login failed:', err);
      let msg = err.message || 'Incorrect credentials. Please verify your phone number and PIN.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        msg = 'Incorrect phone number or birthday PIN. Verify your info or ask the front desk.';
      }
      this.errorMessage.set(msg);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
