import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AttendanceChart } from './attendance-chart';
import { AttendanceService } from '../../../../core/services/attendance.service';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { vi } from 'vitest';
import { SimpleChange } from '@angular/core';

describe('AttendanceChart', () => {
  let component: AttendanceChart;
  let fixture: ComponentFixture<AttendanceChart>;
  let attendanceServiceMock: any;

  beforeEach(async () => {
    attendanceServiceMock = {
      getMemberAttendance: vi.fn().mockResolvedValue([
          { date: new Date().toISOString().split('T')[0] } // Present today
      ])
    };

    await TestBed.configureTestingModule({
      imports: [AttendanceChart],
      providers: [
        provideNoopAnimations(),
        { provide: AttendanceService, useValue: attendanceServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AttendanceChart);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load attendance on memberId change', async () => {
      component.memberId = '123';
      component.ngOnChanges({
          memberId: new SimpleChange(null, '123', true)
      });
      
      // Wait for async call
      await fixture.whenStable();
      
      expect(attendanceServiceMock.getMemberAttendance).toHaveBeenCalledWith('123');
      expect(component.calendarDays.length).toBe(28);
      
      // Check today is present (last item)
      const lastDay = component.calendarDays[component.calendarDays.length - 1];
      expect(lastDay.present).toBeTruthy();
  });
  it('should handle error during load', async () => {
      attendanceServiceMock.getMemberAttendance.mockRejectedValue(new Error('Test Error'));
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      component.memberId = '123';
      component.ngOnChanges({
          memberId: new SimpleChange(null, '123', true)
      });
      await fixture.whenStable();
      
      expect(spy).toHaveBeenCalled();
  });
});
