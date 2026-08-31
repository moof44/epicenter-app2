import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-bottom-sheet',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './bottom-sheet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BottomSheetComponent {
  @Input() isOpen = false;
  @Input() title?: string;

  @Output() closed = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.isOpen) {
      this.onClose();
    }
  }

  onClose() {
    this.closed.emit();
  }
}
