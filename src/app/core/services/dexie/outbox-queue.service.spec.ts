import { TestBed } from '@angular/core';
import { OutboxQueueService } from './outbox-queue.service';
import { AppIndexedDbService } from './app-indexeddb.service';

describe('OutboxQueueService', () => {
    let service: OutboxQueueService;
    let mockOutboxTable: any;
    let mockDbService: any;

    beforeEach(() => {
        mockOutboxTable = {
            add: jasmine.createSpy('add').and.returnValue(Promise.resolve(1)),
            where: jasmine.createSpy('where').and.returnValue({
                equals: jasmine.createSpy('equals').and.returnValue({
                    sortBy: jasmine.createSpy('sortBy').and.returnValue(Promise.resolve([])),
                }),
            }),
            update: jasmine.createSpy('update').and.returnValue(Promise.resolve()),
            delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve()),
            get: jasmine.createSpy('get').and.returnValue(Promise.resolve({ id: 1, retryCount: 0 })),
            clear: jasmine.createSpy('clear').and.returnValue(Promise.resolve()),
        };

        mockDbService = {
            isBrowser: true,
            db: { outboxQueue: mockOutboxTable },
            outboxQueue: mockOutboxTable,
        };

        TestBed.configureTestingModule({
            providers: [
                OutboxQueueService,
                { provide: AppIndexedDbService, useValue: mockDbService },
            ],
        });

        service = TestBed.inject(OutboxQueueService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should add item to outbox queue', async () => {
        const id = await service.addToOutbox({
            clientTxId: 'tx_123',
            type: 'POS_SALE',
            payload: { amount: 100 },
        });

        expect(id).toBe(1);
        expect(mockOutboxTable.add).toHaveBeenCalled();
    });

    it('should mark item as processing', async () => {
        await service.markProcessing(1);
        expect(mockOutboxTable.update).toHaveBeenCalledWith(1, { status: 'PROCESSING' });
    });

    it('should mark item as success (delete)', async () => {
        await service.markSuccess(1);
        expect(mockOutboxTable.delete).toHaveBeenCalledWith(1);
    });

    it('should mark item as failed and increment retryCount', async () => {
        await service.markFailed(1, 'Network Error');
        expect(mockOutboxTable.update).toHaveBeenCalledWith(1, {
            status: 'FAILED',
            retryCount: 1,
            lastError: 'Network Error',
        });
    });
});
