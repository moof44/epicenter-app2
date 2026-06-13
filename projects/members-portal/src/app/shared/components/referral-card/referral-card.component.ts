import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-referral-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-bg-surface border border-bg-surface-alt p-6 rounded-2xl flex flex-col gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
      
      <!-- Header -->
      <div class="border-b border-bg-surface-alt pb-3 flex items-center justify-between">
        <div class="flex flex-col">
          <span class="text-[9px] text-gold-light font-bold uppercase tracking-wider">Growth & community</span>
          <h2 class="text-base font-black font-oswald text-text-primary uppercase tracking-wide mt-0.5">Invite a Friend</h2>
        </div>
        <span class="text-xl">🎁</span>
      </div>

      <p class="text-xs text-text-secondary leading-relaxed">
        Invite your friends to train at Epicenter! Share your unique referral code. When they sign up, both of you get <strong>7 days of free gym access</strong> credited to your accounts.
      </p>

      <!-- Referral Link Preview -->
      <div class="flex flex-col gap-1.5 bg-bg-surface-alt/40 border border-bg-surface-alt/20 p-3 rounded-xl">
        <span class="text-[9px] text-text-secondary font-bold uppercase tracking-wider">Your Referral Link</span>
        <span class="font-mono text-[10px] text-gold-light select-all break-all">{{ referralUrl() }}</span>
      </div>

      <!-- Actions -->
      <div class="flex flex-col sm:flex-row gap-3 mt-1">
        <button 
          (click)="shareInvite()"
          class="flex-1 btn-primary font-bold text-xs tracking-wider uppercase h-10 flex items-center justify-center gap-1.5"
        >
          <span>Share Link</span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935-2.186 2.25 2.25 0 0 0-3.935 2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
          </svg>
        </button>

        <button 
          (click)="showQR.set(true)"
          class="flex-1 px-4 h-10 border border-bg-surface-alt bg-bg-surface-alt/40 text-text-primary text-xs font-bold font-oswald uppercase tracking-wider rounded-xl active:scale-95 transition-all hover:bg-bg-surface-alt/60 flex items-center justify-center gap-1.5"
        >
          <span>Show QR Code</span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 12v1.5m-3 0v3m-3-1.5h1.5m2.25 0h1.5m-3-1.5h.008v.008H13.5V13.5Zm3 0h.008v.008H16.5V13.5Zm0 3h.008v.008H16.5v-.008Zm-3 0h.008v.008H13.5v-.008Zm0-6h.008v.008H13.5V10.5Zm3 0h.008v.008H16.5V10.5Zm-6 0h.008v.008H10.5V10.5Zm0 3h.008v.008H10.5V13.5Z" />
          </svg>
        </button>
      </div>

      <!-- Status toast message -->
      @if (copyToast()) {
        <span class="text-[9px] text-emerald-400 font-bold self-center animate-fade-in">
          ✔️ Link copied to clipboard!
        </span>
      }

      <!-- QR Code Popup overlay -->
      @if (showQR()) {
        <div 
          (click)="closeQRFromBackdrop($event)"
          (keydown.escape)="showQR.set(false)"
          tabindex="0"
          role="button"
          aria-label="Close QR popup"
          class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
        >
          <div 
            class="w-full max-w-xs bg-bg-surface border border-bg-surface-alt p-6 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.6)] flex flex-col items-center gap-4 animate-scale-up text-center font-sans"
          >
            <div class="flex justify-between items-center w-full border-b border-bg-surface-alt pb-3">
              <span class="text-xs font-bold font-oswald text-gold-primary uppercase tracking-wide">Scan to Join</span>
              <button 
                (click)="showQR.set(false)"
                class="text-text-muted hover:text-text-primary text-xs"
              >
                ✕
              </button>
            </div>

            <!-- QR code image -->
            <div class="w-44 h-44 bg-white p-2 rounded-xl flex items-center justify-center border border-bg-surface-alt/40">
              <img 
                [src]="qrCodeUrl()" 
                alt="Referral QR Code" 
                class="w-full h-full object-contain"
              />
            </div>

            <span class="text-[10px] text-text-secondary text-center leading-relaxed">
              Have your friend scan this QR code with their camera to sign up with your referral code.
            </span>

            <button 
              (click)="showQR.set(false)"
              class="w-full h-9 bg-bg-surface-alt border border-bg-surface-alt/45 text-text-primary text-xs font-bold font-oswald uppercase tracking-wider rounded-xl active:scale-95 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .animate-fade-in {
      animation: fadeIn 0.2s ease-out forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scaleUp {
      from { transform: scale(0.92); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .animate-scale-up {
      animation: scaleUp 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
  `]
})
export class ReferralCardComponent {
  private authService = inject(AuthService);

  readonly showQR = signal<boolean>(false);
  readonly copyToast = signal<boolean>(false);

  readonly usernamePhone = computed(() => {
    const profile = this.authService.memberProfile();
    if (!profile || !profile.email) return '09000000000';
    return profile.email.split('@')[0]; // retrieve phone number from normalized login email
  });

  readonly referralUrl = computed(() => {
    return `https://epicentergym.ph/join?ref=${this.usernamePhone()}`;
  });

  readonly qrCodeUrl = computed(() => {
    const encoded = encodeURIComponent(this.referralUrl());
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encoded}`;
  });

  async shareInvite() {
    const shareData = {
      title: 'Join Epicenter Gym',
      text: `Train with me at Epicenter Gym! Use my referral link to get 7 days of free access credited when you register.`,
      url: this.referralUrl()
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Error sharing link:', err);
      }
    } else {
      // Fallback copy to clipboard
      try {
        await navigator.clipboard.writeText(this.referralUrl());
        this.copyToast.set(true);
        setTimeout(() => this.copyToast.set(false), 2000);
      } catch (err) {
        console.error('Clipboard copy failed:', err);
        alert('Could not copy link automatically. Please highlight and copy the link manually.');
      }
    }
  }

  closeQRFromBackdrop(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.showQR.set(false);
    }
  }
}
