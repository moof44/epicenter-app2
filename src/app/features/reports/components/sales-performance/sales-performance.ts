import { Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule, ChartComponent, ApexAxisChartSeries, ApexChart, ApexXAxis, ApexYAxis, ApexDataLabels, ApexTitleSubtitle, ApexStroke, ApexMarkers, ApexLegend, ApexTooltip } from "ng-apexcharts";

export interface ChartOptions {
    series: ApexAxisChartSeries;
    chart: ApexChart;
    xaxis: ApexXAxis;
    yaxis: ApexYAxis | ApexYAxis[];
    title: ApexTitleSubtitle;
    labels: string[];
    stroke: ApexStroke;
    dataLabels: ApexDataLabels;
    markers: ApexMarkers;
    tooltip: ApexTooltip;
    legend: ApexLegend;
    colors: string[];
}

@Component({
    selector: 'app-sales-performance',
    standalone: true,
    imports: [CommonModule, NgApexchartsModule],
    templateUrl: './sales-performance.html',
    styleUrl: './sales-performance.css'
})
export class SalesPerformanceComponent implements OnChanges {
    @ViewChild("chart") chart: ChartComponent | undefined;
    @Input() data: { date: string, total: number }[] = [];
    @Input() monthlyQuota = 0;

    public chartOptions: Partial<ChartOptions>;

    constructor() {
        this.chartOptions = {
            series: [],
            chart: {
                height: 350,
                type: "line",
                background: 'transparent',
                toolbar: { show: false },
                fontFamily: 'Roboto, sans-serif'
            },
            stroke: {
                width: [0, 3], // Column has 0, Line has 3
                curve: 'smooth',
                colors: ['#3f51b5', '#ef4444'] // Indigo (Sales), Red (Target)
            },
            title: {
                text: "Sales vs Target",
                style: { color: '#1e293b', fontSize: '18px', fontWeight: '600' }
            },
            dataLabels: {
                enabled: true,
                enabledOnSeries: [0], // Show values on bars
                style: { colors: ['#fff'] }
            },
            labels: [],
            xaxis: {
                type: 'datetime',
                labels: {
                    style: { colors: '#64748b' },
                    datetimeFormatter: {
                        year: 'yyyy',
                        month: 'MMM \'yy',
                        day: 'MM-dd-yyyy',
                        hour: 'HH:mm'
                    }
                },
                tooltip: { enabled: false }, // Disable x-axis tooltip
                axisBorder: { show: false },
                axisTicks: { show: false }
            },
            yaxis: [
                {
                    title: { text: 'Daily Sales', style: { color: '#64748b' } },
                    labels: { style: { colors: '#64748b' }, formatter: (val) => val.toFixed(0) }
                }
            ],
            legend: {
                labels: { colors: '#1e293b' }
            },
            tooltip: {
                theme: 'light',
                x: { format: 'MM-dd-yyyy' } // Tooltip Date Format
            },
            colors: ['#3f51b5', '#ef4444']
        };
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['data'] && this.data) {
            this.updateChart();
        }
    }

    updateChart() {
        if (!this.data) return;

        const daysInMonth = 30; // Approximation or derived from date range
        const dailyTarget = this.monthlyQuota > 0 ? this.monthlyQuota / daysInMonth : 0;

        const targetData = this.data.map(() => dailyTarget);

        this.chartOptions.series = [
            {
                name: "Daily Sales",
                type: "column",
                data: this.data.map(d => d.total)
            },
            {
                name: "Daily Target",
                type: "line",
                data: targetData
            }
        ];

        this.chartOptions.labels = this.data.map(d => d.date);
        this.chartOptions.colors = ['#3f51b5', '#ef4444'];
    }
}
