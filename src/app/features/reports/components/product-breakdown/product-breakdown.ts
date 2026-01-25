import { Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule, ChartComponent, ApexAxisChartSeries, ApexChart, ApexDataLabels, ApexTitleSubtitle, ApexLegend, ApexTooltip } from "ng-apexcharts";

export interface ChartOptions {
    series: ApexAxisChartSeries | number[];
    chart: ApexChart;
    labels: string[];
    title: ApexTitleSubtitle;
    legend: ApexLegend;
    dataLabels: ApexDataLabels;
    colors: string[];
    tooltip: ApexTooltip;
}

@Component({
    selector: 'app-product-breakdown',
    standalone: true,
    imports: [CommonModule, NgApexchartsModule],
    templateUrl: './product-breakdown.html',
    styleUrl: './product-breakdown.css'
})
export class ProductBreakdownComponent implements OnChanges {
    @ViewChild("chart") chart: ChartComponent | undefined;
    @Input() data: { name: string, quantity: number, revenue: number }[] = [];

    public chartOptions: Partial<ChartOptions>;

    constructor() {
        this.chartOptions = {
            series: [],
            chart: {
                type: "donut", // Donut looks more modern
                height: 350,
                background: 'transparent',
                fontFamily: 'Roboto, sans-serif'
            },
            labels: [],
            title: {
                text: "Top Products by Quantity",
                style: { color: '#1e293b', fontSize: '18px', fontWeight: '600' }
            },
            legend: {
                position: "bottom",
                labels: { colors: '#1e293b' }
            },
            dataLabels: { enabled: true, style: { colors: ['#fff'] } },
            tooltip: { theme: 'light' },
            colors: ['#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688'] // Blue-Green Palette
        };
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['data'] && this.data) {
            this.updateChart();
        }
    }

    updateChart() {
        if (!this.data) return;

        // Top 5 or 10
        const top = this.data.slice(0, 10);

        this.chartOptions.series = top.map(d => d.quantity);
        this.chartOptions.labels = top.map(d => d.name);
    }
}
