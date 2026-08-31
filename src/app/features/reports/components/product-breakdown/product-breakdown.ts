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
  @Input() data: { name: string; quantity: number; revenue: number }[] = [];

  public chartOptions: Partial<ChartOptions>;
  public metric: 'quantity' | 'revenue' = 'revenue';

  constructor() {
    this.chartOptions = {
      series: [],
      chart: {
        type: "donut",
        height: 320,
        background: 'transparent',
        fontFamily: 'Inter, sans-serif'
      },
      labels: [],
      title: {
        text: "Top Products Breakdown",
        style: { color: '#ffffff', fontSize: '15px', fontWeight: '800' }
      },
      legend: {
        position: "bottom",
        labels: { colors: '#cbd5e1' }
      },
      dataLabels: { enabled: true, style: { colors: ['#ffffff'] } },
      tooltip: {
        theme: 'dark',
        y: {
          formatter: (val) => {
            if (this.metric === 'revenue') {
              return '₱' + Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }
            return val + ' units';
          }
        }
      },
      colors: ['#06b6d4', '#34d399', '#fbbf24', '#c084fc', '#f87171', '#38bdf8']
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
    const sorted = [...this.data].sort((a, b) => {
      return this.metric === 'quantity' ? b.quantity - a.quantity : b.revenue - a.revenue;
    });
    const top = sorted.slice(0, 8);

    this.chartOptions.series = top.map(d => this.metric === 'quantity' ? d.quantity : d.revenue);
    this.chartOptions.labels = top.map(d => d.name);
    this.chartOptions.title = {
      ...this.chartOptions.title,
      text: this.metric === 'quantity' ? "Top Products by Volume (Units)" : "Top Products by Revenue (₱)"
    };
  }
}
