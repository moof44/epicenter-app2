import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DiscountService } from './discount.service';
import { Firestore } from '@angular/fire/firestore';
import { DiscountRule } from '../models/discount.model';

const rulesSubject = new Subject<DiscountRule[]>();

vi.mock('@angular/fire/firestore', () => {
    class MockTimestamp {
        constructor(public seconds: number, public nanoseconds: number) {}
        toDate() {
            return new Date(this.seconds * 1000);
        }
        static fromDate(d: Date) {
            return new MockTimestamp(Math.floor(d.getTime() / 1000), 0);
        }
    }

    return {
        Firestore: class {},
        collection: vi.fn(() => ({
            withConverter: () => ({})
        })),
        collectionData: vi.fn(() => rulesSubject.asObservable()),
        query: vi.fn(),
        where: vi.fn(),
        Timestamp: MockTimestamp,
        doc: vi.fn(),
        addDoc: vi.fn(),
        updateDoc: vi.fn(),
        deleteDoc: vi.fn()
    };
});

describe('DiscountService Unit Tests (Fake System Time)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        TestBed.configureTestingModule({
            providers: [
                { provide: Firestore, useValue: {} }
            ]
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should NOT apply the Founding Member price freeze on June 24, 2026 (before campaign September 1 start)', () => {
        vi.setSystemTime(new Date('2026-06-24T12:00:00Z'));
        const service = TestBed.inject(DiscountService);

        rulesSubject.next([
            {
                id: 'founding_member_freeze',
                name: 'Founding Member Price Freeze',
                active: true,
                triggerType: 'TAG_BASED',
                targetTags: ['FOUNDER'],
                scope: 'SPECIFIC_PRODUCTS',
                applicableProductIds: ['Qfi33eVnbxN6kIPRTGbT'],
                calculationType: 'PRICE_LOCK',
                priceLocks: {
                    'Qfi33eVnbxN6kIPRTGbT': 700
                },
                startDate: new Date('2026-09-01T00:00:00Z'),
                priority: 10
            }
        ]);

        const item = {
            productId: 'Qfi33eVnbxN6kIPRTGbT',
            productName: 'Monthly Membership',
            originalPrice: 700,
            quantity: 1
        };

        const result = service.evaluateItemDiscount(item, 'MEMBERSHIP', ['FOUNDER']);
        // Campaign starts Sept 1, so evaluating on June 24 returns no discount rule active
        expect(result).toBeNull();
    });

    it('should apply the price freeze lock for a FOUNDER member on September 15, 2026 (during campaign active dates)', () => {
        vi.setSystemTime(new Date('2026-09-15T12:00:00Z'));
        const service = TestBed.inject(DiscountService);

        rulesSubject.next([
            {
                id: 'founding_member_freeze',
                name: 'Founding Member Price Freeze',
                active: true,
                triggerType: 'TAG_BASED',
                targetTags: ['FOUNDER'],
                scope: 'SPECIFIC_PRODUCTS',
                applicableProductIds: ['Qfi33eVnbxN6kIPRTGbT'],
                calculationType: 'PRICE_LOCK',
                priceLocks: {
                    'Qfi33eVnbxN6kIPRTGbT': 700
                },
                startDate: new Date('2026-09-01T00:00:00Z'),
                priority: 10
            }
        ]);

        const item = {
            productId: 'Qfi33eVnbxN6kIPRTGbT',
            productName: 'Monthly Membership',
            originalPrice: 850, // Price hiked from 700 to 850
            quantity: 1
        };

        const result = service.evaluateItemDiscount(item, 'MEMBERSHIP', ['FOUNDER']);
        expect(result).not.toBeNull();
        expect(result!.newPrice).toBe(700);
        expect(result!.discountAmount).toBe(150);
        expect(result!.ruleName).toBe('Founding Member Price Freeze');
    });

    it('should NOT apply the price freeze on September 15, 2026 to a member who does NOT have the FOUNDER badge', () => {
        vi.setSystemTime(new Date('2026-09-15T12:00:00Z'));
        const service = TestBed.inject(DiscountService);

        rulesSubject.next([
            {
                id: 'founding_member_freeze',
                name: 'Founding Member Price Freeze',
                active: true,
                triggerType: 'TAG_BASED',
                targetTags: ['FOUNDER'],
                scope: 'SPECIFIC_PRODUCTS',
                applicableProductIds: ['Qfi33eVnbxN6kIPRTGbT'],
                calculationType: 'PRICE_LOCK',
                priceLocks: {
                    'Qfi33eVnbxN6kIPRTGbT': 700
                },
                startDate: new Date('2026-09-01T00:00:00Z'),
                priority: 10
            }
        ]);

        const item = {
            productId: 'Qfi33eVnbxN6kIPRTGbT',
            productName: 'Monthly Membership',
            originalPrice: 850,
            quantity: 1
        };

        const result = service.evaluateItemDiscount(item, 'MEMBERSHIP', []); // Empty member badges
        expect(result).toBeNull();
    });

    it('should select the higher priority discount rule even if the lower priority one yields a higher amount', () => {
        vi.setSystemTime(new Date('2026-09-15T12:00:00Z'));
        const service = TestBed.inject(DiscountService);

        rulesSubject.next([
            {
                id: 'bulk_discount',
                name: 'Bulk 30% Off',
                active: true,
                triggerType: 'AUTOMATIC',
                scope: 'ALL_PRODUCTS',
                calculationType: 'PERCENTAGE',
                discountValue: 30,
                priority: 5
            },
            {
                id: 'founding_member_freeze',
                name: 'Founding Member Price Freeze',
                active: true,
                triggerType: 'TAG_BASED',
                targetTags: ['FOUNDER'],
                scope: 'SPECIFIC_PRODUCTS',
                applicableProductIds: ['Qfi33eVnbxN6kIPRTGbT'],
                calculationType: 'PRICE_LOCK',
                priceLocks: {
                    'Qfi33eVnbxN6kIPRTGbT': 700
                },
                startDate: new Date('2026-09-01T00:00:00Z'),
                priority: 10
            }
        ]);

        const result = service.evaluateItemDiscount(
            { productId: 'Qfi33eVnbxN6kIPRTGbT', productName: 'Monthly Membership', originalPrice: 900, quantity: 1 },
            'MEMBERSHIP',
            ['FOUNDER']
        );

        // Bulk 30% Off saves 270 (final price 630).
        // Founding Member Freeze locks to 700, saving 200.
        // Because Founding Member Freeze has higher priority (10 > 5), it should be selected.
        expect(result).not.toBeNull();
        expect(result!.ruleId).toBe('founding_member_freeze');
        expect(result!.newPrice).toBe(700);
        expect(result!.discountAmount).toBe(200);
    });
});
