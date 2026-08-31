import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './page-container.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageContainerComponent {
  @Input() maxWidth: 'standard' | 'wide' | 'narrow' | 'full' = 'standard';
  @Input() noPadding = false;

  getMaxWidthClass(): string {
    switch (this.maxWidth) {
      case 'narrow': return 'max-w-narrow';
      case 'wide': return 'max-w-wide';
      case 'full': return 'max-w-full';
      case 'standard':
      default: return 'max-w-standard';
    }
  }
}
