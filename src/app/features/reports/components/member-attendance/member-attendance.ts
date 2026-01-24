import { Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule, ChartComponent, ApexAxisChartSeries, ApexChart, ApexXAxis, ApexYAxis, ApexDataLabels, ApexTitleSubtitle, ApexPlotOptions, ApexTooltip } from "ng-apexcharts";

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
                height: 350,
                background: 'transparent',
                toolbar: { show: false },
                fontFamily: 'Roboto, sans-serif'
            },
            plotOptions: {
                bar: {
                    borderRadius: 4,
                    columnWidth: '45%',
                    distributed: true
                }
            },
            dataLabels: { enabled: false },
            xaxis: {
                categories: [],
                labels: { style: { colors: '#64748b' }, rotate: -45 }
            },
            yaxis: {
                labels: { style: { colors: '#64748b' } }
            },
            title: {
                text: "Top Gym Goers",
                style: { color: '#1e293b', fontSize: '18px', fontWeight: '600' }
            },
            colors: ['#3f51b5'],
            tooltip: { theme: 'light' }
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
            name: "Visits",
            data: this.data.map(d => d.count)
        }];

        this.chartOptions.xaxis = {
            ...this.chartOptions.xaxis,
            categories: this.data.map(d => d.name)
        };
    }
}
