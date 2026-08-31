import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardComponent {
  @Input() variant: 'default' | 'elevated' | 'glass' | 'interactive' = 'default';
  @Input() noPadding = false;

  getVariantClass(): string {
    switch (this.variant) {
      case 'elevated':
        return 'bg-slate-app border border-slate-border shadow-card-elevated rounded-2xl';
      case 'glass':
        return 'bg-slate-app/90 backdrop-blur-md border border-slate-border shadow-card rounded-2xl';
      case 'interactive':
        return 'bg-slate-app border border-slate-border hover:border-slate-border-light shadow-card hover:shadow-card-elevated rounded-2xl transition-all cursor-pointer';
      case 'default':
      default:
        return 'bg-slate-app border border-slate-border shadow-card rounded-2xl';
    }
  }
}
