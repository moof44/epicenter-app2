import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { EmployeeDocument } from '../../../../core/models/user.model';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-document-viewer-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="doc-viewer-modal">
      <div class="viewer-header">
        <div class="viewer-title">
          <mat-icon>{{ data.fileType === 'PDF' ? 'picture_as_pdf' : 'image' }}</mat-icon>
          <span>{{ data.name }}</span>
        </div>
        <div class="viewer-actions">
          <a mat-button [href]="data.downloadUrl" [download]="data.name" target="_blank">
            <mat-icon>download</mat-icon> Download
          </a>
          <button mat-icon-button (click)="dialogRef.close()">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>
      <div class="viewer-body">
        <img *ngIf="data.fileType === 'IMAGE'" [src]="data.downloadUrl" alt="Document Preview" class="doc-full-img">
        <iframe *ngIf="data.fileType === 'PDF'" [src]="sanitizedUrl" class="doc-pdf-frame"></iframe>
      </div>
    </div>
  `,
  styles: [`
    .doc-viewer-modal {
      display: flex;
      flex-direction: column;
      max-width: 90vw;
      max-height: 90vh;
      width: 800px;
    }
    .viewer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 18px;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    .viewer-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      color: #0f172a;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .viewer-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .viewer-body {
      padding: 16px;
      overflow: auto;
      display: flex;
      justify-content: center;
      align-items: center;
      background: #0f172a;
      min-height: 400px;
      max-height: 75vh;
    }
    .doc-full-img {
      max-width: 100%;
      max-height: 70vh;
      object-fit: contain;
      border-radius: 6px;
    }
    .doc-pdf-frame {
      width: 100%;
      height: 70vh;
      border: none;
      background: #ffffff;
      border-radius: 6px;
    }
  `]
})
export class DocumentViewerDialogComponent {
  dialogRef = inject(MatDialogRef<DocumentViewerDialogComponent>);
  data: EmployeeDocument = inject(MAT_DIALOG_DATA);
  sanitizer = inject(DomSanitizer);

  get sanitizedUrl(): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.data.downloadUrl);
  }
}
