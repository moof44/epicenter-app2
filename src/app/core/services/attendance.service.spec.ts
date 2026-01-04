import { TestBed } from '@angular/core/testing';
import { AttendanceService } from './attendance.service';
import { Firestore } from '@angular/fire/firestore';
import { of } from 'rxjs';
// import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as firestorePkg from '@angular/fire/firestore';

vi.mock('@angular/fire/firestore', async () => {
    class Firestore {}
    return {
        Firestore,
        collection: vi.fn(),
        collectionData: vi.fn(),
        addDoc: vi.fn(),
        doc: vi.fn(() => ({ id: 'mockDocId' })),
        updateDoc: vi.fn(),
        query: vi.fn(),
        where: vi.fn(),
        orderBy: vi.fn(),
        getDocs: vi.fn(),
        Timestamp: {
            fromDate: (date: Date) => ({ seconds: date.getTime() / 1000 }),
            now: () => ({ seconds: Date.now() / 1000 })
        }
    };
});

describe('AttendanceService', () => {
    let service: AttendanceService;

    beforeEach(() => {
        vi.clearAllMocks();
        TestBed.configureTestingModule({
            providers: [
                AttendanceService,
                { provide: Firestore, useValue: {} }
            ]
        });
        service = TestBed.inject(AttendanceService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('checkIn should call addDoc', async () => {
        const member = { id: '1', name: 'John', gender: 'Male' } as any;
        vi.mocked(firestorePkg.addDoc).mockResolvedValue({ id: '123' } as any);
        vi.mocked(firestorePkg.getDocs).mockResolvedValue({
            docs: [],
            forEach: () => { }
        } as any); // Mock for getOccupiedLockers check

        await service.checkIn(member);
        expect(firestorePkg.addDoc).toHaveBeenCalled();
    });

    it('getActiveCheckIns should query specific status and sort by time', () => {
        const mockRecords = [
            { id: '1', status: 'Checked In', checkInTime: { seconds: 100 } },
            { id: '2', status: 'Checked In', checkInTime: { seconds: 200 } }
        ];
        vi.mocked(firestorePkg.collectionData).mockReturnValue(of(mockRecords) as any);

        service.getActiveCheckIns().subscribe(records => {
            expect(records.length).toBe(2);
            expect(records[0].id).toBe('2'); // Newer one first
            expect(records[1].id).toBe('1');
            expect(firestorePkg.where).toHaveBeenCalledWith('status', '==', 'Checked In');
        });
    });

    it('checkIn should throw if locker is occupied', async () => {
        const member = { id: '1', name: 'John', gender: 'Male' } as any;

        // Spy on getOccupiedLockers directly to isolate checkIn logic
        vi.spyOn(service, 'getOccupiedLockers').mockResolvedValue([5]);

        let error: any;
        try {
            await service.checkIn(member, 5);
        } catch (e) {
            error = e;
        }

        expect(error).toBeDefined();
        expect(error.message).toMatch(/already occupied/);
        expect(firestorePkg.addDoc).not.toHaveBeenCalled();
    });

    it('checkIn should allow if locker is free', async () => {
        const member = { id: '1', name: 'John', gender: 'Male' } as any;
        // Logic will return empty array (free)
        vi.spyOn(service, 'getOccupiedLockers').mockResolvedValue([]);
        vi.mocked(firestorePkg.addDoc).mockResolvedValue(undefined as any);

        await service.checkIn(member, 5);
        expect(firestorePkg.addDoc).toHaveBeenCalled();
    });

    it('getOccupiedLockers should ignore records without lockerNumber', async () => {
        const mockDocs = [{ data: () => ({}) }]; // No lockerNumber
        vi.mocked(firestorePkg.getDocs).mockResolvedValue({
            forEach: (fn: any) => mockDocs.forEach(fn)
        } as any);

        const lockers = await service.getOccupiedLockers('Male');
        expect(lockers.length).toBe(0);
    });

    it('getHistoryByDate should query by date and sort', async () => {
        const mockDocs = [
            { id: '1', data: () => ({ date: '2023-01-01', checkInTime: { seconds: 100 } }) },
            { id: '2', data: () => ({ date: '2023-01-01', checkInTime: { seconds: 200 } }) }
        ];
        vi.mocked(firestorePkg.getDocs).mockResolvedValue({ docs: mockDocs } as any);

        const result = await service.getHistoryByDate('2023-01-01');
        expect(result.length).toBe(2);
        expect(firestorePkg.where).toHaveBeenCalledWith('date', '==', '2023-01-01');
        expect(result[0].id).toBe('2');
    });

    it('getMemberAttendance should query by memberId and sort', async () => {
        const mockDocs = [
            { id: '1', data: () => ({ memberId: '1', checkInTime: { seconds: 100 } }) },
            { id: '2', data: () => ({ memberId: '1', checkInTime: { seconds: 200 } }) }
        ];
        vi.mocked(firestorePkg.getDocs).mockResolvedValue({ docs: mockDocs } as any);

        const result = await service.getMemberAttendance('1');
        expect(result.length).toBe(2);
        expect(firestorePkg.where).toHaveBeenCalledWith('memberId', '==', '1');
        expect(result[0].id).toBe('2'); // Sorted desc
        expect(result[1].id).toBe('1');
    });

    it('getOccupiedLockers should return used lockers', async () => {
        const mockDocs = [{ data: () => ({ lockerNumber: 5 }) }];
        vi.mocked(firestorePkg.getDocs).mockResolvedValue({
            forEach: (fn: any) => mockDocs.forEach(fn)
        } as any);

        const lockers = await service.getOccupiedLockers('Male');
        expect(lockers).toContain(5);
        expect(firestorePkg.where).toHaveBeenCalledWith('memberGender', '==', 'Male');
    });

    it('checkOut should update document', async () => {
        vi.mocked(firestorePkg.updateDoc).mockResolvedValue(undefined);

        await service.checkOut('1');
        expect(firestorePkg.doc).toHaveBeenCalledWith(expect.anything(), 'attendance', '1');
        expect(firestorePkg.updateDoc).toHaveBeenCalled();
    });

    it('should format date string correctly (private method)', () => {
        // Access private method to cover default parameter
        const dateStr = (service as any).getLocalDateString();
        expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
});
