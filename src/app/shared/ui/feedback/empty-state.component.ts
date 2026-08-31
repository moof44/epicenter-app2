import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, MatIconModule, ButtonComponent],
  template: `
    <div class="flex flex-col items-center justify-center p-8 text-center max-w-sm mx-auto">
      <div class="w-16 h-16 rounded-2xl bg-slate-surface border border-slate-border flex items-center justify-center text-text-muted mb-4 shadow-sm">
        <mat-icon class="text-[32px] w-[32px] h-[32px]">{{ icon }}</mat-icon>
      </div>
      <h3 class="text-base font-bold text-text-pure font-inter mb-1">
        {{ title }}
      </h3>
      <p class="text-xs sm:text-sm text-text-secondary font-inter mb-5">
        {{ description }}
      </p>
      <app-button *ngIf="actionLabel" variant="primary" size="sm" (btnClick)="onAction()">
        {{ actionLabel }}
      </app-button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmptyStateComponent {
  @Input() icon = 'inbox';
  @Input({ required: true }) title!: string;
  @Input({ required: true }) description!: string;
  @Input() actionLabel?: string;

  @Output() actionClick = new EventEmitter<void>();

  onAction() {
    this.actionClick.emit();
  }
}
