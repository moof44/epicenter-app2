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
import { MemberService } from '../../../../core/services/member.service';
import { Member } from '../../../../core/models/member.model';
import { Observable } from 'rxjs';
import { fadeIn, staggerList } from '../../../../core/animations/animations';

@Component({
  selector: 'app-member-list',
  imports: [
    CommonModule, RouterLink, MatTableModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatTooltipModule, MatProgressSpinnerModule, MatPaginatorModule
  ],
  templateUrl: './member-list.html',
  styleUrl: './member-list.css',
  animations: [fadeIn, staggerList]
})
export class MemberList implements AfterViewInit {
  private memberService = inject(MemberService);
  
  dataSource = new MatTableDataSource<Member>([]);
  displayedColumns: string[] = ['name', 'membershipStatus', 'expiration', 'actions'];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor() {
    this.memberService.getMembers().subscribe(members => {
      this.dataSource.data = members;
    });
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  async toggleStatus(member: Member) {
    if (!member.id) return;
    const newStatus = member.membershipStatus === 'Active' ? 'Inactive' : 'Active';
    await this.memberService.updateMember(member.id, { membershipStatus: newStatus });
  }
}
