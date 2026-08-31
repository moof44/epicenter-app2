import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';
import { MemberService } from '../../../../core/services/member.service';
import { Member } from '../../../../core/models/member.model';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
    selector: 'app-member-duplicate-resolver',
    standalone: true,
    imports: [
        CommonModule, MatDialogModule, MatButtonModule, MatIconModule,
        MatListModule, MatProgressSpinnerModule, MatCardModule, MatChipsModule,
        MatRadioModule, FormsModule
    ],
    template: `
    <div class="duplicate-resolver-container">
      <div class="dialog-header">
        <div class="header-left">
          <mat-icon class="header-icon">merge_type</mat-icon>
          <div>
            <h2 class="dialog-title">Duplicate Member Resolver</h2>
            <p class="dialog-subtitle">Scan and merge duplicate profiles to maintain clean attendance & progress history</p>
          </div>
        </div>
        <button mat-icon-button mat-dialog-close class="close-btn">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="dialog-body">
        
        <!-- LOADING STATE -->
        <div *ngIf="loading()" class="center-state">
          <mat-spinner diameter="42"></mat-spinner>
          <p class="loading-text">Scanning member database for possible duplicate accounts...</p>
        </div>

        <!-- NO DUPLICATES FOUND -->
        <div *ngIf="!loading() && duplicateGroups().length === 0" class="center-state">
          <div class="clean-icon-wrap">
            <mat-icon class="large-icon text-success">verified</mat-icon>
          </div>
          <h3 class="clean-title">Database Clean!</h3>
          <p class="clean-sub">No duplicate member accounts were detected.</p>
          <button mat-flat-button class="btn-close-clean" mat-dialog-close>Close Resolver</button>
        </div>

        <!-- LIST VIEW -->
        <div *ngIf="!loading() && duplicateGroups().length > 0 && !selectedGroup()" class="list-view">
          <div class="subtitle-container">
             <span class="count-badge">{{ duplicateGroups().length }} Potential Duplicate Groups Found</span>
             <p class="match-info">Grouped by matching Gender and Birthday</p>
          </div>
          
          <div class="groups-list">
            <div *ngFor="let group of duplicateGroups()" class="group-card" (click)="reviewGroup(group)">
              <div class="row-align">
                  <div class="card-section info-section">
                    <span class="label">Birthday</span>
                    <span class="value">{{ toDate(group[0].birthday) | date:'mediumDate' }}</span>
                    <span class="gender-pill">{{ group[0].gender }}</span>
                  </div>

                  <div class="card-section names-section">
                    <span class="label">Matched Profiles ({{ group.length }})</span>
                    <div class="name-list">
                        <span *ngFor="let m of group" class="name-item">
                          <mat-icon class="item-icon">person</mat-icon>
                          <span>{{ m.name }}</span>
                          <span class="item-contact font-mono" *ngIf="m.contactNumber">({{ m.contactNumber }})</span>
                        </span>
                    </div>
                  </div>
              </div>
              <mat-icon class="action-arrow">arrow_forward</mat-icon>
            </div>
          </div>
        </div>

        <!-- REVIEW & MERGE VIEW -->
        <div *ngIf="selectedGroup() as group" class="review-view">
          <div class="review-header">
             <button type="button" class="back-btn" (click)="cancelReview()">
               <mat-icon>arrow_back</mat-icon>
             </button>
             <div>
               <h3 class="review-title">Compare & Merge Accounts</h3>
               <p class="review-subtitle">Select the primary profile to retain.</p>
             </div>
          </div>

          <div class="instruction-box">
            <mat-icon class="inst-icon">info</mat-icon>
            <span>The profile you select as <strong>Primary</strong> will be preserved. The other profile's attendance logs, transactions, and scan reports will be merged into it before deletion.</span>
          </div>

          <mat-radio-group [(ngModel)]="primaryId" class="comparison-container">
            <div *ngFor="let member of group" class="member-column" [class.selected]="primaryId === member.id" (click)="primaryId = member.id || ''">
              <mat-radio-button [value]="member.id" color="primary">
                <span class="radio-label">Select as Primary Profile</span>
              </mat-radio-button>

              <div class="details">
                <h4 class="member-head-name">{{ member.name }}</h4>
                <p><mat-icon class="detail-icon">cake</mat-icon> {{ toDate(member.birthday) | date:'mediumDate' }}</p>
                <p><mat-icon class="detail-icon">phone</mat-icon> {{ member.contactNumber || 'No phone' }}</p>
                <p><mat-icon class="detail-icon">place</mat-icon> {{ member.address || 'No address' }}</p>
                <p><mat-icon class="detail-icon">verified</mat-icon> Status: <strong>{{ member.membershipStatus }}</strong></p>
                <span class="id-tag font-mono">ID: {{ member.id }}</span>
              </div>
            </div>
          </mat-radio-group>
        </div>

      </div>

      <div class="dialog-footer" *ngIf="selectedGroup()">
        <button type="button" class="btn-cancel" (click)="cancelReview()">Back to List</button>
        <button type="button" class="btn-merge-action" [disabled]="!primaryId || merging()" (click)="executeMerge()">
          <mat-icon *ngIf="!merging()">merge_type</mat-icon>
          <mat-spinner diameter="18" *ngIf="merging()"></mat-spinner>
          <span>{{ merging() ? 'Merging Accounts...' : 'Merge & Retain Primary' }}</span>
        </button>
      </div>
    </div>
  `,
    styles: [`
    .duplicate-resolver-container {
      background: var(--color-app);
      color: var(--color-text-pure);
      border-radius: var(--radius-2xl);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      max-height: 85vh;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 24px;
      border-bottom: 1px solid var(--color-border);
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.95) 100%);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-icon {
      font-size: 26px !important;
      width: 26px !important;
      height: 26px !important;
      color: var(--color-gold-light);
    }

    .dialog-title {
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-extrabold);
      color: var(--color-text-pure);
      margin: 0;
    }

    .dialog-subtitle {
      font-size: var(--font-size-2xs);
      color: var(--color-text-secondary);
      margin: 2px 0 0 0;
    }

    .close-btn {
      color: var(--color-text-secondary);
    }

    .close-btn:hover {
      color: var(--color-text-pure);
    }

    .dialog-body {
      padding: 20px 24px;
      overflow-y: auto;
      min-height: 360px;
    }

    .center-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 300px;
      gap: 14px;
      text-align: center;
    }

    .loading-text {
      color: var(--color-text-secondary);
      font-size: var(--font-size-xs);
    }

    .clean-icon-wrap {
      width: 64px;
      height: 64px;
      border-radius: var(--radius-full);
      background-color: var(--color-success-dim);
      border: 1.5px solid rgba(52, 211, 153, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-mint-success);
    }

    .large-icon {
      font-size: 36px !important;
      width: 36px !important;
      height: 36px !important;
    }

    .clean-title {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-bold);
      color: var(--color-text-pure);
      margin: 0;
    }

    .clean-sub {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      margin: 0;
    }

    .btn-close-clean {
      background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%) !important;
      color: #090d16 !important;
      font-weight: var(--font-weight-bold) !important;
      border-radius: var(--radius-full) !important;
      margin-top: 10px;
    }

    /* List View */
    .subtitle-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--color-border);
      margin-bottom: 14px;
      flex-wrap: wrap;
      gap: 8px;
    }

    .count-badge {
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
      color: var(--color-gold-light);
      background-color: var(--color-gold-dim);
      border: 1px solid rgba(245, 158, 11, 0.3);
      padding: 4px 12px;
      border-radius: var(--radius-full);
    }

    .match-info {
      font-size: 11px;
      color: var(--color-text-secondary);
      margin: 0;
    }

    .groups-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .group-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      transition: all 180ms ease;
    }

    .group-card:hover {
      background-color: rgba(6, 182, 212, 0.08);
      border-color: var(--color-cyan-light);
      transform: translateY(-1px);
    }

    .row-align {
      display: flex;
      gap: 24px;
      flex: 1;
      align-items: flex-start;
    }

    .card-section {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .info-section {
      min-width: 130px;
    }

    .names-section {
      flex: 1;
    }

    .label {
      font-size: 10px;
      font-weight: var(--font-weight-bold);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--color-text-muted);
    }

    .value {
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
      color: var(--color-text-pure);
    }

    .gender-pill {
      display: inline-block;
      width: fit-content;
      background-color: var(--color-cyan-dim);
      border: 1px solid rgba(6, 182, 212, 0.3);
      color: var(--color-cyan-light);
      font-size: 10px;
      font-weight: var(--font-weight-bold);
      padding: 2px 8px;
      border-radius: var(--radius-full);
      margin-top: 4px;
    }

    .name-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .name-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
      color: var(--color-text-body);
    }

    .item-icon {
      font-size: 14px !important;
      width: 14px !important;
      height: 14px !important;
      color: var(--color-cyan-light);
    }

    .item-contact {
      font-size: 11px;
      color: var(--color-text-secondary);
      font-weight: normal;
    }

    .action-arrow {
      color: var(--color-text-secondary);
      font-size: 20px !important;
    }

    /* Review View */
    .review-view {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .review-header {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .back-btn {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-lg);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      color: var(--color-text-pure);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .review-title {
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-bold);
      color: var(--color-text-pure);
      margin: 0;
    }

    .review-subtitle {
      font-size: var(--font-size-2xs);
      color: var(--color-text-secondary);
      margin: 2px 0 0 0;
    }

    .instruction-box {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      background-color: var(--color-gold-dim);
      border: 1px solid rgba(245, 158, 11, 0.35);
      border-radius: var(--radius-xl);
      padding: 12px 16px;
      color: var(--color-gold-light);
      font-size: var(--font-size-xs);
      line-height: 1.4;
    }

    .inst-icon {
      font-size: 18px !important;
      width: 18px !important;
      height: 18px !important;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .comparison-container {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
      margin-top: 6px;
    }

    .member-column {
      background-color: var(--color-surface);
      border: 2px solid var(--color-border);
      border-radius: var(--radius-xl);
      padding: 18px;
      cursor: pointer;
      transition: all 180ms ease;
    }

    .member-column:hover {
      border-color: rgba(6, 182, 212, 0.5);
    }

    .member-column.selected {
      border-color: var(--color-cyan-light);
      background: linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%);
      box-shadow: 0 0 20px rgba(6, 182, 212, 0.25);
    }

    .radio-label {
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
      color: var(--color-text-pure);
    }

    .details {
      margin-top: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .member-head-name {
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-black);
      color: var(--color-text-pure);
      margin: 0;
    }

    .details p {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: var(--font-size-xs);
      color: var(--color-text-body);
    }

    .detail-icon {
      font-size: 16px !important;
      width: 16px !important;
      height: 16px !important;
      color: var(--color-text-secondary);
    }

    .id-tag {
      font-size: 10px;
      color: var(--color-text-muted);
      margin-top: 6px;
    }

    /* Dialog Footer */
    .dialog-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid var(--color-border);
      background-color: var(--color-surface);
    }

    .btn-cancel {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      color: var(--color-text-secondary);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
      padding: 10px 20px;
      border-radius: var(--radius-full);
      cursor: pointer;
    }

    .btn-cancel:hover {
      color: var(--color-text-pure);
    }

    .btn-merge-action {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: #090d16;
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-black);
      border: none;
      border-radius: var(--radius-full);
      padding: 10px 22px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      box-shadow: 0 0 20px rgba(245, 158, 11, 0.4);
      transition: all 180ms ease;
    }

    .btn-merge-action:hover:not([disabled]) {
      transform: translateY(-1px);
      box-shadow: 0 0 30px rgba(245, 158, 11, 0.6);
    }

    .btn-merge-action[disabled] {
      opacity: 0.5;
      cursor: not-allowed;
      box-shadow: none;
    }

    @media (max-width: 640px) {
      .comparison-container {
        grid-template-columns: 1fr;
      }
      .row-align {
        flex-direction: column;
        gap: 10px;
      }
    }
  `]
})
export class MemberDuplicateResolver implements OnInit {
    private memberService = inject(MemberService);
    private snackBar = inject(MatSnackBar);

    loading = signal(true);
    duplicateGroups = signal<Member[][]>([]);
    selectedGroup = signal<Member[] | null>(null);

    primaryId: string | null = null;
    merging = signal(false);

    async ngOnInit() {
        this.scan();
    }

    toDate(val: any): Date | null {
        if (!val) return null;
        return val instanceof Date ? val : (val.toDate ? val.toDate() : new Date(val));
    }

    async scan() {
        this.loading.set(true);
        try {
            const groups = await this.memberService.findPotentialDuplicates();
            this.duplicateGroups.set(groups);
        } catch (err) {
            console.error(err);
            this.snackBar.open('Error scanning for duplicates', 'Close');
        } finally {
            this.loading.set(false);
        }
    }

    reviewGroup(group: Member[]) {
        this.primaryId = null;
        this.selectedGroup.set(group);
    }

    cancelReview() {
        this.selectedGroup.set(null);
        this.primaryId = null;
    }

    async executeMerge() {
        const group = this.selectedGroup();
        if (!group || !this.primaryId) return;

        const others = group.filter(m => m.id !== this.primaryId);

        if (!confirm(`Merge ${others.length} member(s) into the Primary one? This cannot be undone.`)) return;

        this.merging.set(true);
        try {
            for (const secondary of others) {
                if (secondary.id) {
                    await this.memberService.mergeMembers(this.primaryId, secondary.id);
                }
            }

            this.snackBar.open('Merge successful', 'Close', { duration: 3000 });
            const currentList = this.duplicateGroups();
            this.duplicateGroups.set(currentList.filter(g => g !== group));
            this.cancelReview();
        } catch (err) {
            console.error(err);
            this.snackBar.open('Error merging members', 'Close');
        } finally {
            this.merging.set(false);
        }
    }
}
