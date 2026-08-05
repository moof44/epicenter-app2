import { TestBed } from '@angular/core/testing';
import { MemberRepository } from './member.repository';
import { AppIndexedDbService } from '../services/dexie/app-indexeddb.service';
import { Firestore } from '@angular/fire/firestore';

describe('MemberRepository', () => {
    let repository: MemberRepository;
    let mockMembersTable: any;
    let mockDbService: any;
    let mockFirestore: any;

    beforeEach(() => {
        mockMembersTable = {
            toArray: jasmine.createSpy('toArray').and.returnValue(Promise.resolve([])),
            bulkPut: jasmine.createSpy('bulkPut').and.returnValue(Promise.resolve()),
            put: jasmine.createSpy('put').and.returnValue(Promise.resolve()),
            delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve()),
            clear: jasmine.createSpy('clear').and.returnValue(Promise.resolve()),
        };

        mockDbService = {
            isBrowser: true,
            db: { members: mockMembersTable },
            members: mockMembersTable,
        };

        mockFirestore = {};

        TestBed.configureTestingModule({
            providers: [
                MemberRepository,
                { provide: AppIndexedDbService, useValue: mockDbService },
                { provide: Firestore, useValue: mockFirestore },
            ],
        });

        repository = TestBed.inject(MemberRepository);
    });

    it('should be created', () => {
        expect(repository).toBeTruthy();
    });

    it('should save member locally to Dexie', async () => {
        const testMember = {
            id: 'mem1',
            name: 'John Doe',
            address: '123 St',
            contactNumber: '123',
            gender: 'Male' as const,
            birthday: new Date(),
            goal: 'Fitness',
            membershipStatus: 'Active' as const,
        };
        await repository.saveLocal(testMember);
        expect(mockMembersTable.put).toHaveBeenCalledWith(testMember);
    });

    it('should remove member locally from Dexie', async () => {
        await repository.removeLocal('mem1');
        expect(mockMembersTable.delete).toHaveBeenCalledWith('mem1');
    });

    it('should clear local Dexie cache', async () => {
        await repository.clearLocal();
        expect(mockMembersTable.clear).toHaveBeenCalled();
    });
});

