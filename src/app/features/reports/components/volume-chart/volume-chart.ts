import { Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule, ChartComponent, ApexAxisChartSeries, ApexChart, ApexXAxis, ApexDataLabels, ApexTitleSubtitle, ApexStroke, ApexYAxis, ApexFill, ApexGrid, ApexTooltip } from "ng-apexcharts";

export interface ChartOptions {
    series: ApexAxisChartSeries;
    chart: ApexChart;
    xaxis: ApexXAxis;
    yaxis: ApexYAxis;
    title: ApexTitleSubtitle;
    stroke: ApexStroke;
    dataLabels: ApexDataLabels;
    fill: ApexFill;
    grid: ApexGrid;
    tooltip: ApexTooltip;
}

@Component({
    selector: 'app-volume-chart',
    standalone: true,
    imports: [CommonModule, NgApexchartsModule],
    templateUrl: './volume-chart.html',
    styleUrl: './volume-chart.css'
})
export class VolumeChartComponent implements OnChanges {
    @ViewChild("chart") chart: ChartComponent | undefined;
    public chartOptions: Partial<ChartOptions>;

    @Input() data: { date: string, count: number }[] = [];
    @Input() peakHours: { hour: string, count: number }[] = [];

    formatTime(hourStr: string): string {
        // hourStr is "08:00", "14:00" etc
        if (!hourStr) return '';
        const [h, m] = hourStr.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
    }

    constructor() {
        this.chartOptions = {
            series: [{
                name: "Gym Goers",
                data: []
            }],
            chart: {
                height: 350,
                type: "area",
                background: 'transparent',
                toolbar: { show: false },
                fontFamily: 'Roboto, sans-serif'
            },
            dataLabels: { enabled: false },
            stroke: {
                curve: "smooth",
                colors: ['#3f51b5'], // Primary Indigo
                width: 2
            },
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.6,
                    opacityTo: 0.1,
                    stops: [0, 90, 100],
                    colorStops: [
                        { offset: 0, color: '#3f51b5', opacity: 0.5 },
                        { offset: 100, color: '#3f51b5', opacity: 0.05 }
                    ]
                }
            },
            title: {
                text: "Daily Volume",
                align: "left",
                style: { color: '#1e293b', fontSize: '18px', fontWeight: '600' }
            },
            xaxis: {
                type: "category",
                categories: [],
                labels: {
                    style: { colors: '#64748b' }, // Text Secondary
                    rotate: -45,
                    formatter: (value: string | number): string => {
                        if (!value) return '';
                        const date = new Date(value);
                        if (isNaN(date.getTime())) return String(value);

                        const mm = String(date.getMonth() + 1).padStart(2, '0');
                        const dd = String(date.getDate()).padStart(2, '0');
                        const yyyy = date.getFullYear();
                        return `${mm}-${dd}-${yyyy}`;
                    }
                },
                axisBorder: { show: false },
                axisTicks: { show: false }
            },
            yaxis: {
                labels: { style: { colors: '#64748b' } }
            },
            grid: {
                borderColor: '#e2e8f0', // Light Gray
                strokeDashArray: 4
            },
            tooltip: {
                theme: 'light'
            }
        };
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['data'] && this.data) {
            this.updateChart();
        }
    }

    updateChart() {
        if (!this.data) return;

        this.chartOptions.series = [{
            name: "Gym Goers",
            data: this.data.map(d => d.count)
        }];

        this.chartOptions.xaxis = {
            ...this.chartOptions.xaxis,
            categories: this.data.map(d => d.date)
        };
    }
}
