import { Injectable, inject, signal } from '@angular/core';
import { Firestore, collection, collectionData, query, orderBy, limit, addDoc, startAfter, getDocs, Timestamp } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { ChatMessage } from '../models/chat.model';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private messagesCollection = collection(this.firestore, 'chats/global/messages');
  
  isChatOpen = signal(false);

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
