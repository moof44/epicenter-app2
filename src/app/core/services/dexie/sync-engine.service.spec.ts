import { TestBed } from '@angular/core';
import { SyncEngineService } from './sync-engine.service';
import { OutboxQueueService } from './outbox-queue.service';

describe('SyncEngineService', () => {
    let service: SyncEngineService;
    let mockOutboxQueueService: any;

    beforeEach(() => {
        mockOutboxQueueService = {
            getPendingItems: jasmine.createSpy('getPendingItems').and.returnValue(Promise.resolve([])),
            markProcessing: jasmine.createSpy('markProcessing').and.returnValue(Promise.resolve()),
            markSuccess: jasmine.createSpy('markSuccess').and.returnValue(Promise.resolve()),
            markFailed: jasmine.createSpy('markFailed').and.returnValue(Promise.resolve()),
        };

        TestBed.configureTestingModule({
            providers: [
                SyncEngineService,
                { provide: OutboxQueueService, useValue: mockOutboxQueueService },
            ],
        });

        service = TestBed.inject(SyncEngineService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should track online status observable', (done) => {
        service.isOnline$.subscribe((isOnline) => {
            expect(typeof isOnline).toBe('boolean');
            done();
        });
    });

    it('should flush empty outbox queue cleanly', async () => {
        const result = await service.flushOutboxQueue();
        expect(result).toEqual({ processed: 0, failed: 0 });
    });
});
