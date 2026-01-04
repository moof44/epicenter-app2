import { TestBed } from '@angular/core/testing';
import { MemberService } from './member.service';
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
        doc: vi.fn(() => ({ id: 'mockDocId' })),
        updateDoc: vi.fn(),
        query: vi.fn(),
        orderBy: vi.fn(),
        docData: vi.fn()
    };
});

describe('MemberService', () => {
    let service: MemberService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                MemberService,
                { provide: Firestore, useValue: {} }
            ]
        });
        service = TestBed.inject(MemberService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('getMembers should call collectionData', () => {
        const mockMembers = [{ id: '1', name: 'John' }];
        vi.mocked(firestorePkg.collectionData).mockReturnValue(of(mockMembers) as any);

        service.getMembers().subscribe(members => {
            expect(members).toEqual(mockMembers);
            expect(firestorePkg.collection).toHaveBeenCalled();
        });
    });

    it('addMember should call addDoc', async () => {
        const member = { name: 'Doe', membershipStatus: 'Active', gender: 'Male' } as any;
        vi.mocked(firestorePkg.addDoc).mockResolvedValue({ id: '123' } as any);

        await service.addMember(member);
        expect(firestorePkg.addDoc).toHaveBeenCalled();
    });

    it('getMember should call docData', () => {
        const mockMember = { id: '1', name: 'John' };
        vi.mocked(firestorePkg.docData).mockReturnValue(of(mockMember) as any);

        service.getMember('1').subscribe(member => {
            expect(member).toEqual(mockMember);
            expect(firestorePkg.doc).toHaveBeenCalledWith(expect.anything(), 'members', '1');
            expect(firestorePkg.docData).toHaveBeenCalled();
        });
    });

    it('updateMember should call updateDoc', async () => {
        const updates = { name: 'Jane' };
        vi.mocked(firestorePkg.updateDoc).mockResolvedValue(undefined);

        await service.updateMember('1', updates);
        expect(firestorePkg.doc).toHaveBeenCalledWith(expect.anything(), 'members', '1');
        expect(firestorePkg.updateDoc).toHaveBeenCalledWith(expect.anything(), updates);
    });

    it('setInactive should call updateDoc with Inactive status', async () => {
        vi.mocked(firestorePkg.updateDoc).mockResolvedValue(undefined);

        await service.setInactive('1');
        expect(firestorePkg.doc).toHaveBeenCalledWith(expect.anything(), 'members', '1');
        expect(firestorePkg.updateDoc).toHaveBeenCalledWith(expect.anything(), { membershipStatus: 'Inactive' });
    });
});
