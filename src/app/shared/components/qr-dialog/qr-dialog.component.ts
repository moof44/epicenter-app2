import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export interface QRDialogData {
  loginUrl: string;
  memberName: string;
}

@Component({
  selector: 'app-qr-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <h2 mat-dialog-title>
      <mat-icon color="primary">qr_code_2</mat-icon> Portal Auto-Login Code
    </h2>
    <mat-dialog-content class="dialog-content">
      <p class="description">Scan this code with the member's phone to log them in automatically:</p>
      
      <div class="qr-container">
        <!-- Render QR code from public API -->
        <img 
          [src]="qrApiUrl" 
          (load)="onImageLoad()" 
          alt="Login QR Code" 
          class="qr-image"
          [class.hidden]="isLoading()"
        />
        
        @if (isLoading()) {
          <mat-spinner diameter="60"></mat-spinner>
        }
      </div>

      <div class="info-box">
        <strong>Member:</strong> {{ data.memberName }}<br/>
        <span class="expiry-text">This QR code is secure and will expire in 5 minutes.</span>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-raised-button color="primary" (click)="onClose()">Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2 { display: flex; align-items: center; gap: 8px; }
    .dialog-content { display: flex; flex-direction: column; align-items: center; gap: 16px; min-width: 280px; }
    .description { text-align: center; color: #666; font-size: 0.9em; margin: 0; }
    .qr-container { width: 200px; height: 200px; display: flex; align-items: center; justify-content: center; border: 1px solid #eee; border-radius: 8px; padding: 8px; background-color: #fff; }
    .qr-image { width: 100%; height: 100%; object-fit: contain; }
    .hidden { display: none; }
    .info-box { font-size: 0.9em; background-color: #f5f5f5; padding: 12px; border-radius: 8px; width: 100%; box-sizing: border-box; text-align: center; line-height: 1.4; }
    .expiry-text { color: #888; font-size: 0.85em; display: block; margin-top: 4px; }
  `]
})
export class QRDialog {
  dialogRef = inject(MatDialogRef<QRDialog>);
  data = inject<QRDialogData>(MAT_DIALOG_DATA);

  isLoading = signal<boolean>(true);

  get qrApiUrl(): string {
    const encodedUrl = encodeURIComponent(this.data.loginUrl);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedUrl}`;
  }

  onImageLoad() {
    this.isLoading.set(false);
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
