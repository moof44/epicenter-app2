import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Firestore, collection, query, orderBy, where, getDocs, limit, Timestamp } from '@angular/fire/firestore';
import { ChatMessage } from '../../../core/models/chat.model';
import { fadeIn } from '../../../core/animations/animations';

@Component({
  selector: 'app-chat-search',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule
  ],
  templateUrl: './chat-search.component.html',
  styleUrl: './chat-search.component.css',
  animations: [fadeIn]
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
    startDate: null as Date | null,
    endDate: null as Date | null
  };

  // Computed Metrics
  totalResultsCount = computed(() => this.filteredMessages().length);
  userMessageCount = computed(() => this.filteredMessages().filter(m => m.type === 'user').length);
  systemAlertCount = computed(() => this.filteredMessages().filter(m => m.type === 'system').length);

  ngOnInit() {
    this.fetchFromFirestore();
  }

  async fetchFromFirestore() {
    this.loading.set(true);
    try {
      const chatCol = collection(this.firestore, 'global_chat_messages');
      let q = query(chatCol, orderBy('timestamp', 'desc'), limit(200));

      if (this.filters.startDate) {
        const startTs = Timestamp.fromDate(new Date(this.filters.startDate));
        q = query(chatCol, where('timestamp', '>=', startTs), orderBy('timestamp', 'desc'), limit(200));
      }

      const snapshot = await getDocs(q);
      const msgs: ChatMessage[] = [];
      snapshot.forEach(doc => {
        const data = doc.data() as any;
        msgs.push({
          id: doc.id,
          senderId: data.senderId,
          senderName: data.senderName,
          senderAvatar: data.senderAvatar,
          content: data.content,
          timestamp: data.timestamp,
          type: data.type || 'user',
          });
      });

      this.rawMessages.set(msgs);
      this.applyFilters();
    } catch (err) {
      console.error('Error querying chat messages:', err);
    } finally {
      this.loading.set(false);
    }
  }

  applyFilters() {
    let result = this.rawMessages();

    // 1. Keyword search
    if (this.filters.keyword.trim()) {
      const kw = this.filters.keyword.toLowerCase();
      result = result.filter(m => m.content && m.content.toLowerCase().includes(kw));
    }

    // 2. Sender search
    if (this.filters.sender.trim()) {
      const s = this.filters.sender.toLowerCase();
      result = result.filter(m => m.senderName && m.senderName.toLowerCase().includes(s));
    }

    // 3. Type filter
    if (this.filters.type !== 'all') {
      result = result.filter(m => m.type === this.filters.type);
    }

    // 4. Date End range
    if (this.filters.endDate) {
      const endOfDay = new Date(this.filters.endDate);
      endOfDay.setHours(23, 59, 59, 999);
      result = result.filter(m => {
        const d = m.timestamp?.toDate ? m.timestamp.toDate() : new Date(m.timestamp);
        return d <= endOfDay;
      });
    }

    this.filteredMessages.set(result);
  }

  onDateChange() {
    this.applyFilters();
  }

  resetFilters() {
    this.filters = {
      keyword: '',
      sender: '',
      type: 'all',
      startDate: null,
      endDate: null
    };
    this.fetchFromFirestore();
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  formatTime(timestamp: any): string {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }

  trackByFn(index: number, item: ChatMessage): string {
    return item.id || index.toString();
  }
}
