import { TestBed } from '@angular/core/testing';
import { AppIndexedDbService } from './app-indexeddb.service';

describe('AppIndexedDbService', () => {
    let service: AppIndexedDbService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [AppIndexedDbService],
        });
        service = TestBed.inject(AppIndexedDbService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should have members table defined', () => {
        expect(service.members).toBeTruthy();
        expect(service.members.name).toBe('members');
    });
});
