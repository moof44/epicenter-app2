import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Member } from '../../../../core/models/member.model';

export interface LockerRestrictionDialogData {
  member: Member;
}

export interface LockerRestrictionResult { action: 'check-in-no-locker' | 'cancel' }

@Component({
  selector: 'app-locker-restriction-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './locker-restriction-dialog.html',
  styleUrl: './locker-restriction-dialog.css'
})
export class LockerRestrictionDialog {
  dialogRef = inject(MatDialogRef<LockerRestrictionDialog>);
  data = inject<LockerRestrictionDialogData>(MAT_DIALOG_DATA);

  onAction(action: 'check-in-no-locker' | 'cancel') {
    this.dialogRef.close({ action });
  }
}
