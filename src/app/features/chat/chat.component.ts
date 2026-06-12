import { Component, inject, signal, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { ChatService } from '../../core/services/chat.service';
import { ChatMessage } from '../../core/models/chat.model';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule
  ],
  template: `
    <div class="chat-container">
      <!-- Chat Header -->
      <div class="chat-header">
        <div class="title-container">
          <mat-icon color="primary">chat</mat-icon>
          <span>Global Vigilance Chat</span>
        </div>
        <div class="header-actions">
          <button mat-icon-button (click)="goToSearch()" title="Search chat history">
            <mat-icon>search</mat-icon>
          </button>
          <button mat-icon-button (click)="closeChat()" title="Close chat panel">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>

      <!-- Chat Messages (Scrollable) -->
      <div class="chat-messages" #scrollContainer (scroll)="onScroll()">
        <div class="loading-spinner" *ngIf="isLoadingMore()">
          <span>Loading history...</span>
        </div>

        <div *ngFor="let msg of messages(); trackBy: trackByFn" 
             [ngClass]="{'message-row': true, 'system-message': msg.type === 'system', 'user-message': msg.type === 'user', 'own-message': isOwnMessage(msg)}">
          
          <!-- System Message Style -->
          <ng-container *ngIf="msg.type === 'system'">
            <div class="system-message-card">
              <mat-icon class="system-icon">security</mat-icon>
              <div class="system-content">
                <span class="system-text">{{msg.content}}</span>
                <span class="system-time">{{formatTime(msg.timestamp)}}</span>
              </div>
            </div>
          </ng-container>

          <!-- User Message Style -->
          <ng-container *ngIf="msg.type === 'user'">
            <img class="avatar" [src]="msg.senderAvatar || 'assets/default-avatar.png'" alt="avatar" 
                 *ngIf="!isOwnMessage(msg)">
            <div class="bubble-container">
              <span class="sender-name" *ngIf="!isOwnMessage(msg)">{{msg.senderName}}</span>
              <div class="bubble">
                <p class="bubble-text">{{msg.content}}</p>
              </div>
              <span class="message-time">{{formatTime(msg.timestamp)}}</span>
            </div>
          </ng-container>
        </div>
      </div>

      <!-- Chat Footer -->
      <div class="chat-footer">
        <mat-form-field appearance="outline" class="message-field">
          <input matInput placeholder="Type a message..." [(ngModel)]="messageText" (keydown.enter)="sendMessage()">
        </mat-form-field>
        <button mat-mini-fab color="primary" [disabled]="!messageText.trim()" (click)="sendMessage()" class="send-btn">
          <mat-icon>send</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      box-sizing: border-box;
      border-left: 1px solid #e0e0e0;
      background-color: #ffffff;
    }
    .chat-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .chat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      border-bottom: 1px solid #e0e0e0;
      background-color: #f8f9fa;
    }
    .title-container {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
      font-size: 1.1rem;
    }
    .header-actions {
      display: flex;
      gap: 4px;
    }
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column-reverse; /* Stream from bottom to top */
      gap: 12px;
    }
    .loading-spinner {
      text-align: center;
      font-size: 0.85rem;
      color: #757575;
      padding: 8px 0;
    }
    .message-row {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      max-width: 85%;
    }
    .user-message {
      align-self: flex-start;
    }
    .own-message {
      align-self: flex-end;
      flex-direction: row-reverse;
    }
    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
      background-color: #e0e0e0;
    }
    .bubble-container {
      display: flex;
      flex-direction: column;
    }
    .sender-name {
      font-size: 0.75rem;
      color: #616161;
      margin-bottom: 2px;
      margin-left: 4px;
    }
    .own-message .sender-name {
      align-self: flex-end;
      margin-right: 4px;
    }
    .bubble {
      padding: 8px 12px;
      border-radius: 16px;
      background-color: #f1f3f4;
    }
    .own-message .bubble {
      background-color: #e3f2fd;
      border-bottom-right-radius: 4px;
    }
    .user-message:not(.own-message) .bubble {
      border-bottom-left-radius: 4px;
    }
    .bubble-text {
      margin: 0;
      font-size: 0.9rem;
      line-height: 1.4;
      word-break: break-word;
      color: #202124;
    }
    .message-time {
      font-size: 0.7rem;
      color: #9e9e9e;
      margin-top: 2px;
      align-self: flex-end;
    }
    .own-message .message-time {
      align-self: flex-start;
    }
    
    /* System / Bot Message Styles */
    .system-message {
      align-self: center;
      max-width: 95%;
      width: 100%;
    }
    .system-message-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      background-color: #f3e5f5; /* Light purple for verification/audit alerts */
      border-left: 4px solid #8e24aa;
      border-radius: 4px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      width: 100%;
      box-sizing: border-box;
    }
    .system-icon {
      color: #8e24aa;
      flex-shrink: 0;
    }
    .system-content {
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .system-text {
      font-size: 0.85rem;
      color: #4a148c;
      font-weight: 500;
      line-height: 1.4;
    }
    .system-time {
      font-size: 0.65rem;
      color: #7b1fa2;
      align-self: flex-end;
      margin-top: 2px;
    }

    .chat-footer {
      display: flex;
      align-items: center;
      padding: 8px 16px 16px 16px;
      border-top: 1px solid #e0e0e0;
      gap: 8px;
    }
    .message-field {
      flex: 1;
      margin-bottom: -16px; /* Balance standard padding */
    }
    .send-btn {
      flex-shrink: 0;
    }
  `]
})
export class ChatComponent implements OnInit {
  private chatService = inject(ChatService);
  private router = inject(Router);

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  messages = signal<ChatMessage[]>([]);
  messageText = '';
  isLoadingMore = signal(false);
  hasMoreHistory = signal(true);

  ngOnInit() {
    // Stream real-time messages
    this.chatService.getRecentMessages(50).subscribe(msgs => {
      // Sort ascending locally if the view needs standard message flow, 
      // but since we are rendering flex-direction: column-reverse, 
      // the container renders the first elements at the bottom.
      // Firebase ordered by desc (newest first). 
      // Array [newest, second newest, ..., oldest]
      // In flex-direction: column-reverse, the first element (newest) is at the bottom, which is correct!
      this.messages.set(msgs);
    });
  }

  isOwnMessage(msg: ChatMessage): boolean {
    const userProfile = (this.chatService as any).authService.userProfile();
    return userProfile && msg.senderId === userProfile.uid;
  }

  formatTime(timestamp: any): string {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  async sendMessage() {
    if (!this.messageText.trim()) return;
    try {
      await this.chatService.sendMessage(this.messageText);
      this.messageText = '';
      this.scrollToBottom();
    } catch (err: any) {
      console.error('Failed to send message:', err);
    }
  }

  closeChat() {
    this.chatService.isChatOpen.set(false);
  }

  goToSearch() {
    this.router.navigate(['/chat/search']);
  }

  trackByFn(index: number, item: ChatMessage): string {
    return item.id || index.toString();
  }

  // Lazy load history on scroll to top
  async onScroll() {
    const element = this.scrollContainer.nativeElement;
    // Since column-reverse is used:
    // element.scrollTop is 0 when at the bottom (newest messages).
    // element.scrollTop is negative on some browsers, or scrollHeight - clientHeight when scrolled up to the top.
    // Let's check if the user scrolled to the "top" (which is oldest messages, i.e., element.scrollTop + element.clientHeight >= element.scrollHeight - 5)
    const scrolledToTop = Math.abs(element.scrollTop) + element.clientHeight >= element.scrollHeight - 10;
    
    if (scrolledToTop && !this.isLoadingMore() && this.hasMoreHistory() && this.messages().length > 0) {
      this.isLoadingMore.set(true);
      
      // Get the timestamp of the oldest message loaded (which is the last element in our array)
      const oldestMsg = this.messages()[this.messages().length - 1];
      if (oldestMsg && oldestMsg.timestamp) {
        const oldestDate = oldestMsg.timestamp.toDate ? oldestMsg.timestamp.toDate() : new Date(oldestMsg.timestamp);
        
        try {
          const olderMsgs = await this.chatService.getMoreMessages(oldestDate, 50);
          if (olderMsgs.length < 50) {
            this.hasMoreHistory.set(false); // No more older history
          }
          if (olderMsgs.length > 0) {
            // Append older messages to our array
            this.messages.update(prev => [...prev, ...olderMsgs]);
          }
        } catch (err) {
          console.error('Failed to fetch older messages:', err);
        }
      }
      this.isLoadingMore.set(false);
    }
  }

  private scrollToBottom() {
    setTimeout(() => {
      try {
        this.scrollContainer.nativeElement.scrollTop = 0;
      } catch {
        // ignore scroll errors when element is not rendered
      }
    }, 100);
  }
}
