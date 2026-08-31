import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <button
      [type]="type"
      [disabled]="disabled || loading"
      (click)="onClick($event)"
      [ngClass]="[
        'font-inter font-bold rounded-xl transition-all duration-150 select-none flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-focus focus-visible:ring-offset-2 focus-visible:ring-offset-slate-canvas active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100',
        getSizeClass(),
        getVariantClass(),
        fullWidth ? 'w-full' : ''
      ]"
    >
      <svg *ngIf="loading" class="animate-spin h-4 w-4" [ngClass]="variant === 'primary' ? 'text-text-inverse' : 'text-text-primary'" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <mat-icon *ngIf="icon && !loading" class="text-[18px] w-[18px] h-[18px]">{{ icon }}</mat-icon>
      <ng-content></ng-content>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ButtonComponent {
  @Input() variant: 'primary' | 'secondary' | 'danger' | 'ghost' = 'primary';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() icon?: string;
  @Input() fullWidth = false;

  @Output() btnClick = new EventEmitter<MouseEvent>();

  onClick(event: MouseEvent) {
    if (!this.disabled && !this.loading) {
      this.btnClick.emit(event);
    }
  }

  getSizeClass(): string {
    switch (this.size) {
      case 'sm': return 'h-control-sm px-3 text-xs';
      case 'lg': return 'h-control-lg px-6 text-base';
      case 'md':
      default: return 'h-control-md px-4 text-sm';
    }
  }

  getVariantClass(): string {
    switch (this.variant) {
      case 'secondary':
        return 'bg-slate-surface text-text-primary hover:bg-slate-surface-alt border border-slate-border shadow-sm';
      case 'danger':
        return 'bg-rose-danger text-text-pure hover:bg-rose-danger/90 shadow-sm';
      case 'ghost':
        return 'bg-transparent text-text-secondary hover:text-text-pure hover:bg-slate-surface/60 border border-transparent';
      case 'primary':
      default:
        return 'bg-gradient-to-r from-cyan-primary to-cyan-light hover:from-cyan-hover hover:to-cyan-primary text-text-inverse shadow-glow-cyan';
    }
  }
}
