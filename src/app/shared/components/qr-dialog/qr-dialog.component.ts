import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export interface QRDialogData {
  loginUrl?: string;
  memberName?: string;
  member?: any;
  value?: string;
}

@Component({
  selector: 'app-qr-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="qr-dialog-container">
      <!-- Header -->
      <div class="dialog-header">
        <div class="header-left">
          <div class="header-icon-wrap">
            <mat-icon class="header-icon">qr_code_2</mat-icon>
          </div>
          <div>
            <h2 class="dialog-title">Portal Auto-Login Code</h2>
            <p class="dialog-subtitle">Scan with the member's mobile phone to log in instantly</p>
          </div>
        </div>
        <button type="button" class="close-btn" (click)="onClose()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Content -->
      <div class="dialog-body">
        <div class="qr-frame">
          <img 
            [src]="qrApiUrl" 
            (load)="onImageLoad()" 
            alt="Login QR Code" 
            class="qr-image"
            [class.hidden]="isLoading()"
          />
          
          @if (isLoading()) {
            <div class="loading-wrap">
              <mat-spinner diameter="44"></mat-spinner>
              <span class="loading-text">Generating QR code...</span>
            </div>
          }
        </div>

        <div class="info-card">
          <div class="member-row">
            <span class="m-label">Target Member</span>
            <span class="m-name">{{ memberDisplayName }}</span>
          </div>
          <div class="security-chip">
            <mat-icon class="sec-icon">lock_clock</mat-icon>
            <span>Secure dynamic token · Valid for this session</span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="dialog-footer">
        <button type="button" class="btn-close-action" (click)="onClose()">
          <span>Close Window</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .qr-dialog-container {
      background: var(--color-app);
      color: var(--color-text-pure);
      width: 100%;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      min-width: 300px;
      max-width: 440px;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 22px;
      border-bottom: 1px solid var(--color-border);
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.95) 100%);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-icon-wrap {
      width: 42px;
      height: 42px;
      border-radius: var(--radius-xl);
      background: linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(6, 182, 212, 0.08) 100%);
      border: 1.5px solid rgba(6, 182, 212, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-cyan-light);
      flex-shrink: 0;
    }

    .header-icon {
      font-size: 24px !important;
      width: 24px !important;
      height: 24px !important;
      color: var(--color-cyan-light);
    }

    .dialog-title {
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-black);
      color: var(--color-text-pure);
      font-family: var(--font-family-sans);
      margin: 0;
      line-height: 1.2;
    }

    .dialog-subtitle {
      font-size: var(--font-size-2xs);
      color: var(--color-text-secondary);
      font-family: var(--font-family-sans);
      margin: 2px 0 0 0;
    }

    .close-btn {
      background: none;
      border: none;
      color: var(--color-text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 4px;
      transition: color 150ms ease;
    }

    .close-btn:hover {
      color: var(--color-text-pure);
    }

    .dialog-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 18px;
    }

    .qr-frame {
      width: 220px;
      height: 220px;
      background-color: #ffffff;
      border-radius: var(--radius-2xl);
      padding: 14px;
      box-shadow: 0 0 30px rgba(6, 182, 212, 0.25);
      border: 2px solid var(--color-cyan-light);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .qr-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .hidden {
      display: none;
    }

    .loading-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .loading-text {
      font-size: 11px;
      color: #090d16;
      font-weight: var(--font-weight-bold);
    }

    .info-card {
      width: 100%;
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      box-sizing: border-box;
    }

    .member-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .m-label {
      font-size: 10px;
      font-weight: var(--font-weight-bold);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--color-text-secondary);
    }

    .m-name {
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-black);
      color: var(--color-cyan-light);
    }

    .security-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: var(--color-gold-light);
      background-color: var(--color-gold-dim);
      border: 1px solid rgba(245, 158, 11, 0.35);
      padding: 4px 10px;
      border-radius: var(--radius-full);
    }

    .sec-icon {
      font-size: 14px !important;
      width: 14px !important;
      height: 14px !important;
    }

    .dialog-footer {
      padding: 14px 22px;
      border-top: 1px solid var(--color-border);
      background-color: var(--color-surface);
      display: flex;
      justify-content: flex-end;
    }

    .btn-close-action {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: #090d16;
      font-weight: var(--font-weight-black);
      font-size: var(--font-size-xs);
      font-family: var(--font-family-sans);
      border: none;
      border-radius: var(--radius-full);
      padding: 10px 22px;
      cursor: pointer;
      box-shadow: 0 0 20px rgba(245, 158, 11, 0.4);
      transition: all 180ms ease;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .btn-close-action:hover {
      transform: translateY(-1px);
      box-shadow: 0 0 30px rgba(245, 158, 11, 0.6);
      background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
    }
  `]
})
export class QRDialog {
  dialogRef = inject(MatDialogRef<QRDialog>);
  data = inject<QRDialogData>(MAT_DIALOG_DATA);

  isLoading = signal<boolean>(true);

  get memberDisplayName(): string {
    return this.data?.memberName || this.data?.member?.name || 'Member';
  }

  get qrApiUrl(): string {
    const rawVal = this.data?.loginUrl || this.data?.value || (this.data?.member?.id ? `https://members.epicentergym.com/login?id=${this.data.member.id}` : 'https://members.epicentergym.com');
    const encodedUrl = encodeURIComponent(rawVal);
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodedUrl}`;
  }

  onImageLoad() {
    this.isLoading.set(false);
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
