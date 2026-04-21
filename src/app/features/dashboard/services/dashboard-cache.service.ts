import { Injectable } from '@angular/core';
import { toLocalDateStr } from '../../../core/utils/date.utils';

interface CachedEntry<T> {
    data: T;
    dateKey: string;
}

@Injectable({
    providedIn: 'root',
})
export class DashboardCacheService {
    private cache = new Map<string, CachedEntry<any>>();

    private get todayKey(): string {
        return toLocalDateStr(new Date());
    }

    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry || entry.dateKey !== this.todayKey) return null;
        return entry.data as T;
    }

    set<T>(key: string, data: T): void {
        this.cache.set(key, { data, dateKey: this.todayKey });
    }

    invalidate(key: string): void {
        this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }
}
