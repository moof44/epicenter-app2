import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-icon-button',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <button
      type="button"
      [attr.aria-label]="ariaLabel"
      [title]="ariaLabel"
      [disabled]="disabled"
      (click)="onClick($event)"
      [ngClass]="[
        'flex items-center justify-center rounded-xl transition-all duration-150 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-focus active:scale-95 disabled:opacity-40 disabled:pointer-events-none',
        getSizeClass(),
        getVariantClass()
      ]"
    >
      <mat-icon [ngClass]="getIconSizeClass()">{{ icon }}</mat-icon>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IconButtonComponent {
  @Input({ required: true }) icon!: string;
  @Input({ required: true }) ariaLabel!: string;
  @Input() variant: 'default' | 'primary' | 'danger' | 'ghost' = 'default';
  @Input() size: 'sm' | 'md' = 'md';
  @Input() disabled = false;

  @Output() btnClick = new EventEmitter<MouseEvent>();

  onClick(event: MouseEvent) {
    if (!this.disabled) {
      this.btnClick.emit(event);
    }
  }

  getSizeClass(): string {
    return this.size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  }

  getIconSizeClass(): string {
    return this.size === 'sm' ? 'text-[18px] w-[18px] h-[18px]' : 'text-[20px] w-[20px] h-[20px]';
  }

  getVariantClass(): string {
    switch (this.variant) {
      case 'primary':
        return 'bg-cyan-primary/15 text-cyan-light border border-cyan-focus/40 hover:bg-cyan-primary/25';
      case 'danger':
        return 'bg-rose-danger/15 text-rose-danger border border-rose-danger/30 hover:bg-rose-danger/25';
      case 'ghost':
        return 'bg-transparent text-text-secondary hover:text-text-pure hover:bg-slate-surface';
      case 'default':
      default:
        return 'bg-slate-surface text-text-secondary hover:text-text-pure border border-slate-border hover:border-slate-border-light';
    }
  }
}
