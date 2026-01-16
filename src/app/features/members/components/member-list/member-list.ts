import { Component, inject, ViewChild, AfterViewInit, OnInit } from '@angular/core';
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
import { Observable } from 'rxjs';
import { fadeIn, staggerList } from '../../../../core/animations/animations';
import { TutorialService } from '../../../../core/services/tutorial.service';
import { TUTORIALS } from '../../../../core/constants/tutorials';

@Component({
  selector: 'app-member-list',
  imports: [
    CommonModule, RouterLink, MatTableModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatTooltipModule, MatProgressSpinnerModule, MatPaginatorModule,
    MatInputModule, MatSelectModule, MatFormFieldModule, FormsModule
  ],
  templateUrl: './member-list.html',
  styleUrl: './member-list.css',
  animations: [fadeIn, staggerList]
})
export class MemberList implements AfterViewInit, OnInit {
  private memberService = inject(MemberService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private tutorialService = inject(TutorialService);

  dataSource = new MatTableDataSource<Member>([]);
  displayedColumns: string[] = ['name', 'remarks', 'membershipStatus', 'membershipExpiration', 'actions'];

  searchQuery = '';
  statusFilter = 'All';
  subscriptionFilter = 'All';

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor() { }

  ngOnInit() {
    this.setupFilterPredicate();
    this.setupUrlPersistence();
    this.setupDataLoading();

    setTimeout(() => {
      this.tutorialService.startTutorial(TUTORIALS['MEMBERS_LIST'].id);
    }, 1000);
  }

  setupFilterPredicate() {
    this.dataSource.filterPredicate = (data: Member, filter: string) => {

      const search = this.searchQuery.toLowerCase();
      const matchesSearch = data.name.toLowerCase().includes(search) ||
        data.contactNumber.includes(search);

      const matchesStatus = this.statusFilter === 'All' || data.membershipStatus === this.statusFilter;

      let matchesSubscription = true;
      if (this.subscriptionFilter !== 'All') {
        const now = new Date();
        const toDate = (d: any) => d ? (d.toDate ? d.toDate() : new Date(d)) : null;

        const memExp = toDate(data.membershipExpiration);
        const trainExp = toDate(data.trainingExpiration);

        // Check if either expiration date is in the future
        const hasActiveSub = (memExp && memExp > now) || (trainExp && trainExp > now);

        if (this.subscriptionFilter === 'HasSubscription') {
          matchesSubscription = !!hasActiveSub;
        } else if (this.subscriptionFilter === 'NoSubscription') {
          matchesSubscription = !hasActiveSub;
        }
      }

      return matchesSearch && matchesStatus && matchesSubscription;
    };
  }

  setupUrlPersistence() {
    this.route.queryParams.subscribe(params => {

      // Only update if changed to avoid cursor jumps / cycles
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

      // Always trigger filter if params changed
      if (changed) {
        this.dataSource.filter = '' + Math.random();
      }
    });
  }

  setupDataLoading() {
    this.memberService.getMembers().subscribe(members => {
      this.dataSource.data = members;
      // Re-apply filter in case data comes after params
      this.dataSource.filter = '' + Math.random();
    });
  }

  applyFilters() {
    // 2. Update URL on filter change
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

    // Trigger local filter
    this.dataSource.filter = '' + Math.random();
  }
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  async toggleStatus(member: Member) {
    if (!member.id) return;
    const newStatus = member.membershipStatus === 'Active' ? 'Inactive' : 'Active';
    await this.memberService.updateMember(member.id, { membershipStatus: newStatus });
  }

  isExpired(member: Member): boolean {
    return this.memberService.isMembershipExpired(member);
  }
}
