import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MemberList } from './member-list';
import { MemberService } from '../../../../core/services/member.service';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { vi } from 'vitest';
import { MatPaginatorModule } from '@angular/material/paginator';

describe('MemberList', () => {
  let component: MemberList;
  let fixture: ComponentFixture<MemberList>;
  let memberServiceMock: any;

  const mockMembers = [
    { id: '1', name: 'John Doe', membershipStatus: 'Active', expiration: new Date() },
    { id: '2', name: 'Jane Doe', membershipStatus: 'Inactive', expiration: { seconds: 1234567890 } } // Firestore timestamp style
  ];

  beforeEach(async () => {
    memberServiceMock = {
      getMembers: vi.fn().mockReturnValue(of(mockMembers)),
      updateMember: vi.fn().mockResolvedValue(undefined)
    };

    await TestBed.configureTestingModule({
      imports: [MemberList, MatPaginatorModule],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: MemberService, useValue: memberServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MemberList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load members into dataSource', () => {
    expect(memberServiceMock.getMembers).toHaveBeenCalled();
    expect(component.dataSource.data).toEqual(mockMembers);
  });

  it('should toggle status', async () => {
    await component.toggleStatus(mockMembers[0] as any);
    expect(memberServiceMock.updateMember).toHaveBeenCalledWith('1', { membershipStatus: 'Inactive' });

    await component.toggleStatus(mockMembers[1] as any);
    expect(memberServiceMock.updateMember).toHaveBeenCalledWith('2', { membershipStatus: 'Active' });
  });

  it('should check expiration correctly', () => {
    const past = new Date('2000-01-01');
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);

    expect(component.isExpired(past)).toBeTruthy();
    expect(component.isExpired({ seconds: past.getTime() / 1000 })).toBeTruthy();
    
    expect(component.isExpired(future)).toBeFalsy();
    expect(component.isExpired(null)).toBeFalsy();
  });
});
