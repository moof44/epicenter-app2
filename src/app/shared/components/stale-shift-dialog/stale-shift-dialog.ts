import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface StaleShiftDialogData {
  shiftDate: string;
}

@Component({
  selector: 'app-stale-shift-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './stale-shift-dialog.html',
  styleUrl: './stale-shift-dialog.css'
})
export class StaleShiftDialog {
  public dialogRef = inject(MatDialogRef<StaleShiftDialog>);
  public data = inject<StaleShiftDialogData>(MAT_DIALOG_DATA);

  close(): void {
    this.dialogRef.close();
  }
}
