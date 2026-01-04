import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AttendanceHistory } from './attendance-history';
import { AttendanceService } from '../../../../core/services/attendance.service';
import { of } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { vi } from 'vitest';
import { MatNativeDateModule } from '@angular/material/core';

describe('AttendanceHistory', () => {
  let component: AttendanceHistory;
  let fixture: ComponentFixture<AttendanceHistory>;
  let attendanceServiceMock: any;

  const mockRecords = [
    { id: '1', memberName: 'John', checkInTime: { seconds: 123 }, status: 'Checked In' }
  ];

  beforeEach(async () => {
    attendanceServiceMock = {
      getHistoryByDate: vi.fn().mockReturnValue(of(mockRecords))
    };

    await TestBed.configureTestingModule({
      imports: [AttendanceHistory, MatNativeDateModule], // MatNativeDateModule needed for DateAdapter
      providers: [
        provideNoopAnimations(),
        { provide: AttendanceService, useValue: attendanceServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AttendanceHistory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load history for today initially', () => {
     // startWith(new Date()) invokes getHistoryByDate with today's date string
     expect(attendanceServiceMock.getHistoryByDate).toHaveBeenCalled();
  });

  it('should reload history when date changes', async () => {
      const date = new Date('2023-01-01');
      
      const promise = new Promise<void>(resolve => {
        component.history$.subscribe(() => {
            const calls = attendanceServiceMock.getHistoryByDate.mock.calls;
            if (calls.some((c: any) => c[0] === '2023-01-01')) {
                resolve();
            }
        });
      });

      component.dateControl.setValue(date);
      await promise;
      expect(attendanceServiceMock.getHistoryByDate).toHaveBeenCalledWith('2023-01-01');
  });

  it('should check expiration', () => {
      const today = new Date();
      const past = new Date(today);
      past.setDate(today.getDate() - 1);
      
      expect(component.isExpired({ seconds: past.getTime() / 1000 })).toBeTruthy();
      expect(component.isExpired(null)).toBeFalsy();
  });
});
