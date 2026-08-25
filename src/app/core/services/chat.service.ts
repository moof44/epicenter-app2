import { Injectable, inject, signal, effect, OnDestroy } from '@angular/core';
import { Firestore, collection, collectionData, query, orderBy, limit, addDoc, startAfter, getDocs, Timestamp } from '@angular/fire/firestore';
import { Observable, Subscription } from 'rxjs';
import { AuthService } from './auth.service';
import { ChatMessage } from '../models/chat.model';

@Injectable({
  providedIn: 'root'
})
export class ChatService implements OnDestroy {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private messagesCollection = collection(this.firestore, 'chats/global/messages');
  
  isChatOpen = signal(false);
  unreadCount = signal(0);
  triggerWobble = signal(false);
  hasDirectMention = signal(false);
  lastMessageText = signal('');
  lastMessageSender = signal('');
  previewActive = signal(false);
  
  private messagesSub: Subscription | null = null;
  private lastReadDate: Date | null = null;
  private previewTimeout: any = null;
  private isInitialSnapshot = true;
  private sessionStartTime = new Date();

  constructor() {
    effect(() => {
      const user = this.authService.userProfile();
      const isOpen = this.isChatOpen();
      
      setTimeout(() => {
        if (user) {
          const storedKey = `chat_last_read_${user.uid}`;
          const storedVal = localStorage.getItem(storedKey);
          this.lastReadDate = storedVal ? new Date(storedVal) : null;
          
          if (isOpen) {
            this.resetUnreadCount(user.uid);
          }
          this.setupMessagesListener(user.uid);
        } else {
          this.cleanupListener();
          this.unreadCount.set(0);
          this.lastReadDate = null;
        }
      }, 3000); // Stagger background socket listener by 3s to let main page render first
    });
  }

  private setupMessagesListener(userId: string) {
    this.cleanupListener();
    this.isInitialSnapshot = true;
    
    const q = query(
      this.messagesCollection,
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    
    this.messagesSub = (collectionData(q, { idField: 'id' }) as Observable<ChatMessage[]>).subscribe(msgs => {
      if (this.isChatOpen()) {
        this.resetUnreadCount(userId);
      } else {
        if (msgs && msgs.length > 0) {
          const currentUserId = userId;
          const user = this.authService.userProfile();
          const lastRead = this.lastReadDate;
          
          let count = 0;
          let newestNewMsg: ChatMessage | null = null;
          
          if (!lastRead) {
            count = msgs.filter(m => m.senderId !== currentUserId).length;
            newestNewMsg = msgs.find(m => m.senderId !== currentUserId) || null;
          } else {
            count = msgs.filter(m => {
              if (m.senderId === currentUserId) return false;
              if (!m.timestamp) return false;
              const msgDate = m.timestamp.toDate ? m.timestamp.toDate() : new Date(m.timestamp);
              return msgDate > lastRead;
            }).length;
            newestNewMsg = msgs.find(m => {
              if (m.senderId === currentUserId) return false;
              if (!m.timestamp) return false;
              const msgDate = m.timestamp.toDate ? m.timestamp.toDate() : new Date(m.timestamp);
              return msgDate > lastRead;
            }) || null;
          }
          
          this.unreadCount.set(count);
          
          // Only trigger floating preview popup & sounds for fresh live incoming messages created during active session
          const msgDate = newestNewMsg?.timestamp
            ? (newestNewMsg.timestamp.toDate ? newestNewMsg.timestamp.toDate() : new Date(newestNewMsg.timestamp))
            : null;
          const isFreshMessage = msgDate && msgDate.getTime() > this.sessionStartTime.getTime();

          if (newestNewMsg && !this.isInitialSnapshot && isFreshMessage) {
            let isMention = false;
            
            // Check for @everyone mention
            if (newestNewMsg.content.toLowerCase().includes('@everyone')) {
              isMention = true;
            }
            // Check for direct user mention
            else if (user && user.displayName) {
              const cleanedName = user.displayName.replace(/\s+/g, '');
              const mentionPattern = new RegExp(`@${user.displayName}|@${cleanedName}`, 'i');
              if (mentionPattern.test(newestNewMsg.content)) {
                isMention = true;
              }
            }
            
            if (isMention) {
              this.hasDirectMention.set(true);
              this.playNotificationSound();
            }
            
            // Trigger temporary wobble
            this.triggerWobble.set(true);
            setTimeout(() => this.triggerWobble.set(false), 1500);
            
            // Trigger preview bubble
            this.lastMessageText.set(newestNewMsg.content);
            this.lastMessageSender.set(newestNewMsg.senderName);
            this.previewActive.set(true);
            
            if (this.previewTimeout) clearTimeout(this.previewTimeout);
            this.previewTimeout = setTimeout(() => {
              this.previewActive.set(false);
            }, 4000);
          }
        } else {
          this.unreadCount.set(0);
        }
      }
      this.isInitialSnapshot = false;
    });
  }

  resetUnreadCount(userId: string) {
    const storedKey = `chat_last_read_${userId}`;
    const now = new Date();
    localStorage.setItem(storedKey, now.toISOString());
    this.lastReadDate = now;
    this.unreadCount.set(0);
    this.hasDirectMention.set(false);
    this.previewActive.set(false);
    this.triggerWobble.set(false);
    if (this.previewTimeout) {
      clearTimeout(this.previewTimeout);
      this.previewTimeout = null;
    }
  }

  private cleanupListener() {
    if (this.messagesSub) {
      this.messagesSub.unsubscribe();
      this.messagesSub = null;
    }
  }

  playNotificationSound() {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.1); // A5
      
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.45);
    } catch (e) {
      console.warn('Audio play blocked or unsupported:', e);
    }
  }

  ngOnDestroy() {
    this.cleanupListener();
  }

  getRecentMessages(limitNum = 50): Observable<ChatMessage[]> {
    const q = query(
      this.messagesCollection,
      orderBy('timestamp', 'desc'),
      limit(limitNum)
    );
    return collectionData(q, { idField: 'id' }) as Observable<ChatMessage[]>;
  }

  async getMoreMessages(beforeTimestamp: Date, limitNum = 50): Promise<ChatMessage[]> {
    const firestoreTimestamp = Timestamp.fromDate(beforeTimestamp);
    const q = query(
      this.messagesCollection,
      orderBy('timestamp', 'desc'),
      startAfter(firestoreTimestamp),
      limit(limitNum)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: (doc.data() as any).timestamp
    })) as ChatMessage[];
  }

  async sendMessage(content: string): Promise<void> {
    const user = this.authService.userProfile();
    if (!user) throw new Error('You must be logged in to send messages');

    const message: Omit<ChatMessage, 'id'> = {
      senderId: user.uid,
      senderName: user.displayName || 'Staff Member',
      senderAvatar: user.photoURL || '',
      content,
      timestamp: new Date(),
      type: 'user'
    };

    await addDoc(this.messagesCollection, message);
  }
}
