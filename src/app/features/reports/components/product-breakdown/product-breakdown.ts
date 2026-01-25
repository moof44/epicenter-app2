import { Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
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
    imports: [CommonModule, NgApexchartsModule, MatButtonModule, MatIconModule],
    templateUrl: './product-breakdown.html',
    styleUrl: './product-breakdown.css'
})
export class ProductBreakdownComponent implements OnChanges {
    @ViewChild("chart") chart: ChartComponent | undefined;
    @Input() data: { name: string, quantity: number, revenue: number }[] = [];

    public chartOptions: Partial<ChartOptions>;
    public metric: 'quantity' | 'revenue' = 'revenue'; // Default to revenue as requested

    constructor() {
        this.chartOptions = {
            series: [],
            chart: {
                type: "donut",
                height: 350,
                background: 'transparent',
                fontFamily: 'Roboto, sans-serif'
            },
            labels: [],
            title: {
                text: "Top Products by Sales",
                style: { color: '#1e293b', fontSize: '18px', fontWeight: '600' }
            },
            legend: {
                position: "bottom",
                labels: { colors: '#1e293b' }
            },
            dataLabels: { enabled: true, style: { colors: ['#fff'] } },
            tooltip: {
                theme: 'light',
                y: {
                    formatter: (val) => {
                        if (this.metric === 'revenue') {
                            return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);
                        }
                        return val.toString();
                    }
                }
            },
            colors: ['#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688'] // Blue-Green Palette
        };
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['data'] && this.data) {
            this.updateChart();
        }
    }

    setMetric(metric: 'quantity' | 'revenue') {
        this.metric = metric;
        this.updateChart();
    }

    updateChart() {
        if (!this.data) return;

        // Sort based on metric
        const sorted = [...this.data].sort((a, b) => {
            return this.metric === 'quantity'
                ? b.quantity - a.quantity
                : b.revenue - a.revenue;
        });

        // Top 10
        const top = sorted.slice(0, 10);

        this.chartOptions.series = top.map(d => this.metric === 'quantity' ? d.quantity : d.revenue);
        this.chartOptions.labels = top.map(d => d.name);
        this.chartOptions.title = {
            ...this.chartOptions.title,
            text: this.metric === 'quantity' ? "Top Products by Quantity" : "Top Products by Sales"
        };
    }
}
