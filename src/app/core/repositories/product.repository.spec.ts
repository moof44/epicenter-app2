import { TestBed } from '@angular/core/testing';
import { ProductRepository } from './product.repository';
import { AppIndexedDbService } from '../services/dexie/app-indexeddb.service';
import { Firestore } from '@angular/fire/firestore';
import { Product } from '../models/store.model';

describe('ProductRepository', () => {
    let repository: ProductRepository;
    let mockProductsTable: any;
    let mockDbService: any;
    let mockFirestore: any;

    beforeEach(() => {
        mockProductsTable = {
            toArray: jasmine.createSpy('toArray').and.returnValue(Promise.resolve([])),
            bulkPut: jasmine.createSpy('bulkPut').and.returnValue(Promise.resolve()),
            put: jasmine.createSpy('put').and.returnValue(Promise.resolve()),
            delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve()),
            clear: jasmine.createSpy('clear').and.returnValue(Promise.resolve()),
        };

        mockDbService = {
            isBrowser: true,
            db: { products: mockProductsTable },
            products: mockProductsTable,
        };

        mockFirestore = {};

        TestBed.configureTestingModule({
            providers: [
                ProductRepository,
                { provide: AppIndexedDbService, useValue: mockDbService },
                { provide: Firestore, useValue: mockFirestore },
            ],
        });

        repository = TestBed.inject(ProductRepository);
    });

    it('should be created', () => {
        expect(repository).toBeTruthy();
    });

    it('should save product locally to Dexie', async () => {
        const testProduct: Product = {
            id: 'prod1',
            name: 'Whey Protein',
            price: 1500,
            stock: 10,
            category: 'Supplements',
            type: 'RETAIL',
            unit: 'Item',
            minStockLevel: 2,
        };
        await repository.saveLocal(testProduct);
        expect(mockProductsTable.put).toHaveBeenCalledWith(testProduct);
    });

    it('should remove product locally from Dexie', async () => {
        await repository.removeLocal('prod1');
        expect(mockProductsTable.delete).toHaveBeenCalledWith('prod1');
    });

    it('should clear local Dexie products cache', async () => {
        await repository.clearLocal();
        expect(mockProductsTable.clear).toHaveBeenCalled();
    });
});
