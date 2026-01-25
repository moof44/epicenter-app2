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
    selector: 'app-staff-sales',
    standalone: true,
    imports: [CommonModule, NgApexchartsModule],
    templateUrl: './staff-sales.html',
    styleUrl: './staff-sales.css'
})
export class StaffSalesComponent implements OnChanges {
    @ViewChild("chart") chart: ChartComponent | undefined;
    @Input() data: { name: string, total: number }[] = [];

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
                    horizontal: true,
                    borderRadius: 4
                }
            },
            dataLabels: { enabled: true },
            xaxis: {
                categories: [],
                labels: { style: { colors: '#64748b' } }
            },
            yaxis: {
                labels: { style: { colors: '#64748b' } }
            },
            title: {
                text: "Top Performing Staff",
                style: { color: '#1e293b', fontSize: '18px', fontWeight: '600' }
            },
            tooltip: { theme: 'light' },
            colors: ['#3f51b5']
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
            name: "Sales",
            data: this.data.map(d => d.total)
        }];

        this.chartOptions.xaxis = {
            ...this.chartOptions.xaxis,
            categories: this.data.map(d => d.name)
        };
    }
}
