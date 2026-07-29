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
                  <div class="text-3xl">{{ item.icon }}</div>
                  <div class="flex flex-col">
                    <span class="text-sm font-bold text-text-primary">{{ item.name }}</span>
                    <span class="text-[10px] text-text-secondary">{{ item.description }}</span>
                  </div>
                  <div class="mt-auto pt-3 border-t border-bg-surface-alt flex items-center justify-between">
                    <span class="text-sm font-bold text-gold-primary flex items-center gap-1"><span class="text-[10px]">🪙</span> {{ item.cost | number }}</span>
                    <button 
                      [disabled]="!canAfford(item.cost) || !hasActiveSubscription() || purchasing()"
                      (click)="purchase(item)"
                      class="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
                      [class.bg-gold-primary]="canAfford(item.cost) && hasActiveSubscription()"
                      [class.text-bg-surface]="canAfford(item.cost) && hasActiveSubscription()"
                      [class.hover:bg-gold-light]="canAfford(item.cost) && hasActiveSubscription()"
                      [class.bg-bg-surface-alt]="!canAfford(item.cost) || !hasActiveSubscription()"
                    >
                      {{ purchasing() ? 'Processing...' : 'Purchase' }}
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Tier 2: Dedicated -->
          <div>
            <h2 class="text-lg font-bold font-oswald text-text-primary uppercase tracking-wide mb-3 flex items-center gap-2">
              <span class="text-blue-400">●</span> Tier 2: Dedicated Rewards
              <span class="ml-2 text-[9px] text-text-muted tracking-widest border border-bg-surface-alt px-1.5 py-0.5 rounded">Requires Level 10+</span>
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (item of tier2Items; track item.id) {
                <div class="bg-bg-surface border border-bg-surface-alt p-4 rounded-xl flex flex-col gap-3 relative overflow-hidden" [class.opacity-60]="!meetsLevel(item.reqLevel)">
                  @if (!meetsLevel(item.reqLevel)) {
                    <div class="absolute inset-0 bg-bg-base/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-2">
                      <span class="text-3xl">🔒</span>
                      <span class="text-[10px] font-bold text-text-primary uppercase tracking-widest bg-bg-surface px-2 py-1 rounded-md border border-bg-surface-alt">Unlocks at LVL {{ item.reqLevel }}</span>
                    </div>
                  }
                  <div class="text-3xl">{{ item.icon }}</div>
                  <div class="flex flex-col">
                    <span class="text-sm font-bold text-text-primary">{{ item.name }}</span>
                    <span class="text-[10px] text-text-secondary">{{ item.description }}</span>
                  </div>
                  <div class="mt-auto pt-3 border-t border-bg-surface-alt flex items-center justify-between">
                    <span class="text-sm font-bold text-gold-primary flex items-center gap-1"><span class="text-[10px]">🪙</span> {{ item.cost | number }}</span>
                    <button 
                      [disabled]="!canAfford(item.cost) || !hasActiveSubscription() || !meetsLevel(item.reqLevel) || purchasing()"
                      (click)="purchase(item)"
                      class="px-3 py-1.5 bg-gold-primary text-bg-surface rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-gold-light transition-colors disabled:opacity-50 disabled:bg-bg-surface-alt disabled:text-text-muted relative z-20"
                    >
                      Purchase
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Tier 3: Prestige -->
          <div>
            <h2 class="text-lg font-bold font-oswald text-text-primary uppercase tracking-wide mb-3 flex items-center gap-2">
              <span class="text-purple-400">●</span> Tier 3: Prestige Collection
              <span class="ml-2 text-[9px] text-text-muted tracking-widest border border-bg-surface-alt px-1.5 py-0.5 rounded">Requires Level 20+ & Badges</span>
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (item of tier3Items; track item.id) {
                <div class="bg-gradient-to-br from-bg-surface to-bg-surface-alt border border-purple-900/30 p-4 rounded-xl flex flex-col gap-3 relative overflow-hidden" [class.opacity-60]="!meetsLevel(item.reqLevel) || !meetsBadge(item.reqBadge)">
                  @if (!meetsLevel(item.reqLevel) || !meetsBadge(item.reqBadge)) {
                    <div class="absolute inset-0 bg-bg-base/70 backdrop-blur-[3px] z-10 flex flex-col items-center justify-center gap-2">
                      <span class="text-3xl">🔒</span>
                      <span class="text-[10px] font-bold text-text-primary uppercase tracking-widest bg-bg-surface px-2 py-1 rounded-md border border-bg-surface-alt shadow-lg text-center">
                        @if (!meetsLevel(item.reqLevel)) { Unlocks at LVL {{ item.reqLevel }} }
                        @else { Requires {{ item.reqBadge === 'gold-legend' ? 'Gold' : 'Silver' }} Badge }
                      </span>
                    </div>
                  }
                  <div class="text-4xl">{{ item.icon }}</div>
                  <div class="flex flex-col">
                    <span class="text-sm font-bold text-text-primary">{{ item.name }}</span>
                    <span class="text-[10px] text-text-secondary">{{ item.description }}</span>
                  </div>
                  <div class="mt-auto pt-3 border-t border-purple-900/30 flex items-center justify-between">
                    <span class="text-sm font-bold text-gold-primary flex items-center gap-1"><span class="text-[10px]">🪙</span> {{ item.cost | number }}</span>
                    <button 
                      [disabled]="!canAfford(item.cost) || !hasActiveSubscription() || !meetsLevel(item.reqLevel) || !meetsBadge(item.reqBadge) || purchasing()"
                      (click)="purchase(item)"
                      class="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50 relative z-20 shadow-lg shadow-purple-900/20"
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

      <!-- LEDGER VIEW -->
      @if (activeTab() === 'LEDGER') {
        <div class="mt-6 bg-bg-surface border border-bg-surface-alt rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-bg-surface-alt bg-bg-surface-alt/20">
                  <th class="p-4 text-[10px] text-text-secondary font-bold uppercase tracking-wider">Date</th>
                  <th class="p-4 text-[10px] text-text-secondary font-bold uppercase tracking-wider">Description</th>
                  <th class="p-4 text-[10px] text-text-secondary font-bold uppercase tracking-wider text-right">Coins</th>
                  <th class="p-4 text-[10px] text-text-secondary font-bold uppercase tracking-wider text-right">XP</th>
                </tr>
              </thead>
              <tbody>
                @for (tx of dashboardService.recentTransactions(); track tx.id) {
                  <tr class="border-b border-bg-surface-alt/50 hover:bg-bg-surface-alt/20 transition-colors">
                    <td class="p-4 text-xs text-text-muted whitespace-nowrap">{{ tx.timestamp | date:'MMM d, y, h:mm a' }}</td>
                    <td class="p-4 text-xs text-text-primary">{{ tx.description }}</td>
                    <td class="p-4 text-xs font-bold text-right whitespace-nowrap" [class.text-emerald-400]="tx.amount > 0" [class.text-red-400]="tx.amount < 0">
                      {{ tx.amount > 0 ? '+' : '' }}{{ tx.amount | number }}
                    </td>
                    <td class="p-4 text-xs font-bold text-right text-emerald-400 whitespace-nowrap">
                      {{ tx.xpAdded > 0 ? '+' : '' }}{{ tx.xpAdded > 0 ? (tx.xpAdded | number) : '-' }}
                    </td>
                  </tr>
                }
                @if (dashboardService.recentTransactions().length === 0) {
                  <tr>
                    <td colspan="4" class="p-8 text-center text-sm text-text-muted">No transactions found.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `
})
export class GamificationLedger {
  dashboardService = inject(DashboardService);
  private functions = inject(Functions);
  
  activeTab = signal<'STORE' | 'LEDGER'>('STORE');
  purchasing = signal<boolean>(false);
  purchaseMessage = signal<{text: string, type: 'success'|'error'} | null>(null);

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

  canAfford(cost: number): boolean {
    const balance = this.dashboardService.gamification()?.coins || 0;
    return balance >= cost;
  }

  meetsLevel(req: number): boolean {
    const level = this.dashboardService.gamification()?.level || 1;
    return level >= req;
  }

  meetsBadge(reqBadge?: string): boolean {
    if (!reqBadge) return true;
    const data = this.dashboardService.memberData();
    if (!data) return false;
    const earned = data.earnedMonthlyBadges || [];
    const equipped = data.equippedBadges || [];
    return earned.includes(reqBadge) || equipped.includes(reqBadge);
  }

  async purchase(item: any) {
    if (!confirm(`Are you sure you want to purchase ${item.name} for ${item.cost} coins?`)) return;
    
    this.purchasing.set(true);
    this.purchaseMessage.set(null);
    
    try {
      const buyFn = httpsCallable(this.functions, 'purchaseStoreReward');
      const result = await buyFn({
        itemName: item.name,
        cost: item.cost,
        requiredLevel: item.reqLevel,
        requiredBadge: item.reqBadge
      });
      
      this.purchaseMessage.set({ text: (result.data as any).message || 'Purchase successful!', type: 'success' });
      alert('Purchase Successful! Show this to the front desk to claim your reward.');
    } catch (err: any) {
      console.error(err);
      this.purchaseMessage.set({ text: err.message || 'Purchase failed', type: 'error' });
      alert(`Purchase failed: ${err.message}`);
    } finally {
      this.purchasing.set(false);
    }
  }
}
