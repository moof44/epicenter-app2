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
import { UserService } from '../../core/services/user.service';
import { ChatMessage } from '../../core/models/chat.model';
import { User } from '../../core/models/user.model';

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
              <div class="bubble" [class.mention-highlight]="isMentioned(msg)">
                <p class="bubble-text">{{msg.content}}</p>
              </div>
              <span class="message-time">{{formatTime(msg.timestamp)}}</span>
            </div>
          </ng-container>
        </div>
      </div>

      <!-- Autocomplete Dropdown -->
      <div class="mention-autocomplete" *ngIf="showAutocomplete()">
        <button type="button" class="autocomplete-item" *ngFor="let user of filteredUsers()" (click)="selectMention(user)">
          <img class="autocomplete-avatar" [src]="user.photoURL || 'assets/default-avatar.png'" alt="avatar">
          <span class="autocomplete-name">{{ user.displayName }}</span>
        </button>
      </div>

      <!-- Chat Footer -->
      <div class="chat-footer">
        <mat-form-field appearance="outline" class="message-field">
          <input #messageInput matInput placeholder="Type a message..." [(ngModel)]="messageText" (input)="onInputChange()" (keydown.enter)="sendMessage()">
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
      position: relative;
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

    /* Autocomplete mention dropdown */
    .mention-autocomplete {
      position: absolute;
      bottom: 70px;
      left: 16px;
      right: 16px;
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      box-shadow: 0 -4px 10px rgba(0,0,0,0.1);
      max-height: 160px;
      overflow-y: auto;
      z-index: 100;
    }
    .autocomplete-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      cursor: pointer;
      transition: background-color 0.2s;
      background: none;
      border: none;
      width: 100%;
      text-align: left;
    }
    .autocomplete-item:hover, .autocomplete-item:focus {
      background-color: #f5f5f5;
      outline: none;
    }
    .autocomplete-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      object-fit: cover;
      background-color: #e0e0e0;
    }
    .autocomplete-name {
      font-size: 0.85rem;
      font-weight: 500;
      color: #3c4043;
    }

    /* Direct mention highlight styles */
    .mention-highlight {
      background-color: #fffde7 !important; /* Soft yellow */
      border: 1px solid #ffd54f !important;  /* Gold border */
      box-shadow: 0 0 8px rgba(255, 213, 79, 0.4);
    }
  `]
})
export class ChatComponent implements OnInit {
  private chatService = inject(ChatService);
  private userService = inject(UserService);
  private router = inject(Router);

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  @ViewChild('messageInput') private messageInputEl!: ElementRef;

  messages = signal<ChatMessage[]>([]);
  messageText = '';
  isLoadingMore = signal(false);
  hasMoreHistory = signal(true);

  // Mention autocomplete signals
  showAutocomplete = signal(false);
  filteredUsers = signal<User[]>([]);
  allUsers = signal<User[]>([]);
  mentionSearchQuery = '';

  ngOnInit() {
    // Stream real-time messages
    this.chatService.getRecentMessages(50).subscribe(msgs => {
      this.messages.set(msgs);
    });

    // Fetch active users list for mentions dropdown (excluding current user)
    this.userService.getUsers().subscribe(users => {
      const currentUser = (this.chatService as any).authService.userProfile();
      const currentUid = currentUser ? currentUser.uid : '';
      const activeStaff = (users || []).filter(u => u.isActive !== false && u.uid !== currentUid);
      this.allUsers.set(activeStaff);
    });
  }

  isOwnMessage(msg: ChatMessage): boolean {
    const userProfile = (this.chatService as any).authService.userProfile();
    return userProfile && msg.senderId === userProfile.uid;
  }

  isMentioned(msg: ChatMessage): boolean {
    if (msg.type !== 'user') return false;
    const userProfile = (this.chatService as any).authService.userProfile();
    if (!userProfile) return false;
    if (msg.senderId === userProfile.uid) return false; // Don't highlight own messages

    // Highlight if message mentions @everyone
    if (msg.content.toLowerCase().includes('@everyone')) return true;

    if (!userProfile.displayName) return false;
    const cleanedName = userProfile.displayName.replace(/\s+/g, '');
    const mentionPattern = new RegExp(`@${userProfile.displayName}|@${cleanedName}`, 'i');
    return mentionPattern.test(msg.content);
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
      this.showAutocomplete.set(false);
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

  onInputChange() {
    const text = this.messageText;
    const selectionStart = this.messageInputEl ? this.messageInputEl.nativeElement.selectionStart : text.length;
    
    const textBeforeCursor = text.slice(0, selectionStart);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const queryText = textBeforeCursor.slice(lastAtIndex + 1);
      if (!queryText.includes(' ') && queryText.length < 20) {
        this.mentionSearchQuery = queryText;
        const filtered = this.allUsers().filter(u => 
          u.displayName.toLowerCase().includes(queryText.toLowerCase())
        );
        
        const dropdownList: User[] = [];
        // Prepend "@everyone" if matching or if search query is short/empty
        if ('everyone'.includes(queryText.toLowerCase())) {
          dropdownList.push({
            uid: 'everyone',
            email: '',
            displayName: 'everyone',
            roles: []
          });
        }
        dropdownList.push(...filtered);
        
        this.filteredUsers.set(dropdownList);
        this.showAutocomplete.set(dropdownList.length > 0);
        return;
      }
    }
    
    this.showAutocomplete.set(false);
  }

  selectMention(user: User) {
    const text = this.messageText;
    const selectionStart = this.messageInputEl ? this.messageInputEl.nativeElement.selectionStart : text.length;
    
    const textBeforeCursor = text.slice(0, selectionStart);
    const textAfterCursor = text.slice(selectionStart);
    
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const cleanedName = user.displayName.replace(/\s+/g, '');
      const newTextBeforeCursor = textBeforeCursor.slice(0, lastAtIndex) + '@' + cleanedName + ' ';
      
      this.messageText = newTextBeforeCursor + textAfterCursor;
      this.showAutocomplete.set(false);
      
      setTimeout(() => {
        if (this.messageInputEl) {
          this.messageInputEl.nativeElement.focus();
          const newCursorPos = newTextBeforeCursor.length;
          this.messageInputEl.nativeElement.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 50);
    }
  }

  // Lazy load history on scroll to top
  async onScroll() {
    const element = this.scrollContainer.nativeElement;
    const scrolledToTop = Math.abs(element.scrollTop) + element.clientHeight >= element.scrollHeight - 10;
    
    if (scrolledToTop && !this.isLoadingMore() && this.hasMoreHistory() && this.messages().length > 0) {
      this.isLoadingMore.set(true);
      
      const oldestMsg = this.messages()[this.messages().length - 1];
      if (oldestMsg && oldestMsg.timestamp) {
        const oldestDate = oldestMsg.timestamp.toDate ? oldestMsg.timestamp.toDate() : new Date(oldestMsg.timestamp);
        
        try {
          const olderMsgs = await this.chatService.getMoreMessages(oldestDate, 50);
          if (olderMsgs.length < 50) {
            this.hasMoreHistory.set(false);
          }
          if (olderMsgs.length > 0) {
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
        // ignore
      }
    }, 100);
  }
}
