import { Component, inject, signal, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChatService } from '../../core/services/chat.service';
import { AuthService } from '../../core/services/auth.service';
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
    MatCardModule,
    MatTooltipModule
  ],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
})
export class ChatComponent implements OnInit {
  private chatService = inject(ChatService);
  private authService = inject(AuthService);
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
    this.userService.getStaffUsers().subscribe(users => {
      const currentUser = this.authService.userProfile();
      const currentUid = currentUser ? currentUser.uid : '';
      const activeStaff = (users || []).filter(u => u.isActive !== false && u.uid !== currentUid);
      this.allUsers.set(activeStaff);
    });
  }

  isOwnMessage(msg: ChatMessage): boolean {
    const user = this.authService.userProfile();
    return !!user && msg.senderId === user.uid;
  }

  isMentioned(msg: ChatMessage): boolean {
    const user = this.authService.userProfile();
    if (!user || !msg.content) return false;
    if (msg.content.toLowerCase().includes('@everyone')) return true;
    if (user.displayName) {
      const cleanedName = user.displayName.replace(/\s+/g, '');
      const pattern = new RegExp(`@${user.displayName}|@${cleanedName}`, 'i');
      return pattern.test(msg.content);
    }
    return false;
  }

  onInputChange() {
    const input = this.messageText;
    const lastAtIndex = input.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      // Check if @ is at start or preceded by whitespace
      const charBeforeAt = lastAtIndex > 0 ? input.charAt(lastAtIndex - 1) : ' ';
      if (charBeforeAt === ' ' || charBeforeAt === '\n') {
        const textAfterAt = input.substring(lastAtIndex + 1);
        // Only autocomplete if no whitespace after @
        if (!textAfterAt.includes(' ')) {
          this.mentionSearchQuery = textAfterAt.toLowerCase();
          const matches = this.allUsers().filter(u => 
            (u.displayName && u.displayName.toLowerCase().includes(this.mentionSearchQuery)) ||
            (u.email && u.email.toLowerCase().includes(this.mentionSearchQuery))
          );
          this.filteredUsers.set(matches);
          this.showAutocomplete.set(matches.length > 0);
          return;
        }
      }
    }
    this.showAutocomplete.set(false);
  }

  selectMention(user: User) {
    const lastAtIndex = this.messageText.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const beforeAt = this.messageText.substring(0, lastAtIndex);
      const name = user.displayName || user.email || 'User';
      this.messageText = `${beforeAt}@${name} `;
      this.showAutocomplete.set(false);
      
      // Keep input focused
      if (this.messageInputEl) {
        this.messageInputEl.nativeElement.focus();
      }
    }
  }

  async sendMessage() {
    const text = this.messageText.trim();
    if (!text) return;

    this.messageText = '';
    this.showAutocomplete.set(false);

    try {
      await this.chatService.sendMessage(text);
      this.scrollToBottom();
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  }

  onScroll() {
    const element = this.scrollContainer.nativeElement;
    if (element.scrollTop + element.scrollHeight - element.clientHeight < 50 && this.hasMoreHistory() && !this.isLoadingMore()) {
      this.loadMoreMessages();
    }
  }

  async loadMoreMessages() {
    const currentMsgs = this.messages();
    if (currentMsgs.length === 0) return;

    this.isLoadingMore.set(true);
    const oldestMsg = currentMsgs[currentMsgs.length - 1];

    try {
      const date = oldestMsg.timestamp?.toDate ? oldestMsg.timestamp.toDate() : new Date(oldestMsg.timestamp);
      const olderMsgs = await this.chatService.getMoreMessages(date, 30);
      if (olderMsgs.length === 0) {
        this.hasMoreHistory.set(false);
      } else {
        this.messages.set([...currentMsgs, ...olderMsgs]);
      }
    } catch (err) {
      console.error('Error loading older messages:', err);
    } finally {
      this.isLoadingMore.set(false);
    }
  }

  private scrollToBottom() {
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.scrollTop = 0;
    }
  }

  goToSearch() {
    this.router.navigate(['/chat/search']);
    this.closeChat();
  }

  closeChat() {
    this.chatService.isChatOpen.set(false);
  }

  formatTime(timestamp: any): string {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  trackByFn(index: number, item: ChatMessage): string {
    return item.id || index.toString();
  }
}
