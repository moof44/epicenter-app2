import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span [ngClass]="[
      'inline-flex items-center gap-1.5 font-bold uppercase tracking-wider rounded-full font-inter select-none',
      getSizeClass(),
      getVariantClass()
    ]">
      <span *ngIf="dot" class="w-1.5 h-1.5 rounded-full" [ngClass]="getDotClass()"></span>
      <ng-content></ng-content>
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BadgeComponent {
  @Input() variant: 'success' | 'warning' | 'danger' | 'cyan' | 'gold' | 'muted' = 'muted';
  @Input() size: 'sm' | 'md' = 'md';
  @Input() dot = false;

  getSizeClass(): string {
    return this.size === 'sm' ? 'px-2 py-0.5 text-2xs' : 'px-2.5 py-1 text-xs';
  }

  getVariantClass(): string {
    switch (this.variant) {
      case 'success':
        return 'bg-mint-dim text-mint-success border border-mint-success/30';
      case 'warning':
        return 'bg-amber-dim text-amber-warn border border-amber-warn/30';
      case 'danger':
        return 'bg-rose-dim text-rose-danger border border-rose-danger/30';
      case 'cyan':
        return 'bg-cyan-dim text-cyan-light border border-cyan-focus/40';
      case 'gold':
        return 'bg-eagle-gold-dim text-eagle-gold-light border border-eagle-gold/30';
      case 'muted':
      default:
        return 'bg-slate-surface text-text-secondary border border-slate-border';
    }
  }

  getDotClass(): string {
    switch (this.variant) {
      case 'success': return 'bg-mint-success';
      case 'warning': return 'bg-amber-warn';
      case 'danger': return 'bg-rose-danger';
      case 'cyan': return 'bg-cyan-light';
      case 'gold': return 'bg-eagle-gold-light';
      case 'muted':
      default: return 'bg-text-secondary';
    }
  }
}
