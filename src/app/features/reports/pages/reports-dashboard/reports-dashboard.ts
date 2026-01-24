import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatNativeDateModule } from '@angular/material/core';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { ReportsService } from '../../../../core/services/reports.service';
import { SettingsService } from '../../../../core/services/settings.service';
import { VolumeChartComponent } from '../../components/volume-chart/volume-chart';
import { SalesPerformanceComponent } from '../../components/sales-performance/sales-performance';
import { StaffSalesComponent } from '../../components/staff-sales/staff-sales';
import { ProductBreakdownComponent } from '../../components/product-breakdown/product-breakdown';
import { MemberAttendanceComponent } from '../../components/member-attendance/member-attendance';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';

@Component({
    selector: 'app-reports-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        MatDatepickerModule,
        MatFormFieldModule,
        MatNativeDateModule,
        FormsModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatIconModule,
        VolumeChartComponent,
        SalesPerformanceComponent,
        StaffSalesComponent,
        ProductBreakdownComponent,
        MemberAttendanceComponent
    ],
    templateUrl: './reports-dashboard.html',
    styleUrl: './reports-dashboard.css'
})
export class ReportsDashboardComponent {
    private reportsService = inject(ReportsService);
    private settingsService = inject(SettingsService);

    range = new FormGroup({
        start: new FormControl<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
        end: new FormControl<Date>(new Date())
    });

    // Data
    volumeData: { date: string, count: number }[] = [];
    peakHours: { hour: string, count: number }[] = [];

    salesData: { date: string, total: number }[] = [];
    monthlyQuota = 0;

    staffData: { name: string, total: number }[] = [];
    productData: { name: string, quantity: number, revenue: number }[] = [];
    memberData: { name: string, count: number }[] = [];

    constructor() {
        this.refreshCharts();
    }

    async refreshCharts() {
        if (!this.range.value.start || !this.range.value.end) return;
        const start = this.range.value.start;
        const end = this.range.value.end;

        try {
            // Parallel fetch for speed
            // Note: getTopAttendees (Goal 5) is missing in ReportsService from previous step? 
            // I checked ReportsService creation step, it DOES include getTopAttendees.

            const [volume, sales, attendees, settings] = await Promise.all([
                this.reportsService.getVolumeAnalytics(start, end),
                this.reportsService.getSalesAnalytics(start, end),
                this.reportsService.getTopAttendees(start, end),
                firstValueFrom(this.settingsService.getSettings())
            ]);

            this.volumeData = volume.dailyVolume;
            this.peakHours = volume.peakHours;

            this.salesData = sales.dailySales;
            this.staffData = sales.staffPerformance;
            this.productData = sales.topProducts;

            this.memberData = attendees;
            this.monthlyQuota = settings.monthlyQuota || 0;

        } catch (error) {
            console.error('Error loading reports:', error);
        }
    }
}
