import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="relative flex items-center w-full">
      <mat-icon class="absolute left-3.5 text-text-muted text-[18px] w-[18px] h-[18px] pointer-events-none">search</mat-icon>
      <input
        type="text"
        [placeholder]="placeholder"
        [ngModel]="value"
        (ngModelChange)="onValueChange($event)"
        class="w-full h-control-md pl-10 pr-10 bg-slate-input border border-slate-border-light rounded-xl text-sm font-medium text-text-pure placeholder-text-muted focus:outline-none focus:border-cyan-focus focus-visible:ring-2 focus-visible:ring-cyan-focus focus-visible:ring-offset-2 focus-visible:ring-offset-slate-canvas transition-colors font-inter"
      />
      <button
        *ngIf="value"
        type="button"
        (click)="onClear()"
        aria-label="Clear search"
        class="absolute right-2.5 w-6 h-6 rounded-md flex items-center justify-center text-text-muted hover:text-text-pure hover:bg-slate-surface transition-colors focus:outline-none"
      >
        <mat-icon class="text-[14px] w-[14px] h-[14px]">close</mat-icon>
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchInputComponent {
  @Input() placeholder = 'Search...';
  @Input() value = '';

  @Output() valueChange = new EventEmitter<string>();
  @Output() clear = new EventEmitter<void>();

  onValueChange(val: string) {
    this.value = val;
    this.valueChange.emit(val);
  }

  onClear() {
    this.value = '';
    this.valueChange.emit('');
    this.clear.emit();
  }
}
