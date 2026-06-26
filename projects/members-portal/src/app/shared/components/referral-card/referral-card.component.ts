import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-referral-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-bg-surface border border-bg-surface-alt p-6 rounded-2xl flex flex-col gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.3)] select-none animate-fade-in-up [animation-delay:675ms] transition-all duration-300 hover:shadow-[0_4px_20px_rgba(212,175,55,0.05)] hover:border-gold-primary/10 relative overflow-visible">
      
      <!-- Pixie Dust Sparkles (Background Layer) -->
      <div class="sparkle-container">
        <span class="sparkle" style="top: 15%; left: 8%; animation-delay: 0s;">✨</span>
        <span class="sparkle" style="top: 45%; left: 5%; animation-delay: 2.1s;">✦</span>
        <span class="sparkle" style="top: 75%; left: 12%; animation-delay: 1.5s;">✨</span>
        <span class="sparkle" style="top: 90%; left: 25%; animation-delay: 3.4s;">✦</span>
        <span class="sparkle" style="top: 25%; left: 45%; animation-delay: 2.5s;">✨</span>
        <span class="sparkle" style="top: 5%; left: 50%; animation-delay: 1.1s;">✦</span>
        <span class="sparkle" style="top: 80%; left: 55%; animation-delay: 0.8s;">✨</span>
        <span class="sparkle" style="top: 50%; left: 75%; animation-delay: 2.8s;">✦</span>
        <span class="sparkle" style="top: 15%; left: 85%; animation-delay: 3.2s;">✨</span>
        <span class="sparkle" style="top: 35%; left: 92%; animation-delay: 0.4s;">✦</span>
        <span class="sparkle" style="top: 60%; left: 90%; animation-delay: 1.8s;">✨</span>
        <span class="sparkle" style="top: 85%; left: 80%; animation-delay: 2.9s;">✦</span>
      </div>

      <!-- Header -->
      <div class="border-b border-bg-surface-alt pb-3 flex items-center justify-between relative z-10">
        <div class="flex flex-col">
          <span class="text-[9px] text-gold-light font-bold uppercase tracking-wider">Growth & community</span>
          <h2 class="text-base font-black font-oswald text-text-primary uppercase tracking-wide mt-0.5">Invite a Friend Promo</h2>
        </div>
        <span class="text-xl gift-icon">🎁</span>
      </div>

      <p class="text-xs text-text-secondary leading-relaxed relative z-10">
        Bring your friends to train at Epicenter! When your referral avails of a membership, you earn rewards.
      </p>

      <!-- Promo Details Highlight Card -->
      <div class="permanent-reward-box bg-gradient-to-r from-gold-primary/10 to-gold-primary/5 border p-4 rounded-xl flex flex-col gap-2 shadow-inner">
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
      <div class="flex items-start gap-2 bg-bg-surface-alt/30 border border-bg-surface-alt/40 p-3.5 rounded-xl relative z-10">
        <span class="text-xs shrink-0 mt-0.5">💡</span>
        <div class="flex flex-col gap-0.5">
          <span class="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Other Referrals & Rewards</span>
          <p class="text-[10px] text-text-secondary leading-normal">
            Additional rewards may be granted for multiple referrals or special campaigns on a case-to-case basis.
          </p>
        </div>
      </div>

      <!-- How to Claim Guide -->
      <div class="flex flex-col gap-2 bg-bg-surface-alt/25 border border-bg-surface-alt/30 p-4 rounded-xl relative z-10">
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
  styles: [`
    .sparkle-container {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
      border-radius: 1rem;
      z-index: 0;
    }
    .sparkle {
      position: absolute;
      font-size: 13px;
      opacity: 0;
      animation: sparkle-anim 4s infinite ease-in-out;
      color: var(--gold-light, #ffd700);
      text-shadow: 0 0 5px rgba(251, 191, 36, 0.8);
      z-index: 0;
    }
    @keyframes sparkle-anim {
      0%, 100% {
        transform: scale(0.3) rotate(0deg);
        opacity: 0;
      }
      50% {
        transform: scale(1.1) rotate(180deg);
        opacity: 0.8;
      }
    }
    .gift-icon {
      display: inline-block;
      animation: gift-dance 2.5s infinite ease-in-out;
      transform-origin: bottom center;
    }
    @keyframes gift-dance {
      0%, 100% {
        transform: rotate(0deg) translateY(0) scale(1);
      }
      25% {
        transform: rotate(-12deg) translateY(-4px) scale(1.08);
      }
      50% {
        transform: rotate(0deg) translateY(0) scale(1);
      }
      75% {
        transform: rotate(12deg) translateY(-4px) scale(1.08);
      }
    }
    .permanent-reward-box {
      animation: permanent-glow 2.8s infinite ease-in-out;
      position: relative;
      z-index: 10;
    }
    @keyframes permanent-glow {
      0%, 100% {
        border-color: rgba(212, 175, 55, 0.35);
        box-shadow: inset 0 0 10px rgba(212, 175, 55, 0.05), 0 0 8px rgba(212, 175, 55, 0.15);
      }
      50% {
        border-color: rgba(251, 191, 36, 0.95);
        box-shadow: inset 0 0 15px rgba(251, 191, 36, 0.15), 0 0 20px rgba(251, 191, 36, 0.55);
      }
    }
  `]
})
export class ReferralCardComponent {}
