import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActiveSessions } from './active-sessions';
import { AttendanceService } from '../../../../core/services/attendance.service';
import { of } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { vi } from 'vitest';

describe('ActiveSessions', () => {
    let component: ActiveSessions;
    let fixture: ComponentFixture<ActiveSessions>;
    let attendanceServiceMock: any;

    const mockRecords = [
        {
            id: '1',
            memberName: 'John',
            memberGender: 'Male',
            lockerNumber: 5,
            checkInTime: { seconds: 1234567890 },
            memberExpiration: { seconds: 2234567890 } // Future
        },
        {
            id: '2',
            memberName: 'Jane',
            memberGender: 'Female',
            lockerNumber: null,
            checkInTime: { seconds: 1234567800 },
            memberExpiration: null // No exp
        }
    ];

    beforeEach(async () => {
        attendanceServiceMock = {
            getActiveCheckIns: vi.fn(),
            checkOut: vi.fn().mockResolvedValue(undefined)
        };

        await TestBed.configureTestingModule({
            imports: [ActiveSessions],
            providers: [
                provideNoopAnimations(),
                { provide: AttendanceService, useValue: attendanceServiceMock }
            ]
        }).compileComponents();
    });

    it('should create', () => {
        attendanceServiceMock.getActiveCheckIns.mockReturnValue(of(mockRecords));
        fixture = TestBed.createComponent(ActiveSessions);
        component = fixture.componentInstance;
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    it('should show loading spinner when data is null', async () => {
        // Return null observable or null value to trigger *ngIf="!(activeSessions$ | async)"
        // Typically async pipe with null/undefined returns null.
        // We pass 'null' explicitly.
        attendanceServiceMock.getActiveCheckIns.mockReturnValue(of(null));
        fixture = TestBed.createComponent(ActiveSessions);
        fixture.detectChanges();
        await fixture.whenStable();

        const spinner = fixture.nativeElement.querySelector('.loading-shade');
        expect(spinner).toBeTruthy();
    });

    it('should show empty state when sessions are empty', async () => {
        attendanceServiceMock.getActiveCheckIns.mockReturnValue(of([]));
        fixture = TestBed.createComponent(ActiveSessions);
        fixture.detectChanges();
        await fixture.whenStable();

        const emptyState = fixture.nativeElement.querySelector('.empty-state');
        expect(emptyState).toBeTruthy();
        expect(emptyState.textContent).toContain('No members');
    });

    it('should render session rows with correct rendering logic', async () => {
        attendanceServiceMock.getActiveCheckIns.mockReturnValue(of(mockRecords));
        fixture = TestBed.createComponent(ActiveSessions);
        fixture.detectChanges();
        await fixture.whenStable();

        const rows = fixture.nativeElement.querySelectorAll('tr[mat-row]');
        expect(rows.length).toBe(2);

        // Row 1: Has locker (logic check)
        expect(rows[0].textContent).toContain('#5'); // Locker populated
        // Row 2: No locker (-)
        expect(rows[1].textContent).toContain('-'); // Locker fallback

        // Expiration logic
        // Row 2 has no expiration
        expect(rows[1].textContent).toContain('-'); 
    });

    it('should check out a member via button click', async () => {
        attendanceServiceMock.getActiveCheckIns.mockReturnValue(of(mockRecords));
        fixture = TestBed.createComponent(ActiveSessions);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();

        const buttons = fixture.nativeElement.querySelectorAll('button');
        // First row's button
        buttons[0].click();
        
        expect(attendanceServiceMock.checkOut).toHaveBeenCalledWith('1');
    });

    it('should not check out if no id', async () => {
        attendanceServiceMock.getActiveCheckIns.mockReturnValue(of(mockRecords));
        fixture = TestBed.createComponent(ActiveSessions);
        component = fixture.componentInstance;
        fixture.detectChanges();

        await component.checkOut({} as any);
        expect(attendanceServiceMock.checkOut).not.toHaveBeenCalled();
    });

    it('should calculate expiration correctly', () => {
        attendanceServiceMock.getActiveCheckIns.mockReturnValue(of([]));
        fixture = TestBed.createComponent(ActiveSessions);
        component = fixture.componentInstance;
        
        expect(component.isExpired(null)).toBe(false);

        const future = { seconds: (Date.now() / 1000) + 10000 };
        expect(component.isExpired(future)).toBe(false);

        const past = { seconds: (Date.now() / 1000) - 100000 };
        expect(component.isExpired(past)).toBe(true);
    });
});
