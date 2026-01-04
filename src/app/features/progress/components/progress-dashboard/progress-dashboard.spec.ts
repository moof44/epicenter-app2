import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProgressDashboard } from './progress-dashboard';
import { MemberService } from '../../../../core/services/member.service';
import { ProgressService } from '../../../../core/services/progress.service';
import { AttendanceService } from '../../../../core/services/attendance.service';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { vi } from 'vitest';

describe('ProgressDashboard', () => {
  let component: ProgressDashboard;
  let fixture: ComponentFixture<ProgressDashboard>;
  let memberServiceMock: any;
  let progressServiceMock: any;
  let activatedRouteMock: any;

  const mockMember = { id: '123', firstName: 'John', lastName: 'Doe' };
  const mockMeasurements = [
    { weight: 70, bodyFat: 20, visceralFat: 5, muscleMass: 40, bmi: 22, metabolism: 1500, bodyAge: 25, date: (() => { const d = new Date(); d.setHours(d.getHours() + 1); return d; })() }, // Latest
    { weight: 72, bodyFat: 22, visceralFat: 6, muscleMass: 38, bmi: 23, metabolism: 1450, bodyAge: 26, date: new Date() } // Previous
  ];

  beforeEach(async () => {
    memberServiceMock = {
      getMember: vi.fn().mockReturnValue(of(mockMember))
    };
    progressServiceMock = {
      getTimeSeries: vi.fn().mockReturnValue(of(mockMeasurements))
    };
    activatedRouteMock = {
      snapshot: {
        paramMap: {
          get: vi.fn().mockReturnValue('123')
        }
      }
    };

    await TestBed.configureTestingModule({
      imports: [ProgressDashboard],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: MemberService, useValue: memberServiceMock },
        { provide: ProgressService, useValue: progressServiceMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: AttendanceService, useValue: { 
          getHistoryByDate: vi.fn().mockResolvedValue([]),
          // Return pending promise to avoid NG0100 in child component during test
          getMemberAttendance: vi.fn().mockReturnValue(new Promise(() => {})) 
        } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProgressDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.memberId).toBe('123');
  });

  it('should load member and measurements on init', () => {
    expect(memberServiceMock.getMember).toHaveBeenCalledWith('123');
    expect(progressServiceMock.getTimeSeries).toHaveBeenCalledWith('123');
  });

  it('should calculate diffs correctly', async () => {
    const diff: any = await new Promise(resolve => {
        component.diffs$?.subscribe(d => resolve(d));
    });
    
    expect(diff).toBeTruthy();
    if (diff) {
      expect(diff.weight).toBeCloseTo(-2);
      expect(diff.muscleMass).toBeCloseTo(2);
    }
  });

  it('should format diff correctly', () => {
    expect(component.formatDiff(2.5)).toBe('+ 2.5 ');
    expect(component.formatDiff(-1.5)).toBe('-1.5');
  });

  it('should return correct diff class', () => {
    expect(component.getDiffClass('weight', -1)).toBe('good');
    expect(component.getDiffClass('weight', 1)).toBe('bad');
    expect(component.getDiffClass('muscleMass', 1)).toBe('good');
    expect(component.getDiffClass('muscleMass', -1)).toBe('bad');
    expect(component.getDiffClass('weight', 0)).toBe('neutral');
  });
  it('should show loading spinner when no latest data', async () => {
    progressServiceMock.getTimeSeries.mockReturnValue(of([])); // No data
    fixture = TestBed.createComponent(ProgressDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    
    const spinner = fixture.nativeElement.querySelector('.loading-shade');
    expect(spinner).toBeTruthy();
  });
  it('should render positive diffs correctly (weight gain)', async () => {
    const gainMeasurements = [
        { ...mockMeasurements[0], weight: 80, bodyFat: 25 }, // Gained weight/fat (Bad)
        { ...mockMeasurements[1], weight: 70, bodyFat: 20 }
    ];
    progressServiceMock.getTimeSeries.mockReturnValue(of(gainMeasurements));
    fixture = TestBed.createComponent(ProgressDashboard);
    component = fixture.componentInstance;
    
    // Initial render
    fixture.detectChanges(); 
    await fixture.whenStable();
    
    // Update view
    fixture.detectChanges();

    const valueElements = fixture.nativeElement.querySelectorAll('.stat-content .value');
    expect(valueElements[0].textContent).toContain('80 kg');
    
    const diffElements = fixture.nativeElement.querySelectorAll('.stat-content .diff');
    // Check if class 'negative' is applied for bad changes (weight gain)
    expect(diffElements[0].classList.contains('negative')).toBe(true);
  });
});
