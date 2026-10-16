import { Component, inject, OnInit, ChangeDetectionStrategy, DestroyRef, ChangeDetectorRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, Subject, switchMap, catchError, of, debounceTime, distinctUntilChanged } from 'rxjs';
import { MemberService } from '../../../../core/services/member.service';
import { Member } from '../../../../core/models/member.model';
import { MemberQueryOptions } from '../../../../core/repositories/member.repository';
import { fadeIn } from '../../../../core/animations/animations';
import { MatDialog } from '@angular/material/dialog';
import { MemberDuplicateResolver } from '../member-duplicate-resolver/member-duplicate-resolver';

@Component({
  selector: 'app-member-list',
  standalone: true,
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
  private cdr = inject(ChangeDetectorRef);

  dataSource = new MatTableDataSource<Member>([]);
  displayedColumns: string[] = ['name', 'remarks', 'membershipStatus', 'membershipExpiration', 'actions'];

  searchQuery = '';
  statusFilter = 'All';
  subscriptionFilter = 'All';
  progressFilter = 'All';

  pageIndex = 0;
  pageSize = 10;
  totalMembers = 0;

  private nowTimestamp = Date.now();
  private query$ = new BehaviorSubject<MemberQueryOptions>({
    search: '',
    status: 'All',
    subscription: 'All',
    progress: 'All',
    pageIndex: 0,
    pageSize: 10,
  });

  trackByMemberId = (_index: number, item: Member): string => item.id || String(_index);

  previewingImageUrl: string | null = null;
  previewingMemberName = '';
  loadingScanMemberId: string | null = null;

  private searchSubject = new Subject<string>();

  ngOnInit() {
    this.setupSearchDebounce();
    this.setupUrlPersistence();
    this.setupDataLoading();
  }

  private setupSearchDebounce() {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((query) => {
        this.searchQuery = query;
        this.pageIndex = 0;
        this.updateUrl();
      });
  }

  getAvatarInitials(name: string): string {
    if (!name) return 'M';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  async openScanPreview(member: Member) {
    if (member.latestScanImageUrl || member.pendingProgressScanUrl) {
      this.previewingImageUrl = member.latestScanImageUrl || member.pendingProgressScanUrl || null;
      this.previewingMemberName = member.name || 'Member';
      this.cdr.markForCheck();
      return;
    }

    if (!member.id) return;

    this.loadingScanMemberId = member.id;
    this.cdr.markForCheck();

    try {
      const url = await this.memberService.getLatestScanImageUrl(member.id);
      if (url) {
        this.previewingImageUrl = url;
        this.previewingMemberName = member.name || 'Member';
      }
    } finally {
      this.loadingScanMemberId = null;
      this.cdr.markForCheck();
    }
  }

  closeImagePreview() {
    this.previewingImageUrl = null;
    this.previewingMemberName = '';
    this.cdr.markForCheck();
  }

  openDuplicateResolver() {
    this.dialog.open(MemberDuplicateResolver, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      autoFocus: false,
      panelClass: 'duplicate-resolver-dialog'
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

  setupUrlPersistence() {
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.searchQuery = params['search'] || '';
      this.statusFilter = params['status'] || 'All';
      this.subscriptionFilter = params['subscription'] || 'All';
      this.progressFilter = params['progress'] || 'All';
      this.pageIndex = params['page'] ? parseInt(params['page'], 10) : 0;
      this.pageSize = params['pageSize'] ? parseInt(params['pageSize'], 10) : this.pageSize;

      this.emitQuery();
    });
  }

  setupDataLoading() {
    this.query$
      .pipe(
        switchMap(options =>
          this.memberService.getMembersPaged(options).pipe(
            catchError(err => {
              console.warn('[MemberList] Error fetching paged members, recovering gracefully:', err);
              return of({ items: [], totalCount: 0 });
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(res => {
        this.nowTimestamp = Date.now();
        this.dataSource.data = res.items;
        this.totalMembers = res.totalCount;
        this.cdr.markForCheck();
      });
  }

  private emitQuery() {
    this.query$.next({
      search: this.searchQuery,
      status: this.statusFilter,
      subscription: this.subscriptionFilter,
      progress: this.progressFilter,
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
    });
  }

  onSearchChange(text: string) {
    this.searchQuery = text;
    this.searchSubject.next(text);
  }

  applyFilters() {
    this.pageIndex = 0;
    this.updateUrl();
  }

  clearSearch() {
    this.searchQuery = '';
    this.pageIndex = 0;
    this.updateUrl();
  }

  onPageChange(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updateUrl();
  }

  private updateUrl() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: this.searchQuery || null,
        status: this.statusFilter !== 'All' ? this.statusFilter : null,
        subscription: this.subscriptionFilter !== 'All' ? this.subscriptionFilter : null,
        progress: this.progressFilter !== 'All' ? this.progressFilter : null,
        page: this.pageIndex > 0 ? this.pageIndex : null,
        pageSize: this.pageSize !== 10 ? this.pageSize : null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
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
