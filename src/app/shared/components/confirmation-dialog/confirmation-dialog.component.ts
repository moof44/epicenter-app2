import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.title || 'Confirm' }}</h2>
    <mat-dialog-content>
      <p>{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">{{ data.cancelText || 'No' }}</button>
      <button mat-raised-button color="primary" [mat-dialog-close]="true">{{ data.confirmText || 'Yes' }}</button>
    </mat-dialog-actions>
  `
})
export class ConfirmationDialog {
  dialogRef = inject(MatDialogRef<ConfirmationDialog>);
  data = inject<{ title?: string; message: string; confirmText?: string; cancelText?: string }>(MAT_DIALOG_DATA);
}
