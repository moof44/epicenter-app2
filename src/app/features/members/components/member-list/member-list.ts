import { Component, inject, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
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
export class MemberList implements AfterViewInit {
  private memberService = inject(MemberService);

  dataSource = new MatTableDataSource<Member>([]);
  displayedColumns: string[] = ['name', 'remarks', 'membershipStatus', 'membershipExpiration', 'actions'];

  searchQuery = '';
  statusFilter = 'All';

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor() {
    this.memberService.getMembers().subscribe(members => {
      this.dataSource.data = members;
    });

    // Custom filtering
    this.dataSource.filterPredicate = (data: Member, filter: string) => {
      const search = this.searchQuery.toLowerCase();
      const matchesSearch = data.name.toLowerCase().includes(search) ||
        data.contactNumber.includes(search);

      const matchesStatus = this.statusFilter === 'All' || data.membershipStatus === this.statusFilter;

      return matchesSearch && matchesStatus;
    };
  }

  applyFilters() {
    // Trigger filter update (value doesn't matter much as we use class props in predicate, 
    // but changing it triggers the check)
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
