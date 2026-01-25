import { Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule, ChartComponent, ApexAxisChartSeries, ApexChart, ApexXAxis, ApexYAxis, ApexDataLabels, ApexTitleSubtitle, ApexPlotOptions, ApexTooltip, ApexGrid } from "ng-apexcharts";

export interface ChartOptions {
    series: ApexAxisChartSeries;
    chart: ApexChart;
    xaxis: ApexXAxis;
    yaxis: ApexYAxis;
    title: ApexTitleSubtitle;
    plotOptions: ApexPlotOptions;
    dataLabels: ApexDataLabels;
    colors: string[];
    tooltip: ApexTooltip;
    grid: ApexGrid;
}

@Component({
    selector: 'app-member-attendance',
    standalone: true,
    imports: [CommonModule, NgApexchartsModule],
    templateUrl: './member-attendance.html',
    styleUrl: './member-attendance.css'
})
export class MemberAttendanceComponent implements OnChanges {
    @ViewChild("chart") chart: ChartComponent | undefined;
    @Input() data: { name: string, count: number }[] = [];

    public chartOptions: Partial<ChartOptions>;

    constructor() {
        this.chartOptions = {
            series: [],
            chart: {
                type: "bar",
                height: 400, // Increase height for better spacing
                background: 'transparent',
                toolbar: { show: false },
                fontFamily: 'Roboto, sans-serif'
            },
            plotOptions: {
                bar: {
                    borderRadius: 4,
                    horizontal: true, // Horizontal for leaderboard effect
                    barHeight: '60%',
                    distributed: true, // Needed for individual colors per bar
                    dataLabels: {
                        position: 'bottom' // Labels inside bar
                    }
                }
            },
            dataLabels: { // Show value on the bar
                enabled: true,
                textAnchor: 'start',
                style: {
                    colors: ['#fff'],
                    fontSize: '14px',
                    fontWeight: 'bold'
                },
                formatter: function (val, opt) {
                    return val + " Visits";
                },
                offsetX: 0,
            },
            xaxis: {
                categories: [],
                labels: { show: false }, // Hide x-axis labels
                axisBorder: { show: false },
                axisTicks: { show: false }
            },
            yaxis: {
                labels: {
                    style: {
                        colors: '#1e293b',
                        fontSize: '14px',
                        fontWeight: 600
                    }
                }
            },
            title: {
                text: "🏆 Top Gym Goers",
                style: { color: '#1e293b', fontSize: '20px', fontWeight: 'bold' }
            },
            colors: [
                '#FFD700', // Gold
                '#C0C0C0', // Silver
                '#CD7F32', // Bronze
                '#3f51b5', '#3f51b5', '#3f51b5', '#3f51b5', '#3f51b5', '#3f51b5', '#3f51b5' // Rest are Indigo
            ],
            tooltip: {
                theme: 'light',
                y: {
                    formatter: function (val) {
                        return val + " Visits";
                    }
                }
            },
            grid: {
                show: false // remove grid for clean look
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

        // 1. Determine Ranking Thresholds (Dense Ranking)
        const counts = this.data.map(d => d.count);
        // numeric sort descending
        const uniqueCounts = Array.from(new Set(counts)).sort((a, b) => b - a);

        const goldValue = uniqueCounts[0];
        const silverValue = uniqueCounts[1];
        const bronzeValue = uniqueCounts[2];

        // 2. Assign Colors based on Value
        const colors = this.data.map(d => {
            if (d.count === goldValue) return '#FFD700'; // Gold
            if (d.count === silverValue) return '#C0C0C0'; // Silver
            if (d.count === bronzeValue) return '#CD7F32'; // Bronze
            return '#3f51b5'; // Indigo
        });

        this.chartOptions.series = [{
            name: "Visits",
            data: counts
        }];

        this.chartOptions.xaxis = {
            ...this.chartOptions.xaxis,
            categories: this.data.map(d => d.name)
        };

        // 3. Update Colors dynamically
        this.chartOptions.colors = colors;
    }
}
