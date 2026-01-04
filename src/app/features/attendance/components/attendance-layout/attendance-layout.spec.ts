import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AttendanceLayout } from './attendance-layout';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { CheckInKiosk } from '../check-in-kiosk/check-in-kiosk';
import { ActiveSessions } from '../active-sessions/active-sessions';
import { AttendanceHistory } from '../attendance-history/attendance-history';

describe('AttendanceLayout', () => {
  let component: AttendanceLayout;
  let fixture: ComponentFixture<AttendanceLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttendanceLayout],
      providers: [provideNoopAnimations()],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .overrideComponent(AttendanceLayout, {
        set: { 
            imports: [CommonModule, MatTabsModule],
            schemas: [NO_ERRORS_SCHEMA]
        }
    })
    .compileComponents();

    fixture = TestBed.createComponent(AttendanceLayout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  
  it('should render tabs', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('mat-tab-group')).toBeTruthy();
      // Tabs content might not be rendered if animations or mocks, but the group should be.
  });
});
