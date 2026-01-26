import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
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
    <h2 mat-dialog-title>Duplicate Resolver</h2>
    <mat-dialog-content class="content-container">
      
      <!-- LOADING STATE -->
      <div *ngIf="loading()" class="center-state">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Scanning member database for possible duplicates...</p>
      </div>

      <!-- NO DUPLICATES FOUND -->
      <div *ngIf="!loading() && duplicateGroups().length === 0" class="center-state">
        <mat-icon class="large-icon text-success">check_circle</mat-icon>
        <p>No duplicate members found!</p>
        <button mat-button mat-dialog-close>Close</button>
      </div>

      <!-- LIST VIEW -->
      <div *ngIf="!loading() && duplicateGroups().length > 0 && !selectedGroup()" class="list-view">
        <div class="subtitle-container">
           <p>Found <strong>{{ duplicateGroups().length }}</strong> potential duplicate groups.</p>
           <small>Grouped by Gender & Birthday</small>
        </div>
        
        <mat-list>
          <div *ngFor="let group of duplicateGroups(); let i = index">
            <mat-card class="group-card" (click)="reviewGroup(group)">
              <div class="row-align">
                  <div class="card-section info-section">
                    <span class="label">Born</span>
                    <span class="value">{{ toDate(group[0].birthday) | date:'mediumDate' }}</span>
                    <span class="badgewrap"><span class="gender-badge">{{ group[0].gender }}</span></span>
                  </div>

                  <div class="card-section names-section">
                    <span class="label">Similar Names ({{ group.length }})</span>
                    <div class="name-list">
                        <span *ngFor="let m of group" class="name-item">{{ m.name }}</span>
                    </div>
                  </div>
              </div>
              <mat-icon class="action-icon">arrow_forward_ios</mat-icon>
            </mat-card>
          </div>
        </mat-list>
      </div>

      <!-- REVIEW & MERGE VIEW -->
      <div *ngIf="selectedGroup() as group" class="review-view">
        <div class="review-header">
           <button mat-icon-button (click)="cancelReview()"><mat-icon>arrow_back</mat-icon></button>
           <h3>Compare & Merge</h3>
        </div>

        <p class="instruction">Select the <strong>Primary Member</strong> to keep. The other will be merged into it (Attendance & Progress transferred) and then deleted.</p>

        <mat-radio-group [(ngModel)]="primaryId" class="comparison-container">
          <div *ngFor="let member of group" class="member-column" [class.selected]="primaryId === member.id">
            <mat-radio-button [value]="member.id" color="primary">
              <strong>Select as Primary</strong>
            </mat-radio-button>

            <div class="details">
              <h4>{{ member.name }}</h4>
              <p><mat-icon>cake</mat-icon> {{ toDate(member.birthday) | date:'mediumDate' }}</p>
              <p><mat-icon>phone</mat-icon> {{ member.contactNumber || 'N/A' }}</p>
              <p><mat-icon>place</mat-icon> {{ member.address || 'N/A' }}</p>
              <p><mat-icon>fitness_center</mat-icon> Last: {{ (toDate(member.trainingExpiration) | date:'shortDate') || 'N/A' }}</p>
              <p><mat-icon>verified</mat-icon> {{ member.membershipStatus }}</p>
              <small class="id-text">ID: {{ member.id }}</small>
            </div>
          </div>
        </mat-radio-group>
      </div>

    </mat-dialog-content>

    <mat-dialog-actions align="end" *ngIf="selectedGroup()">
      <button mat-button (click)="cancelReview()">Cancel</button>
      <button mat-raised-button color="warn" [disabled]="!primaryId || merging()" (click)="executeMerge()">
        {{ merging() ? 'Merging...' : 'Merge & Delete Other' }}
      </button>
    </mat-dialog-actions>
  `,
    styles: [`
    .content-container { min-height: 400px; min-width: 600px; }
    .center-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; gap: 1rem; text-align: center; }
    .large-icon { font-size: 48px; height: 48px; width: 48px; }
    .text-success { color: #4caf50; }
    
    .list-view { padding: 1rem 0; overflow-y: auto; max-height: 60vh; }
    .subtitle-container { padding: 0 1rem 1rem; border-bottom: 1px solid #eee; margin-bottom: 1rem; }
    
    /* Card Styling */
    .group-card {
      padding: 1rem;
      margin-bottom: 0.75rem;
      cursor: pointer;
      border: 1px solid #e0e0e0;
      display: flex; /* Flexrow by default for MatCard? No, block. */
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
    .group-card:hover { background: #f5f5f5; border-color: #bdbdbd; }
    
    .row-align {
        display: flex;
        flex: 1;
        gap: 2rem;
        align-items: flex-start;
    }
    
    .card-section { display: flex; flex-direction: column; gap: 0.25rem; }
    .info-section { min-width: 120px; }
    .names-section { flex: 1; }
    
    .label { font-size: 0.75rem; text-transform: uppercase; color: #757575; font-weight: 600; }
    .value { font-size: 1rem; font-weight: 500; color: #212121; }
    
    .badgewrap { margin-top: 0.25rem; }
    .gender-badge { 
        background: #e3f2fd; color: #1565c0; 
        padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; 
    }
    
    .name-list { display: flex; flex-direction: column; gap: 0.25rem; }
    .name-item { font-size: 1.1rem; font-weight: 500; color: #333; }
    
    .action-icon { color: #bdbdbd; }

    /* Review View */
    .review-view { display: flex; flex-direction: column; height: 100%; }
    .review-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
    .instruction { background: #fff3e0; padding: 1rem; border-radius: 4px; color: #e65100; font-size: 0.9rem; }
    .comparison-container { display: flex; gap: 1rem; margin-top: 1rem; }
    .member-column { flex: 1; border: 2px solid #ddd; border-radius: 8px; padding: 1rem; transition: all 0.2s; }
    .member-column.selected { border-color: #3f51b5; background: #f0f4ff; }
    .details { margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
    .details p { margin: 0; display: flex; align-items: center; gap: 0.5rem; color: #555; }
    .details h4 { margin: 0; font-size: 1.2rem; color: #000; }
    .id-text { color: #999; font-size: 0.7rem; margin-top: 1rem; display: block; }
    
    @media (max-width: 600px) {
      .content-container { min-width: 100%; }
      .comparison-container { flex-direction: column; }
      .row-align { flex-direction: column; gap: 1rem; }
    }
  `]
})
export class MemberDuplicateResolver implements OnInit {
    private memberService = inject(MemberService);
    private snackBar = inject(MatSnackBar);

    loading = signal(true);
    duplicateGroups = signal<Member[][]>([]);
    selectedGroup = signal<Member[] | null>(null);

    // Merge selections
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
            // Loop matches (usually just 1)
            for (const secondary of others) {
                if (secondary.id) {
                    await this.memberService.mergeMembers(this.primaryId, secondary.id);
                }
            }

            this.snackBar.open('Merge successful', 'Close', { duration: 3000 });

            // Remove this group from the list
            const currentList = this.duplicateGroups();
            this.duplicateGroups.set(currentList.filter(g => g !== group));

            // Return to list
            this.cancelReview();

        } catch (err) {
            console.error(err);
            this.snackBar.open('Error merging members', 'Close');
        } finally {
            this.merging.set(false);
        }
    }
}
