import { Component, inject, ViewChild, OnInit, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MemberService } from '../../../../core/services/member.service';
import { Member } from '../../../../core/models/member.model';
import { fadeIn } from '../../../../core/animations/animations';
import { MatDialog } from '@angular/material/dialog';
import { MemberDuplicateResolver } from '../member-duplicate-resolver/member-duplicate-resolver';

@Component({
  selector: 'app-member-list',
  imports: [
    CommonModule, RouterLink, MatTableModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatTooltipModule, MatProgressSpinnerModule, MatPaginatorModule,
    MatInputModule, MatSelectModule, MatFormFieldModule, FormsModule
  ],
  templateUrl: './member-list.html',
  styleUrl: './member-list.css',
  animations: [fadeIn],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberList implements OnInit {
  private memberService = inject(MemberService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);

  dataSource = new MatTableDataSource<Member>([]);
  displayedColumns: string[] = ['name', 'remarks', 'membershipStatus', 'membershipExpiration', 'actions'];

  searchQuery = '';
  statusFilter = 'All';
  subscriptionFilter = 'All';

  // Cached filter state to avoid allocations inside the 3,600+ row predicate
  private searchFilterLower = '';
  private nowTimestamp = Date.now();

  @ViewChild(MatPaginator) set paginator(p: MatPaginator | undefined) {
    if (p) {
      this.dataSource.paginator = p;
    }
  }

  trackByMemberId = (_index: number, item: Member): string => item.id || String(_index);

  constructor() { }

  ngOnInit() {
    this.setupFilterPredicate();
    this.setupUrlPersistence();
    this.setupDataLoading();
  }

  openDuplicateResolver() {
    this.dialog.open(MemberDuplicateResolver, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      autoFocus: false
    });
  }

  private getExpMs(exp: any): number {
    if (!exp) return 0;
    if (exp.seconds) return exp.seconds * 1000;
    if (exp instanceof Date) return exp.getTime();
    if (exp.toDate) return exp.toDate().getTime();
    const d = new Date(exp);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }

  setupFilterPredicate() {
    this.dataSource.filterPredicate = (data: Member, _filter: string) => {
      if (this.searchFilterLower) {
        const nameMatch = data.name ? data.name.toLowerCase().includes(this.searchFilterLower) : false;
        const contactMatch = data.contactNumber ? data.contactNumber.includes(this.searchFilterLower) : false;
        if (!nameMatch && !contactMatch) return false;
      }

      if (this.statusFilter !== 'All' && data.membershipStatus !== this.statusFilter) {
        return false;
      }

      if (this.subscriptionFilter !== 'All') {
        const memExpMs = this.getExpMs(data.membershipExpiration);
        const trainExpMs = this.getExpMs(data.trainingExpiration);
        const hasActiveSub = memExpMs > this.nowTimestamp || trainExpMs > this.nowTimestamp;

        if (this.subscriptionFilter === 'HasSubscription' && !hasActiveSub) return false;
        if (this.subscriptionFilter === 'NoSubscription' && hasActiveSub) return false;
      }

      return true;
    };
  }

  setupUrlPersistence() {
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const newSearch = params['search'] || '';
      const newStatus = params['status'] || 'All';
      const newSub = params['subscription'] || 'All';

      let changed = false;
      if (this.searchQuery !== newSearch) {
        this.searchQuery = newSearch;
        changed = true;
      }
      if (this.statusFilter !== newStatus) {
        this.statusFilter = newStatus;
        changed = true;
      }
      if (this.subscriptionFilter !== newSub) {
        this.subscriptionFilter = newSub;
        changed = true;
      }

      if (changed) {
        this.triggerFilter();
      }
    });
  }

  setupDataLoading() {
    this.memberService.getMembers().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(members => {
      this.dataSource.data = members;
      this.triggerFilter();
    });
  }

  private triggerFilter() {
    this.searchFilterLower = this.searchQuery.trim().toLowerCase();
    this.nowTimestamp = Date.now();
    this.dataSource.filter = `${this.searchFilterLower}|${this.statusFilter}|${this.subscriptionFilter}|${this.nowTimestamp}`;
  }

  applyFilters() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: this.searchQuery || null,
        status: this.statusFilter !== 'All' ? this.statusFilter : null,
        subscription: this.subscriptionFilter !== 'All' ? this.subscriptionFilter : null
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });

    this.triggerFilter();
  }

  async toggleStatus(member: Member) {
    if (!member.id) return;
    const newStatus = member.membershipStatus === 'Active' ? 'Inactive' : 'Active';
    await this.memberService.updateMember(member.id, { membershipStatus: newStatus });
  }

  isExpired(member: Member): boolean {
    if (!member.membershipExpiration) return false;
    const expMs = this.getExpMs(member.membershipExpiration);
    return expMs > 0 && expMs < this.nowTimestamp;
  }
}
