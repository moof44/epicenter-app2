import { TestBed } from '@angular/core/testing';
import { ProgressService } from './progress.service';
import { Firestore } from '@angular/fire/firestore';
import { of } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as firestorePkg from '@angular/fire/firestore';

vi.mock('@angular/fire/firestore', async (importOriginal) => {
    const actual = await importOriginal<typeof firestorePkg>();
    return {
        ...actual,
        collection: vi.fn(),
        collectionData: vi.fn(),
        addDoc: vi.fn(),
        query: vi.fn(),
        orderBy: vi.fn()
    };
});

describe('ProgressService', () => {
    let service: ProgressService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                ProgressService,
                { provide: Firestore, useValue: {} }
            ]
        });
        service = TestBed.inject(ProgressService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('addEntry should call addDoc', async () => {
        const measurement = { weight: 70, date: '2023-01-01' } as any;
        vi.mocked(firestorePkg.addDoc).mockResolvedValue({ id: '123' } as any);

        await service.addEntry('member1', measurement);
        expect(firestorePkg.addDoc).toHaveBeenCalled();
    });

    it('getTimeSeries should query measurements', () => {
        const mockData = [{ id: '1', weight: 80 }];
        vi.mocked(firestorePkg.collectionData).mockReturnValue(of(mockData) as any);

        service.getTimeSeries('member1').subscribe(data => {
            expect(data).toEqual(mockData);
            expect(firestorePkg.orderBy).toHaveBeenCalledWith('date', 'desc');
            expect(firestorePkg.collection).toHaveBeenCalledWith(expect.anything(), 'members/member1/measurements');
        });
    });
});
