import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Member } from '../../../core/models/member.model';

export interface RemarksDialogResult {
  action: 'clear' | 'close';
}

@Component({
  selector: 'app-remarks-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>
      <mat-icon color="warn">priority_high</mat-icon> Member Remarks
    </h2>
    <mat-dialog-content>
      <p class="remark-text">{{ data.member.remarks }}</p>
      <div class="helper-text">Action required?</div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onClose()">Close (Keep Remark)</button>
      <button mat-raised-button color="primary" (click)="onClear()">Clear Remark</button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2 { display: flex; align-items: center; gap: 8px; color: #d32f2f; }
    .remark-text { font-size: 1.2em; font-weight: 500; margin: 16px 0; white-space: pre-wrap; }
    .helper-text { color: #666; font-size: 0.9em; margin-bottom: 8px; }
  `]
})
export class RemarksDialog {
  dialogRef = inject(MatDialogRef<RemarksDialog>);
  data = inject<{ member: Member }>(MAT_DIALOG_DATA);

  onClose(): void {
    this.dialogRef.close({ action: 'close' });
  }

  onClear(): void {
    this.dialogRef.close({ action: 'clear' });
  }
}
