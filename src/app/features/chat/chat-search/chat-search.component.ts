import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Firestore, collection, query, orderBy, where, getDocs, limit, Timestamp } from '@angular/fire/firestore';
import { ChatMessage } from '../../../core/models/chat.model';

@Component({
  selector: 'app-chat-search',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  template: `
    <div class="search-page-container">
      <div class="search-header">
        <button mat-icon-button (click)="goBack()" title="Back to App">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>Vigilance Chat History & Search</h1>
      </div>

      <mat-card class="filter-card">
        <mat-card-content class="filter-grid">
          <!-- Keyword Filter -->
          <mat-form-field appearance="outline">
            <mat-label>Keyword Search</mat-label>
            <input matInput placeholder="Search message text..." [(ngModel)]="filters.keyword" (ngModelChange)="applyFilters()">
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>

          <!-- Sender Name Filter -->
          <mat-form-field appearance="outline">
            <mat-label>Filter by Sender</mat-label>
            <input matInput placeholder="Username or Bot Name..." [(ngModel)]="filters.sender" (ngModelChange)="applyFilters()">
            <mat-icon matSuffix>person</mat-icon>
          </mat-form-field>

          <!-- Type Filter -->
          <mat-form-field appearance="outline">
            <mat-label>Message Type</mat-label>
            <mat-select [(ngModel)]="filters.type" (selectionChange)="applyFilters()">
              <mat-option value="all">All Messages & Alerts</mat-option>
              <mat-option value="user">User Chats Only</mat-option>
              <mat-option value="system">System Security Alerts</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Date Filter (Start) -->
          <mat-form-field appearance="outline">
            <mat-label>Start Date</mat-label>
            <input matInput [matDatepicker]="startPicker" [(ngModel)]="filters.startDate" (dateChange)="onDateChange()">
            <mat-datepicker-toggle matIconSuffix [for]="startPicker"></mat-datepicker-toggle>
            <mat-datepicker #startPicker></mat-datepicker>
          </mat-form-field>

          <!-- Date Filter (End) -->
          <mat-form-field appearance="outline">
            <mat-label>End Date</mat-label>
            <input matInput [matDatepicker]="endPicker" [(ngModel)]="filters.endDate" (dateChange)="onDateChange()">
            <mat-datepicker-toggle matIconSuffix [for]="endPicker"></mat-datepicker-toggle>
            <mat-datepicker #endPicker></mat-datepicker>
          </mat-form-field>
        </mat-card-content>
        <mat-card-actions align="end">
          <button mat-stroked-button (click)="resetFilters()" class="action-btn">Reset</button>
          <button mat-raised-button color="primary" (click)="fetchFromFirestore()" class="action-btn" [disabled]="loading()">
            <mat-icon>sync</mat-icon> Query Database
          </button>
        </mat-card-actions>
      </mat-card>

      <!-- Search Results -->
      <div class="results-container">
        <div class="status-indicator" *ngIf="loading()">
          <mat-icon class="spin">sync</mat-icon>
          <span>Querying database messages...</span>
        </div>

        <div class="status-indicator" *ngIf="!loading() && filteredMessages().length === 0">
          <mat-icon>search_off</mat-icon>
          <span>No matching historical messages found. Try adjusting filters or clicking "Query Database".</span>
        </div>

        <div class="results-list" *ngIf="!loading() && filteredMessages().length > 0">
          <div *ngFor="let msg of filteredMessages()" 
               [ngClass]="{'result-item': true, 'system-result': msg.type === 'system', 'user-result': msg.type === 'user'}">
            
            <!-- System Alert Formatting -->
            <div *ngIf="msg.type === 'system'" class="system-alert-box">
              <mat-icon class="alert-icon">security</mat-icon>
              <div class="alert-details">
                <span class="alert-content">{{msg.content}}</span>
                <span class="alert-meta">Logged at {{formatDateTime(msg.timestamp)}}</span>
              </div>
            </div>

            <!-- User Chat Formatting -->
            <div *ngIf="msg.type === 'user'" class="user-chat-box">
              <img class="avatar" [src]="msg.senderAvatar || 'assets/default-avatar.png'" alt="avatar">
              <div class="chat-details">
                <div class="chat-header-row">
                  <span class="chat-sender">{{msg.senderName}}</span>
                  <span class="chat-time">{{formatDateTime(msg.timestamp)}}</span>
                </div>
                <p class="chat-text">{{msg.content}}</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .search-page-container {
      padding: 24px;
      max-width: 1000px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
      height: calc(100vh - 80px);
      box-sizing: border-box;
    }
    .search-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 8px;
    }
    .search-header h1 {
      margin: 0;
      font-size: 1.8rem;
      font-weight: 500;
      color: #202124;
    }
    .filter-card {
      padding: 8px;
    }
    .filter-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-top: 8px;
    }
    .action-btn {
      margin-left: 8px;
    }
    .results-container {
      flex: 1;
      overflow-y: auto;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background-color: #f8f9fa;
      padding: 16px;
    }
    .status-indicator {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: #5f6368;
      gap: 12px;
    }
    .status-indicator mat-icon {
      font-size: 3rem;
      width: 48px;
      height: 48px;
    }
    .spin {
      animation: spin 1.5s linear infinite;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
    .results-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .result-item {
      width: 100%;
    }
    
    /* System Alert Layout */
    .system-alert-box {
      display: flex;
      gap: 16px;
      padding: 12px 16px;
      background-color: #f3e5f5;
      border-left: 5px solid #8e24aa;
      border-radius: 6px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      align-items: center;
    }
    .alert-icon {
      color: #8e24aa;
      font-size: 1.8rem;
      width: 28px;
      height: 28px;
      flex-shrink: 0;
    }
    .alert-details {
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .alert-content {
      font-size: 0.95rem;
      color: #4a148c;
      font-weight: 500;
    }
    .alert-meta {
      font-size: 0.75rem;
      color: #7b1fa2;
      margin-top: 4px;
    }

    /* User Chat Layout */
    .user-chat-box {
      display: flex;
      gap: 16px;
      padding: 12px 16px;
      background-color: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      align-items: flex-start;
    }
    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
      background-color: #e0e0e0;
      flex-shrink: 0;
    }
    .chat-details {
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .chat-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }
    .chat-sender {
      font-weight: 500;
      font-size: 0.95rem;
      color: #202124;
    }
    .chat-time {
      font-size: 0.75rem;
      color: #70757a;
    }
    .chat-text {
      margin: 0;
      font-size: 0.9rem;
      color: #3c4043;
      line-height: 1.5;
      word-break: break-word;
    }

    @media (max-width: 600px) {
      .search-page-container {
        padding: 12px;
      }
      .filter-grid {
        grid-template-columns: 1fr;
      }
      .search-header h1 {
        font-size: 1.4rem;
      }
    }
  `]
})
export class ChatSearchComponent implements OnInit {
  private firestore = inject(Firestore);
  private router = inject(Router);

  rawMessages = signal<ChatMessage[]>([]);
  filteredMessages = signal<ChatMessage[]>([]);
  loading = signal(false);

  filters = {
    keyword: '',
    sender: '',
    type: 'all',
    startDate: this.getDefaultStartDate(),
    endDate: new Date()
  };

  ngOnInit() {
    this.fetchFromFirestore();
  }

  getDefaultStartDate(): Date {
    const d = new Date();
    d.setDate(d.getDate() - 7); // Default to last 7 days
    return d;
  }

  async fetchFromFirestore() {
    this.loading.set(true);
    try {
      const messagesCol = collection(this.firestore, 'chats/global/messages');
      
      // Strict date constraints
      const startOfDay = new Date(this.filters.startDate);
      startOfDay.setHours(0,0,0,0);
      const endOfDay = new Date(this.filters.endDate);
      endOfDay.setHours(23,59,59,999);

      const q = query(
        messagesCol,
        where('timestamp', '>=', Timestamp.fromDate(startOfDay)),
        where('timestamp', '<=', Timestamp.fromDate(endOfDay)),
        orderBy('timestamp', 'desc'),
        limit(200) // Safety boundary limit to control costs
      );

      const snapshot = await getDocs(q);
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];

      this.rawMessages.set(msgs);
      this.applyFilters();
    } catch (err) {
      console.error('Failed to query chat logs:', err);
    } finally {
      this.loading.set(false);
    }
  }

  applyFilters() {
    let filtered = [...this.rawMessages()];

    // Keyword filtering
    if (this.filters.keyword.trim()) {
      const kw = this.filters.keyword.toLowerCase();
      filtered = filtered.filter(m => m.content.toLowerCase().includes(kw));
    }

    // Sender filtering
    if (this.filters.sender.trim()) {
      const snd = this.filters.sender.toLowerCase();
      filtered = filtered.filter(m => m.senderName.toLowerCase().includes(snd));
    }

    // Type filtering
    if (this.filters.type !== 'all') {
      filtered = filtered.filter(m => m.type === this.filters.type);
    }

    this.filteredMessages.set(filtered);
  }

  resetFilters() {
    this.filters = {
      keyword: '',
      sender: '',
      type: 'all',
      startDate: this.getDefaultStartDate(),
      endDate: new Date()
    };
    this.fetchFromFirestore();
  }

  onDateChange() {
    // Force new database query when dates change
    this.fetchFromFirestore();
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  formatDateTime(timestamp: any): string {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  }
}
