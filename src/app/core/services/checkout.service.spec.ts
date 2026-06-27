import { describe, it, expect } from 'vitest';
import { cleanUndefined } from './checkout.service';

// Mock Timestamp class to simulate Firestore Timestamp objects
class MockTimestamp {
    constructor(public seconds: number, public nanoseconds: number) {}
    toDate() {
        return new Date(this.seconds * 1000);
    }
}

describe('cleanUndefined Sanitizer Unit Tests', () => {
    it('should return primitive values unchanged', () => {
        expect(cleanUndefined(5)).toBe(5);
        expect(cleanUndefined('test')).toBe('test');
        expect(cleanUndefined(true)).toBe(true);
        expect(cleanUndefined(null)).toBeNull();
        expect(cleanUndefined(undefined)).toBeUndefined();
    });

    it('should remove undefined properties from plain objects', () => {
        const input = {
            name: 'Gym Member',
            age: 25,
            email: undefined,
            address: {
                city: 'Manila',
                zip: undefined
            }
        };

        const expected = {
            name: 'Gym Member',
            age: 25,
            address: {
                city: 'Manila'
            }
        };

        expect(cleanUndefined(input)).toEqual(expected);
    });

    it('should sanitize elements inside arrays', () => {
        const input = [
            { id: 1, name: 'Item 1', notes: undefined },
            { id: 2, name: 'Item 2', notes: 'Valid note' }
        ];

        const expected = [
            { id: 1, name: 'Item 1' },
            { id: 2, name: 'Item 2', notes: 'Valid note' }
        ];

        expect(cleanUndefined(input)).toEqual(expected);
    });

    it('should preserve Date instances and not flatten them into empty objects', () => {
        const testDate = new Date('2026-06-24T16:00:00Z');
        const input = {
            id: 'TX123',
            created: testDate,
            description: undefined
        };

        const result = cleanUndefined(input);

        expect(result.created).toBeInstanceOf(Date);
        expect(result.created.getTime()).toBe(testDate.getTime());
        expect(result).toEqual({
            id: 'TX123',
            created: testDate
        });
    });

    it('should preserve custom class instances like MockTimestamp', () => {
        const testTimestamp = new MockTimestamp(1782288000, 0); // 2026-06-24
        const input = {
            id: 'LOG456',
            timestamp: testTimestamp,
            details: undefined
        };

        const result = cleanUndefined(input);

        expect(result.timestamp).toBeInstanceOf(MockTimestamp);
        expect(result.timestamp.seconds).toBe(1782288000);
        expect(result).toEqual({
            id: 'LOG456',
            timestamp: testTimestamp
        });
    });

    it('should handle complex nested structures correctly', () => {
        const testDate = new Date();
        const testTimestamp = new MockTimestamp(12345, 678);
        const input = {
            transactions: [
                {
                    id: 'tx_1',
                    date: testDate,
                    meta: undefined
                }
            ],
            systemLogs: {
                active: true,
                timestamp: testTimestamp,
                items: [1, 2, undefined]
            }
        };

        const expected = {
            transactions: [
                {
                    id: 'tx_1',
                    date: testDate
                }
            ],
            systemLogs: {
                active: true,
                timestamp: testTimestamp,
                items: [1, 2, undefined]
            }
        };

        expect(cleanUndefined(input)).toEqual(expected);
    });
});
