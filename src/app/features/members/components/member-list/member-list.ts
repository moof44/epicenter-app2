import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MemberService } from '../../../../core/services/member.service';
import { Member } from '../../../../core/models/member.model';
import { Observable } from 'rxjs';
import { fadeIn, staggerList } from '../../../../core/animations/animations';

@Component({
  selector: 'app-member-list',
  imports: [
    CommonModule, RouterLink, MatTableModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatTooltipModule, MatProgressSpinnerModule
  ],
  templateUrl: './member-list.html',
  styleUrl: './member-list.css',
  animations: [fadeIn, staggerList]
})
export class MemberList {
  private memberService = inject(MemberService);
  members$: Observable<Member[]> = this.memberService.getMembers();
  displayedColumns: string[] = ['name', 'status', 'joined', 'actions'];

  async toggleStatus(member: Member) {
    if (!member.id) return;
    const newStatus = member.status === 'active' ? 'inactive' : 'active';
    await this.memberService.updateMember(member.id, { status: newStatus });
  }
}
