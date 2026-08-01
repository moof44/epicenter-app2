import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../core/services/dashboard.service';
import { Functions, httpsCallable } from '@angular/fire/functions';

@Component({
  selector: 'app-gamification-ledger',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen text-text-primary py-4 px-2 sm:px-6 select-none animate-fade-in">
      
      <!-- Header -->
      <div class="bg-bg-surface border border-bg-surface-alt p-6 rounded-2xl flex flex-col gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-black font-oswald text-gold-primary uppercase tracking-wide">Somatic Rewards Store</h1>
            <p class="text-xs text-text-secondary">Spend your hard-earned Somatic Coins on premium rewards.</p>
          </div>
          <div class="flex items-center gap-2 bg-bg-surface-alt/50 px-4 py-2 rounded-xl border border-bg-surface-alt">
             <span class="text-2xl">🪙</span>
             <div class="flex flex-col items-end">
               <span class="text-[9px] text-gold-light font-bold uppercase tracking-widest">Your Balance</span>
               <span class="text-xl font-black font-oswald text-gold-primary">{{ dashboardService.gamification()?.coins | number }}</span>
             </div>
          </div>
        </div>
        
        <!-- Locked Reward Vault Banner -->
        @if (!hasActiveSubscription()) {
          <div class="mt-2 bg-gradient-to-r from-amber-950/60 via-red-950/50 to-amber-950/60 border border-gold-primary/40 p-4 rounded-xl flex items-start gap-3 shadow-lg">
            <span class="text-gold-primary text-2xl">🔒</span>
            <div class="flex flex-col gap-0.5">
              <span class="text-xs font-bold text-gold-light uppercase tracking-widest flex items-center gap-1.5">
                Rewards Vault Locked
                <span class="text-[9px] bg-gold-primary/20 text-gold-primary px-2 py-0.5 rounded-full border border-gold-primary/30">
                  {{ (dashboardService.gamification()?.coins || 0) | number }} Coins in Vault
                </span>
              </span>
              <span class="text-xs text-text-secondary leading-relaxed">
                You are accumulating cashback coins on store purchases! Upgrade to an <strong class="text-gold-light">Active Monthly Membership</strong> or <strong class="text-gold-light">PT Plan</strong> to unlock your vault and redeem free rewards in the Store.
              </span>
            </div>
          </div>
        }
      </div>

      <!-- Tabs -->
      <div class="flex gap-4 mt-6 border-b border-bg-surface-alt px-2">
        <button 
          (click)="activeTab.set('STORE')"
          [class.text-gold-primary]="activeTab() === 'STORE'"
          [class.border-gold-primary]="activeTab() === 'STORE'"
          [class.text-text-muted]="activeTab() !== 'STORE'"
          [class.border-transparent]="activeTab() !== 'STORE'"
          class="pb-2 px-2 text-sm font-bold uppercase tracking-widest border-b-2 transition-colors hover:text-gold-light"
        >
          Rewards Store
        </button>
        <button 
          (click)="activeTab.set('VOUCHERS')"
          [class.text-gold-primary]="activeTab() === 'VOUCHERS'"
          [class.border-gold-primary]="activeTab() === 'VOUCHERS'"
          [class.text-text-muted]="activeTab() !== 'VOUCHERS'"
          [class.border-transparent]="activeTab() !== 'VOUCHERS'"
          class="pb-2 px-2 text-sm font-bold uppercase tracking-widest border-b-2 transition-colors hover:text-gold-light flex items-center gap-1.5"
        >
          <span>🎟️ Claim Passes</span>
          @if (dashboardService.pendingVouchers().length > 0) {
            <span class="bg-gold-primary text-bg-surface text-[10px] font-black px-1.5 py-0.5 rounded-full">
              {{ dashboardService.pendingVouchers().length }}
            </span>
          }
        </button>
        <button 
          (click)="activeTab.set('LEDGER')"
          [class.text-gold-primary]="activeTab() === 'LEDGER'"
          [class.border-gold-primary]="activeTab() === 'LEDGER'"
          [class.text-text-muted]="activeTab() !== 'LEDGER'"
          [class.border-transparent]="activeTab() !== 'LEDGER'"
          class="pb-2 px-2 text-sm font-bold uppercase tracking-widest border-b-2 transition-colors hover:text-gold-light"
        >
          Ledger
        </button>
      </div>

      <!-- Store Tab -->
      @if (activeTab() === 'STORE') {
        <div class="mt-6 flex flex-col gap-8">
          
          <!-- Active Pending Claim Passes Banner in Store -->
          @if (dashboardService.pendingVouchers().length > 0) {
            <div class="bg-gradient-to-r from-amber-950/40 via-bg-surface to-amber-950/40 border border-gold-primary/40 p-4 rounded-2xl flex flex-col gap-3 shadow-xl">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-xl">🎟️</span>
                  <h3 class="text-sm font-bold text-gold-light uppercase tracking-wider">Active Counter Claim Passes ({{ dashboardService.pendingVouchers().length }})</h3>
                </div>
                <span class="text-[10px] text-text-muted">Show 6-digit code at gym front desk</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                @for (v of dashboardService.pendingVouchers(); track v.id) {
                  <div class="bg-bg-surface-alt border border-gold-primary/30 p-4 rounded-xl flex flex-col justify-between gap-3 shadow-md">
                    <div>
                      <div class="flex justify-between items-start">
                        <span class="text-xs font-bold text-text-primary uppercase">{{ v.productName }}</span>
                        <span class="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase">Pending</span>
                      </div>
                      <div class="my-2 bg-bg-surface p-2.5 rounded-lg border border-gold-primary/20 text-center">
                        <span class="text-[9px] text-gold-light/70 uppercase tracking-widest block">Claim Code</span>
                        <span class="text-xl font-black font-mono tracking-wider text-gold-primary select-all">{{ v.voucherCode }}</span>
                      </div>
                      <div class="text-[10px] text-text-muted flex justify-between">
                        <span>Coins: 🪙{{ v.coinsSpent | number }}</span>
                        <span>Valid 48h</span>
                      </div>
                    </div>

                    <div class="flex gap-2">
                      <button (click)="activeVoucher.set({ voucherCode: v.voucherCode, itemName: v.productName, cost: v.coinsSpent })" class="flex-1 py-1.5 bg-gold-primary/20 text-gold-light border border-gold-primary/30 rounded-lg text-[10px] font-bold uppercase hover:bg-gold-primary/30 transition-colors">
                        🔎 View Pass
                      </button>
                      <button (click)="openCancelModal(v)" class="flex-1 py-1.5 bg-red-950/60 text-red-400 border border-red-500/30 rounded-lg text-[10px] font-bold uppercase hover:bg-red-900/50 transition-colors">
                        ✖ Refund
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Purchase Feedback Message -->
          @if (purchaseMessage()) {
            <div 
              [class.bg-emerald-950/50]="purchaseMessage()?.type === 'success'"
              [class.border-emerald-500/30]="purchaseMessage()?.type === 'success'"
              [class.text-emerald-400]="purchaseMessage()?.type === 'success'"
              [class.bg-red-950/50]="purchaseMessage()?.type === 'error'"
              [class.border-red-500/30]="purchaseMessage()?.type === 'error'"
              [class.text-red-400]="purchaseMessage()?.type === 'error'"
              class="p-4 rounded-xl border flex items-center justify-between text-xs font-bold animate-fade-in"
            >
              <span>{{ purchaseMessage()?.text }}</span>
              <button (click)="purchaseMessage.set(null)" class="text-text-muted hover:text-text-primary font-mono text-sm">✕</button>
            </div>
          }

          <!-- Tier 1: Quick Rewards -->
          <div>
            <div class="flex items-center gap-2 mb-3">
              <span class="text-xs font-bold text-gold-light uppercase tracking-widest">Tier 1: Daily Refreshers</span>
              <span class="h-[1px] bg-bg-surface-alt flex-1"></span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              @for (item of tier1Items; track item.id) {
                <div class="bg-bg-surface border border-bg-surface-alt p-4 rounded-xl flex flex-col gap-3 transition-transform hover:-translate-y-1">
                  <div class="flex items-start justify-between">
                    <div class="flex gap-3">
                      <span class="text-3xl p-2 bg-bg-surface-alt rounded-lg border border-bg-surface-alt">{{ item.icon }}</span>
                      <div>
                        <h3 class="font-bold text-sm text-text-primary">{{ item.name }}</h3>
                        <p class="text-xs text-text-muted mt-0.5">{{ item.description }}</p>
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center justify-between mt-auto pt-2 border-t border-bg-surface-alt">
                    <span class="text-xs font-bold text-gold-primary flex items-center gap-1">
                      🪙 {{ item.cost | number }}
                    </span>
                    <button 
                      (click)="buyItem(item)"
                      [disabled]="!hasActiveSubscription() || !canAfford(item.cost) || purchasing()"
                      class="px-4 py-1.5 bg-gold-primary text-bg-surface font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-gold-light transition-colors disabled:opacity-40 disabled:hover:bg-gold-primary cursor-pointer disabled:cursor-not-allowed"
                    >
                      Purchase
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Tier 2: Dedicated Rewards -->
          <div>
            <div class="flex items-center gap-2 mb-3">
              <span class="text-xs font-bold text-gold-light uppercase tracking-widest">Tier 2: Dedicated Rewards</span>
              <span class="text-[10px] text-text-muted bg-bg-surface border border-bg-surface-alt px-2 py-0.5 rounded font-mono uppercase">Requires Level 10+</span>
              <span class="h-[1px] bg-bg-surface-alt flex-1"></span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              @for (item of tier2Items; track item.id) {
                <div 
                  [class.opacity-60]="!meetsLevel(item.reqLevel)"
                  class="bg-bg-surface border border-bg-surface-alt p-4 rounded-xl flex flex-col gap-3 transition-transform hover:-translate-y-1 relative overflow-hidden"
                >
                  <div class="flex gap-3">
                    <span class="text-3xl p-2 bg-bg-surface-alt rounded-lg border border-bg-surface-alt">{{ item.icon }}</span>
                    <div>
                      <h3 class="font-bold text-sm text-text-primary">{{ item.name }}</h3>
                      <p class="text-xs text-text-muted mt-0.5">{{ item.description }}</p>
                    </div>
                  </div>

                  @if (!meetsLevel(item.reqLevel)) {
                    <div class="absolute inset-0 bg-bg-surface/80 backdrop-blur-[1px] flex flex-col items-center justify-center p-4 text-center">
                      <span class="text-2xl mb-1">🔒</span>
                      <span class="text-[10px] font-bold text-text-primary uppercase tracking-widest bg-bg-surface px-2 py-1 rounded-md border border-bg-surface-alt">Unlocks at LVL {{ item.reqLevel }}</span>
                    </div>
                  }

                  <div class="flex items-center justify-between mt-auto pt-2 border-t border-bg-surface-alt">
                    <span class="text-xs font-bold text-gold-primary flex items-center gap-1">
                      🪙 {{ item.cost | number }}
                    </span>
                    <button 
                      (click)="buyItem(item)"
                      [disabled]="!hasActiveSubscription() || !canAfford(item.cost) || !meetsLevel(item.reqLevel) || purchasing()"
                      class="px-4 py-1.5 bg-gold-primary text-bg-surface font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-gold-light transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                    >
                      Purchase
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Tier 3: Prestige Collection -->
          <div>
            <div class="flex items-center gap-2 mb-3">
              <span class="text-xs font-bold text-gold-light uppercase tracking-widest">Tier 3: Prestige Collection</span>
              <span class="text-[10px] text-text-muted bg-bg-surface border border-bg-surface-alt px-2 py-0.5 rounded font-mono uppercase">Requires Level 20+ & Badges</span>
              <span class="h-[1px] bg-bg-surface-alt flex-1"></span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              @for (item of tier3Items; track item.id) {
                <div 
                  [class.opacity-60]="!meetsLevel(item.reqLevel) || !hasBadge(item.reqBadge)"
                  class="bg-bg-surface border border-bg-surface-alt p-4 rounded-xl flex flex-col gap-3 transition-transform hover:-translate-y-1 relative overflow-hidden"
                >
                  <div class="flex gap-3">
                    <span class="text-3xl p-2 bg-bg-surface-alt rounded-lg border border-bg-surface-alt">{{ item.icon }}</span>
                    <div>
                      <h3 class="font-bold text-sm text-text-primary">{{ item.name }}</h3>
                      <p class="text-xs text-text-muted mt-0.5">{{ item.description }}</p>
                    </div>
                  </div>

                  @if (!meetsLevel(item.reqLevel) || !hasBadge(item.reqBadge)) {
                    <div class="absolute inset-0 bg-bg-surface/80 backdrop-blur-[1px] flex flex-col items-center justify-center p-4 text-center">
                      <span class="text-2xl mb-1">🔒</span>
                      <span class="text-[10px] font-bold text-gold-light uppercase tracking-widest bg-bg-surface px-2 py-1 rounded-md border border-bg-surface-alt">
                        @if (!meetsLevel(item.reqLevel)) { Unlocks at LVL {{ item.reqLevel }} }
                        @else if (!hasBadge(item.reqBadge)) { Requires {{ item.reqBadge }} Badge }
                      </span>
                    </div>
                  }

                  <div class="flex items-center justify-between mt-auto pt-2 border-t border-bg-surface-alt">
                    <span class="text-xs font-bold text-gold-primary flex items-center gap-1">
                      🪙 {{ item.cost | number }}
                    </span>
                    <button 
                      (click)="buyItem(item)"
                      [disabled]="!hasActiveSubscription() || !canAfford(item.cost) || !meetsLevel(item.reqLevel) || !hasBadge(item.reqBadge) || purchasing()"
                      class="px-4 py-1.5 bg-gold-primary text-bg-surface font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-gold-light transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                    >
                      Purchase
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>

        </div>
      }

      <!-- Vouchers Tab -->
      @if (activeTab() === 'VOUCHERS') {
        <div class="mt-6 flex flex-col gap-6">
          <div class="bg-bg-surface border border-bg-surface-alt p-4 rounded-xl flex items-center justify-between">
            <div>
              <h2 class="text-base font-bold text-gold-primary uppercase tracking-wide">My Digital Claim Passes</h2>
              <p class="text-xs text-text-muted">Present your 6-digit claim code to gym front desk staff to claim your rewards.</p>
            </div>
            <span class="text-xs text-gold-light font-bold bg-gold-primary/10 border border-gold-primary/20 px-3 py-1 rounded-full">
              {{ dashboardService.userVouchers().length }} Total Vouchers
            </span>
          </div>

          @if (dashboardService.userVouchers().length === 0) {
            <div class="bg-bg-surface border border-bg-surface-alt p-12 rounded-2xl text-center flex flex-col items-center gap-2">
              <span class="text-4xl">🎟️</span>
              <span class="text-sm font-bold text-text-primary">No Claim Passes Yet</span>
              <p class="text-xs text-text-muted max-w-xs">Redeem Somatic Coins in the Rewards Store to get your digital voucher claim passes.</p>
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (v of dashboardService.userVouchers(); track v.id) {
                <div class="bg-bg-surface border border-bg-surface-alt p-5 rounded-2xl flex flex-col justify-between gap-4 shadow-lg">
                  <div>
                    <div class="flex justify-between items-start">
                      <span class="font-bold text-sm text-text-primary uppercase">{{ v.productName }}</span>
                      <span 
                        [class.bg-emerald-950]="v.status === 'PENDING_CLAIM'"
                        [class.text-emerald-400]="v.status === 'PENDING_CLAIM'"
                        [class.border-emerald-500\/30]="v.status === 'PENDING_CLAIM'"
                        [class.bg-blue-950]="v.status === 'FULFILLED'"
                        [class.text-blue-400]="v.status === 'FULFILLED'"
                        [class.border-blue-500\/30]="v.status === 'FULFILLED'"
                        [class.bg-red-950]="v.status === 'CANCELLED' || v.status === 'EXPIRED'"
                        [class.text-red-400]="v.status === 'CANCELLED' || v.status === 'EXPIRED'"
                        [class.border-red-500\/30]="v.status === 'CANCELLED' || v.status === 'EXPIRED'"
                        class="text-[9px] border px-2.5 py-0.5 rounded-full font-bold uppercase"
                      >
                        {{ v.status }}
                      </span>
                    </div>

                    <div class="my-3 bg-bg-surface-alt p-3 rounded-xl border border-gold-primary/30 text-center">
                      <span class="text-[9px] text-gold-light/70 uppercase tracking-widest block mb-0.5">Voucher Code</span>
                      <span class="text-2xl font-black font-mono tracking-wider text-gold-primary select-all">{{ v.voucherCode }}</span>
                    </div>

                    <div class="flex flex-col gap-1 text-[11px] text-text-muted">
                      <div class="flex justify-between">
                        <span>Cost:</span>
                        <strong class="text-gold-primary font-oswald">🪙 {{ v.coinsSpent | number }} Coins</strong>
                      </div>
                      <div class="flex justify-between">
                        <span>Issued:</span>
                        <span>{{ v.createdAt | date:'short' }}</span>
                      </div>
                    </div>
                  </div>

                  @if (v.status === 'PENDING_CLAIM') {
                    <div class="flex gap-2 pt-2 border-t border-bg-surface-alt">
                      <button (click)="activeVoucher.set({ voucherCode: v.voucherCode, itemName: v.productName, cost: v.coinsSpent })" class="flex-1 py-2 bg-gold-primary/20 text-gold-light border border-gold-primary/30 rounded-xl text-xs font-bold uppercase hover:bg-gold-primary/30 transition-colors">
                        🔎 View Pass
                      </button>
                      <button (click)="openCancelModal(v)" class="flex-1 py-2 bg-red-950/60 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold uppercase hover:bg-red-900/50 transition-colors">
                        ✖ Refund
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- Ledger Tab -->
      @if (activeTab() === 'LEDGER') {
        <div class="mt-6">
          <div class="bg-bg-surface border border-bg-surface-alt rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-bg-surface-alt bg-bg-surface-alt/40 text-[10px] text-text-secondary font-bold uppercase tracking-wider">
                  <th class="p-4">Date</th>
                  <th class="p-4">Description</th>
                  <th class="p-4 text-right">Coins</th>
                  <th class="p-4 text-right">XP</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-bg-surface-alt text-xs font-medium">
                @for (tx of dashboardService.recentTransactions(); track tx.id || tx.timestamp) {
                  <tr class="hover:bg-bg-surface-alt/30 transition-colors">
                    <td class="p-4 text-text-secondary whitespace-nowrap">
                      {{ tx.timestamp | date:'mediumDate' }}, {{ tx.timestamp | date:'shortTime' }}
                    </td>
                    <td class="p-4 text-text-primary font-bold">
                      {{ tx.description }}
                    </td>
                    <td class="p-4 text-right font-black font-oswald whitespace-nowrap">
                      @if (tx.amount > 0) {
                        <span class="text-emerald-400">+{{ tx.amount | number }}</span>
                      } @else if (tx.amount < 0) {
                        <span class="text-red-400">{{ tx.amount | number }}</span>
                      } @else {
                        <span class="text-text-muted">-</span>
                      }
                    </td>
                    <td class="p-4 text-right font-black font-oswald whitespace-nowrap">
                      @if (tx.xpAdded > 0) {
                        <span class="text-emerald-400">+{{ tx.xpAdded | number }}</span>
                      } @else {
                        <span class="text-text-muted">-</span>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="4" class="p-8 text-center text-text-muted">
                      No transaction history found.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Digital Claim Pass Modal Overlay -->
      @if (activeVoucher()) {
        <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div class="bg-bg-surface border border-gold-primary/50 p-6 rounded-2xl max-w-sm w-full flex flex-col items-center gap-4 text-center shadow-2xl animate-fade-in">
            <span class="text-4xl">🎟️</span>
            <h3 class="text-lg font-black font-oswald text-gold-primary uppercase">Digital Reward Claim Pass</h3>
            <p class="text-xs text-text-muted">Show this code to the front-desk staff at the gym counter to receive your {{ activeVoucher()?.itemName }}.</p>
            
            <div class="bg-bg-surface-alt p-4 rounded-xl border border-gold-primary/30 w-full my-2">
              <span class="text-[10px] text-gold-light font-bold uppercase tracking-widest block mb-1">Voucher Claim Code</span>
              <span class="text-3xl font-black font-mono tracking-wider text-gold-primary select-all">{{ activeVoucher()?.voucherCode }}</span>
            </div>

            <span class="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <span>⏳ Status:</span> Pending Claim at Counter
            </span>

            <div class="flex flex-col gap-2 w-full mt-2">
              <button (click)="activeVoucher.set(null)" class="w-full py-2.5 bg-gold-primary text-bg-surface font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-gold-light transition-colors">
                Close Pass
              </button>
              <button (click)="confirmCancelVoucher.set(true)" [disabled]="purchasing()" class="w-full py-2 bg-red-950/60 border border-red-500/30 text-red-400 font-bold text-[10px] uppercase tracking-wider rounded-xl hover:bg-red-900/50 transition-colors disabled:opacity-50">
                ✖ Cancel & Refund Coins
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Confirm Purchase Modal Overlay -->
      @if (confirmPurchaseItem()) {
        <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div class="bg-bg-surface border border-gold-primary/50 p-6 rounded-2xl max-w-sm w-full flex flex-col items-center gap-4 text-center shadow-2xl animate-fade-in">
            <span class="text-4xl">{{ confirmPurchaseItem()?.icon }}</span>
            <h3 class="text-lg font-black font-oswald text-gold-primary uppercase">Confirm Reward Purchase</h3>
            <p class="text-xs text-text-muted">Are you sure you want to redeem <strong>{{ confirmPurchaseItem()?.name }}</strong>?</p>
            
            <div class="bg-bg-surface-alt p-4 rounded-xl border border-gold-primary/30 w-full flex flex-col gap-2 my-1">
              <div class="flex justify-between items-center text-xs">
                <span class="text-text-muted">Reward Cost:</span>
                <strong class="text-gold-primary font-oswald text-sm">🪙 {{ confirmPurchaseItem()?.cost | number }} Coins</strong>
              </div>
              <div class="flex justify-between items-center text-xs pt-2 border-t border-bg-surface">
                <span class="text-text-muted">Coins After:</span>
                <strong class="text-text-primary font-oswald">🪙 {{ (dashboardService.gamification()?.coins || 0) - (confirmPurchaseItem()?.cost || 0) | number }} Coins</strong>
              </div>
            </div>

            @if (purchaseErrorMessage()) {
              <div class="bg-red-950/60 border border-red-500/40 text-red-400 p-2.5 rounded-xl text-xs w-full text-center">
                {{ purchaseErrorMessage() }}
              </div>
            }

            <div class="flex gap-3 w-full mt-2">
              <button (click)="confirmPurchaseItem.set(null); purchaseErrorMessage.set(null)" [disabled]="purchasing()" class="flex-1 py-2.5 bg-bg-surface-alt border border-text-muted/30 text-text-secondary font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-bg-surface transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button (click)="executePurchase()" [disabled]="purchasing()" class="flex-1 py-2.5 bg-gold-primary text-bg-surface font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-gold-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                @if (purchasing()) {
                  <span class="w-4 h-4 border-2 border-bg-surface border-t-transparent rounded-full animate-spin"></span>
                } @else {
                  <span>Confirm & Redeem</span>
                }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Confirm Cancel Voucher Modal Overlay -->
      @if (confirmCancelVoucher()) {
        <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div class="bg-bg-surface border border-red-500/50 p-6 rounded-2xl max-w-sm w-full flex flex-col items-center gap-4 text-center shadow-2xl animate-fade-in">
            <span class="text-4xl">⚠️</span>
            <h3 class="text-lg font-black font-oswald text-red-400 uppercase">Cancel Reward Voucher?</h3>
            <p class="text-xs text-text-muted">This will void voucher code <strong>{{ targetCancelVoucher()?.voucherCode || activeVoucher()?.voucherCode }}</strong> and refund <strong>{{ (targetCancelVoucher()?.coinsSpent || activeVoucher()?.cost || 0) | number }} Coins</strong> back to your wallet.</p>

            @if (purchaseErrorMessage()) {
              <div class="bg-red-950/60 border border-red-500/40 text-red-400 p-2.5 rounded-xl text-xs w-full text-center">
                {{ purchaseErrorMessage() }}
              </div>
            }

            <div class="flex gap-3 w-full mt-2">
              <button (click)="confirmCancelVoucher.set(false); targetCancelVoucher.set(null); purchaseErrorMessage.set(null)" [disabled]="purchasing()" class="flex-1 py-2.5 bg-bg-surface-alt border border-text-muted/30 text-text-secondary font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-bg-surface transition-colors disabled:opacity-50">
                Keep Pass
              </button>
              <button (click)="executeCancelVoucher()" [disabled]="purchasing()" class="flex-1 py-2.5 bg-red-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                @if (purchasing()) {
                  <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                } @else {
                  <span>Confirm Refund</span>
                }
              </button>
            </div>
          </div>
        </div>
      }

    </div>
  `
})
export class GamificationLedger {
  dashboardService = inject(DashboardService);
  private functions = inject(Functions);
  
  activeTab = signal<'STORE' | 'VOUCHERS' | 'LEDGER'>('STORE');
  purchasing = signal<boolean>(false);
  purchaseMessage = signal<{text: string, type: 'success'|'error'} | null>(null);
  purchaseErrorMessage = signal<string | null>(null);

  readonly hasActiveSubscription = computed(() => {
    const data = this.dashboardService.memberData();
    return data && data.membershipStatus === 'Active';
  });

  tier1Items = [
    { id: 'coffee', name: 'Coffee + Stevia', description: 'Freshly brewed black coffee with stevia.', icon: '☕', cost: 15000, reqLevel: 1 },
    { id: 'creatine', name: 'Creatine Scoop', description: '5g of pure monohydrate.', icon: '💪', cost: 20000, reqLevel: 1 },
  ];

  tier2Items = [
    { id: 'whey', name: 'Whey Protein', description: 'One full scoop of premium whey.', icon: '🥤', cost: 63000, reqLevel: 10 },
    { id: 'whey_creatine_milk', name: 'Whey + Creatine + Milk', description: 'The ultimate post-workout shake.', icon: '🥛', cost: 90000, reqLevel: 12 },
    { id: 'umbrella', name: 'Epicenter Umbrella', description: 'Exclusive gym merch.', icon: '☂️', cost: 125000, reqLevel: 15 },
  ];

  tier3Items = [
    { id: 'walkin', name: 'Friend Walk-in Pass', description: 'Bring a friend for free for one day.', icon: '🎟️', cost: 70000, reqLevel: 20, reqBadge: 'silver-consistent' },
    { id: 'freemonth', name: '1 Free Month', description: 'A massive reward for ultimate loyalty.', icon: '👑', cost: 700000, reqLevel: 30, reqBadge: 'gold-legend' },
  ];

  activeVoucher = signal<{ voucherCode: string, itemName: string, cost: number } | null>(null);
  targetCancelVoucher = signal<any | null>(null);
  confirmPurchaseItem = signal<any | null>(null);
  confirmCancelVoucher = signal<boolean>(false);

  buyItem(item: any) {
    this.purchaseErrorMessage.set(null);
    this.confirmPurchaseItem.set(item);
  }

  openCancelModal(v: any) {
    this.purchaseErrorMessage.set(null);
    this.targetCancelVoucher.set(v);
    this.confirmCancelVoucher.set(true);
  }

  async executePurchase() {
    const item = this.confirmPurchaseItem();
    if (!item) return;

    this.purchasing.set(true);
    this.purchaseErrorMessage.set(null);

    try {
      const buyFn = httpsCallable(this.functions, 'purchaseStoreReward');
      const res = await buyFn({
        memberId: this.dashboardService.memberData()?.id,
        itemName: item.name,
        cost: item.cost,
        requiredLevel: item.reqLevel,
        requiredBadge: item.reqBadge
      });

      const data = res.data as any;
      const voucherCode = data?.voucherCode || 'CLAIM-SUCCESS';

      this.activeVoucher.set({
        voucherCode,
        itemName: item.name,
        cost: item.cost
      });

      this.confirmPurchaseItem.set(null);
    } catch (err: any) {
      console.error(err);
      this.purchaseErrorMessage.set(err.message || 'Purchase failed.');
    } finally {
      this.purchasing.set(false);
    }
  }

  async executeCancelVoucher() {
    const v = this.targetCancelVoucher() || this.activeVoucher();
    if (!v) return;

    this.purchasing.set(true);
    this.purchaseErrorMessage.set(null);

    try {
      const cancelFn = httpsCallable(this.functions, 'cancelRedemptionVoucher');
      await cancelFn({
        voucherCode: v.voucherCode,
        voucherId: v.id
      });

      this.activeVoucher.set(null);
      this.targetCancelVoucher.set(null);
      this.confirmCancelVoucher.set(false);
    } catch (err: any) {
      console.error('Cancel voucher error:', err);
      this.purchaseErrorMessage.set(`Unable to cancel voucher: ${err.message || err}`);
    } finally {
      this.purchasing.set(false);
    }
  }

  canAfford(cost: number): boolean {
    const balance = this.dashboardService.gamification()?.coins || 0;
    return balance >= cost;
  }

  meetsLevel(req: number): boolean {
    const level = this.dashboardService.gamification()?.level || 1;
    return level >= req;
  }

  hasBadge(reqBadge?: string): boolean {
    if (!reqBadge) return true;
    const data = this.dashboardService.memberData();
    if (!data) return false;
    const earned = data.earnedMonthlyBadges || [];
    const equipped = data.equippedBadges || [];
    return earned.includes(reqBadge) || equipped.includes(reqBadge);
  }
}
