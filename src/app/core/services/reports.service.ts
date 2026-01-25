import { Injectable, inject } from '@angular/core';
import { StoreService } from './store.service';
import { AttendanceService } from './attendance.service';
import { firstValueFrom } from 'rxjs';
import { AttendanceRecord } from '../models/attendance.model';
import { Transaction } from '../models/store.model';

@Injectable({
    providedIn: 'root'
})
export class ReportsService {
    private storeService = inject(StoreService);
    private attendanceService = inject(AttendanceService);

    /**
     * 1. Volume or number of gym goers every day with time peak highlight
     */
    async getVolumeAnalytics(startDate: Date, endDate: Date) {
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        const records = await this.attendanceService.getAttendanceRange(startStr, endStr);

        // Group by Day (Unique visits per member)
        const dailyCounts = new Map<string, number>();
        const dailyVisitors = new Set<string>(); // key: date_memberId

        // Group by Time of Day (Hour) to find peaks (Total foot traffic)
        const hourlyCounts = new Map<string, number>(); // "08:00", "09:00" etc

        records.forEach(record => {
            // Daily Volume (Unique Visits)
            const day = record.date;
            const visitorKey = `${day}_${record.memberId}`;

            if (!dailyVisitors.has(visitorKey)) {
                dailyVisitors.add(visitorKey);
                dailyCounts.set(day, (dailyCounts.get(day) || 0) + 1);
            }

            // Hourly (Total Traffic - keep all check-ins)
            if (record.checkInTime) {
                let date: Date;
                if (record.checkInTime.toDate) {
                    date = record.checkInTime.toDate();
                } else {
                    date = new Date(record.checkInTime.seconds * 1000);
                }

                const hour = date.getHours().toString().padStart(2, '0') + ':00';
                hourlyCounts.set(hour, (hourlyCounts.get(hour) || 0) + 1);
            }
        });

        const series = Array.from(dailyCounts.entries())
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));

        const peakHours = Array.from(hourlyCounts.entries())
            .map(([hour, count]) => ({ hour, count }))
            .sort((a, b) => b.count - a.count);

        return {
            dailyVolume: series,
            peakHours: peakHours.slice(0, 5) // Top 5 crowded hours
        };
    }

    /**
     * 2. Amount of sales per day
     * 3. Sales per person per day (transactions list essentially)
     * 4. Sales of each product
     */
    async getSalesAnalytics(startDate: Date, endDate: Date) {
        // We can use getTransactions from store service
        const transactions = await firstValueFrom(this.storeService.getTransactions({
            startDate,
            endDate,
            limit: 2000 // Reasonable limit for a report range
        }));

        // 2. Sales per Day
        const salesPerDay = new Map<string, number>();

        // 3. Sales per Person
        const salesPerPerson = new Map<string, { name: string, total: number, count: number }>();

        // 4. Sales per Product
        const productSales = new Map<string, { name: string, quantity: number, revenue: number }>();

        // Staff Performance
        const staffPerformance = new Map<string, number>();

        transactions.forEach(tx => {
            // Date
            const date = tx.date instanceof Date ? tx.date : (tx.date as any).toDate();
            const dateStr = date.toISOString().split('T')[0];
            salesPerDay.set(dateStr, (salesPerDay.get(dateStr) || 0) + tx.totalAmount);

            // Person
            const memberId = tx.memberId || 'WALK_IN';
            const memberName = tx.memberName || 'Walk-in';
            const personEntry = salesPerPerson.get(memberId) || { name: memberName, total: 0, count: 0 };
            personEntry.total += tx.totalAmount;
            personEntry.count += 1;
            salesPerPerson.set(memberId, personEntry);

            // Staff
            if (tx.staffName) {
                staffPerformance.set(tx.staffName, (staffPerformance.get(tx.staffName) || 0) + tx.totalAmount);
            }

            // Products
            tx.items.forEach(item => {
                const prodEntry = productSales.get(item.productId) || { name: item.productName, quantity: 0, revenue: 0 };
                prodEntry.quantity += item.quantity;
                prodEntry.revenue += item.subtotal;
                productSales.set(item.productId, prodEntry);
            });
        });

        return {
            dailySales: Array.from(salesPerDay.entries()).map(([date, total]) => ({ date, total })).sort((a, b) => a.date.localeCompare(b.date)),
            topSpenders: Array.from(salesPerPerson.values()).sort((a, b) => b.total - a.total).slice(0, 10),
            topProducts: Array.from(productSales.values()).sort((a, b) => b.quantity - a.quantity),
            staffPerformance: Array.from(staffPerformance.entries()).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total)
        };
    }

    /**
     * 5. Member's Attendance (Top Gym Goers)
     */
    async getTopAttendees(startDate: Date, endDate: Date) {
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        const records = await this.attendanceService.getAttendanceRange(startStr, endStr);

        // Count unique days visited per member
        const memberCounts = new Map<string, { name: string, count: number, lastVisit: any }>();
        const dailyVisits = new Set<string>(); // key: date_memberId

        records.forEach(r => {
            const visitKey = `${r.date}_${r.memberId}`;
            const entry = memberCounts.get(r.memberId) || { name: r.memberName, count: 0, lastVisit: null };

            // Only increment count if this is the first time we see this member TODAY
            if (!dailyVisits.has(visitKey)) {
                dailyVisits.add(visitKey);
                entry.count++;
            }

            // Always update last visit timestamp to the latest check-in
            if (!entry.lastVisit || (r.checkInTime.seconds > entry.lastVisit.seconds)) {
                entry.lastVisit = r.checkInTime;
            }
            memberCounts.set(r.memberId, entry);
        });

        return Array.from(memberCounts.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }
}
