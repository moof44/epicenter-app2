import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Firestore, collection, query, orderBy, limit, onSnapshot } from '@angular/fire/firestore';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { RedemptionClaim } from '../../../../core/models/store.model';
import { fadeIn } from '../../../../core/animations/animations';

@Component({
  selector: 'app-redemption-history',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatTableModule, MatCardModule,
    MatIconModule, MatChipsModule, MatInputModule, MatFormFieldModule
  ],
  templateUrl: './redemption-history.html',
  styleUrl: './redemption-history.css',
  animations: [fadeIn]
})
export class RedemptionHistoryComponent implements OnInit {
  private firestore = inject(Firestore);

  claims = signal<RedemptionClaim[]>([]);
  searchQuery = signal<string>('');
  displayedColumns: string[] = ['voucherCode', 'memberName', 'productName', 'coinsSpent', 'fulfilledBy', 'status', 'fulfilledAt'];

  ngOnInit(): void {
    const claimsRef = collection(this.firestore, 'redemption_claims');
    const q = query(claimsRef, orderBy('createdAt', 'desc'), limit(100));

    onSnapshot(q, (snapshot) => {
      const list: RedemptionClaim[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          voucherCode: data['voucherCode'],
          memberId: data['memberId'],
          memberName: data['memberName'] || 'Member',
          productId: data['productId'],
          productName: data['productName'] || 'Reward Item',
          coinsSpent: data['coinsSpent'] || 0,
          status: data['status'] || 'PENDING_CLAIM',
          fulfilledByStaffName: data['fulfilledByStaffName'] || '—',
          createdAt: data['createdAt']?.toDate ? data['createdAt'].toDate() : new Date(),
          fulfilledAt: data['fulfilledAt']?.toDate ? data['fulfilledAt'].toDate() : null
        });
      });
      this.claims.set(list);
    });
  }

  filteredClaims(): RedemptionClaim[] {
    const queryStr = this.searchQuery().toLowerCase().trim();
    if (!queryStr) return this.claims();

    return this.claims().filter(c =>
      c.voucherCode.toLowerCase().includes(queryStr) ||
      c.memberName.toLowerCase().includes(queryStr) ||
      c.productName.toLowerCase().includes(queryStr) ||
      (c.fulfilledByStaffName && c.fulfilledByStaffName.toLowerCase().includes(queryStr))
    );
  }

  totalFulfilledCount(): number {
    return this.claims().filter(c => c.status === 'FULFILLED').length;
  }

  totalCoinsBurned(): number {
    return this.claims()
      .filter(c => c.status === 'FULFILLED')
      .reduce((sum, c) => sum + (c.coinsSpent || 0), 0);
  }

  formatDate(val: any): string {
    if (!val) return '—';
    const d = new Date(val);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
