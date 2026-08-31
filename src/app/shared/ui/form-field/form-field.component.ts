import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col gap-1.5 w-full">
      <label *ngIf="label" [for]="forId" class="block text-xs sm:text-sm font-semibold text-text-body font-inter">
        {{ label }}
        <span *ngIf="required" class="text-rose-danger">*</span>
      </label>
      <ng-content></ng-content>
      <p *ngIf="error" class="text-xs text-rose-danger font-medium font-inter mt-0.5">
        {{ error }}
      </p>
      <p *ngIf="hint && !error" class="text-xs text-text-muted font-inter mt-0.5">
        {{ hint }}
      </p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormFieldComponent {
  @Input() label?: string;
  @Input() forId?: string;
  @Input() required = false;
  @Input() error?: string | null;
  @Input() hint?: string;
}
