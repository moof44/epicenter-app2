import { Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule, ChartComponent, ApexAxisChartSeries, ApexChart, ApexXAxis, ApexYAxis, ApexDataLabels, ApexTitleSubtitle, ApexStroke, ApexMarkers, ApexLegend, ApexTooltip, ApexGrid } from "ng-apexcharts";

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
  grid: ApexGrid;
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
  @Input() data: { date: string; total: number }[] = [];
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
        fontFamily: 'Inter, sans-serif'
      },
      stroke: {
        width: [0, 3],
        curve: 'smooth',
        colors: ['#06b6d4', '#fbbf24']
      },
      title: {
        text: "Sales Revenue vs Daily Target",
        style: { color: '#ffffff', fontSize: '16px', fontWeight: '800' }
      },
      dataLabels: {
        enabled: true,
        enabledOnSeries: [0],
        style: { colors: ['#ffffff'], fontSize: '10px' },
        formatter: (val: string | number | number[]) => '₱' + Number(val).toLocaleString()
      },
      labels: [],
      xaxis: {
        type: 'datetime',
        labels: {
          style: { colors: '#cbd5e1', fontSize: '11px' }
        },
        tooltip: { enabled: false },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: [
        {
          title: { text: 'Daily Sales (₱)', style: { color: '#cbd5e1', fontSize: '11px' } },
          labels: {
            style: { colors: '#cbd5e1', fontSize: '11px' },
            formatter: (val: number) => '₱' + Number(val).toLocaleString()
          }
        }
      ],
      legend: {
        labels: { colors: '#ffffff' }
      },
      grid: {
        borderColor: '#334155',
        strokeDashArray: 4
      },
      tooltip: {
        theme: 'dark',
        x: { format: 'MMM dd, yyyy' }
      },
      colors: ['#06b6d4', '#fbbf24']
    };
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.data) {
      this.updateChart();
    }
  }

  updateChart() {
    if (!this.data) return;
    const daysInMonth = 30;
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
    this.chartOptions.colors = ['#06b6d4', '#fbbf24'];
  }
}
