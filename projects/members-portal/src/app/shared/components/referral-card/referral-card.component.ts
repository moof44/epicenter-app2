import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-referral-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-bg-surface border border-bg-surface-alt p-6 rounded-2xl flex flex-col gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.3)] select-none animate-fade-in-up [animation-delay:675ms] transition-all duration-300 hover:shadow-[0_4px_20px_rgba(212,175,55,0.05)] hover:border-gold-primary/10">
      
      <!-- Header -->
      <div class="border-b border-bg-surface-alt pb-3 flex items-center justify-between">
        <div class="flex flex-col">
          <span class="text-[9px] text-gold-light font-bold uppercase tracking-wider">Growth & community</span>
          <h2 class="text-base font-black font-oswald text-text-primary uppercase tracking-wide mt-0.5">Invite a Friend Promo</h2>
        </div>
        <span class="text-xl">🎁</span>
      </div>

      <p class="text-xs text-text-secondary leading-relaxed">
        Bring your friends to train at Epicenter! When your referral avails of a membership, you earn rewards.
      </p>

      <!-- Promo Details Highlight Card -->
      <div class="bg-gradient-to-r from-gold-primary/10 to-gold-primary/5 border border-gold-primary/30 p-4 rounded-xl flex flex-col gap-2 shadow-inner">
        <div class="flex items-center gap-2">
          <span class="text-gold-primary text-base">⭐</span>
          <span class="text-xs font-bold font-oswald text-gold-light uppercase tracking-wider">Permanent Reward</span>
        </div>
        <div class="text-lg font-black font-oswald text-gold-light">
          +7 DAYS MEMBERSHIP
        </div>
        <p class="text-[11px] text-text-secondary leading-normal">
          Get an additional 7 days added to your subscription when your referred friend avails of at least a <strong class="text-text-primary font-bold">Monthly Subscription</strong> package.
        </p>
      </div>

      <!-- Additional Rewards Note -->
      <div class="flex items-start gap-2 bg-bg-surface-alt/30 border border-bg-surface-alt/40 p-3.5 rounded-xl">
        <span class="text-xs shrink-0 mt-0.5">💡</span>
        <div class="flex flex-col gap-0.5">
          <span class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Other Referrals & Rewards</span>
          <p class="text-[10px] text-text-secondary leading-normal">
            Additional rewards may be granted for multiple referrals or special campaigns on a case-to-case basis.
          </p>
        </div>
      </div>

      <!-- How to Claim Guide -->
      <div class="flex flex-col gap-2 bg-bg-surface-alt/25 border border-bg-surface-alt/30 p-4 rounded-xl">
        <span class="text-[9px] text-text-muted font-bold uppercase tracking-wider">How to claim your reward</span>
        <div class="flex items-center gap-3 mt-1">
          <div class="w-6 h-6 rounded-full bg-gold-dim text-gold-primary flex items-center justify-center text-xs font-bold font-oswald border border-gold-primary/20 shrink-0">
            1
          </div>
          <span class="text-[11px] text-text-secondary leading-snug">
            Introduce your referred friend to our <strong class="text-text-primary">Gym Staff</strong>.
          </span>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-6 h-6 rounded-full bg-gold-dim text-gold-primary flex items-center justify-center text-xs font-bold font-oswald border border-gold-primary/20 shrink-0">
            2
          </div>
          <span class="text-[11px] text-text-secondary leading-snug">
            Coordinate with the front desk to log the referral and activate your <strong class="text-gold-light font-bold">7-day extension</strong>.
          </span>
        </div>
      </div>

    </div>
  `,
  styles: [``]
})
export class ReferralCardComponent {}
