import { Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { NgApexchartsModule, ChartComponent, ApexAxisChartSeries, ApexChart, ApexXAxis, ApexYAxis, ApexDataLabels, ApexTitleSubtitle, ApexPlotOptions, ApexTooltip, ApexGrid, ApexLegend } from "ng-apexcharts";

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
  legend: ApexLegend;
}

@Component({
  selector: 'app-staff-sales',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule, MatIconModule],
  templateUrl: './staff-sales.html',
  styleUrl: './staff-sales.css'
})
export class StaffSalesComponent implements OnChanges {
  @ViewChild("chart") chart: ChartComponent | undefined;
  @Input() data: { name: string; total: number }[] = [];

  public chartOptions: Partial<ChartOptions>;

  constructor() {
    this.chartOptions = {
      series: [],
      chart: {
        type: "bar",
        height: 320,
        background: 'transparent',
        toolbar: { show: false },
        fontFamily: 'Inter, sans-serif'
      },
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 6,
          barHeight: '55%'
        }
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => '₱' + Number(val).toLocaleString(),
        style: { colors: ['#ffffff'], fontSize: '11px', fontWeight: 'bold' }
      },
      xaxis: {
        categories: [],
        labels: {
          style: { colors: '#cbd5e1', fontSize: '11px' },
          formatter: (val) => '₱' + Number(val).toLocaleString()
        }
      },
      yaxis: {
        labels: { style: { colors: '#cbd5e1', fontSize: '11px' } }
      },
      title: {
        text: "Staff Sales Performance",
        style: { color: '#ffffff', fontSize: '15px', fontWeight: '800' }
      },
      grid: {
        borderColor: '#334155',
        strokeDashArray: 4
      },
      tooltip: {
        theme: 'dark',
        y: { formatter: (val) => '₱' + Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 }) }
      },
      colors: ['#34d399'], // Mint Green
      legend: { show: false }
    };
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.updateChart();
    }
  }

  updateChart() {
    if (!this.data || this.data.length === 0) {
      this.chartOptions.series = [];
      this.chartOptions.xaxis = {
        ...this.chartOptions.xaxis,
        categories: []
      };
      return;
    }
    this.chartOptions.series = [{
      name: "Sales (₱)",
      data: this.data.map(d => d.total || 0)
    }];
    this.chartOptions.xaxis = {
      ...this.chartOptions.xaxis,
      categories: this.data.map(d => d.name || 'Staff')
    };
  }
}
