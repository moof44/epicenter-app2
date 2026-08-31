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

  @Input() data: { date: string; count: number }[] = [];
  @Input() peakHours: { hour: string; count: number }[] = [];

  formatTime(hourStr: string): string {
    if (!hourStr) return '';
    const [h, m] = hourStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  constructor() {
    this.chartOptions = {
      series: [{
        name: "Gym Check-Ins",
        data: []
      }],
      chart: {
        height: 350,
        type: "area",
        background: 'transparent',
        toolbar: { show: false },
        fontFamily: 'Inter, sans-serif'
      },
      dataLabels: { enabled: false },
      stroke: {
        curve: "smooth",
        colors: ['#06b6d4'], // Cyan
        width: 2.5
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.5,
          opacityTo: 0.05,
          stops: [0, 90, 100],
          colorStops: [
            { offset: 0, color: '#06b6d4', opacity: 0.4 },
            { offset: 100, color: '#06b6d4', opacity: 0.02 }
          ]
        }
      },
      title: {
        text: "Daily Gym Attendance Volume",
        align: "left",
        style: { color: '#ffffff', fontSize: '16px', fontWeight: '800' }
      },
      xaxis: {
        type: "category",
        categories: [],
        labels: {
          style: { colors: '#cbd5e1', fontSize: '11px' },
          rotate: -45,
          formatter: (value: string | number): string => {
            if (!value) return '';
            const date = new Date(value);
            if (isNaN(date.getTime())) return String(value);
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            return `${mm}/${dd}`;
          }
        },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: { style: { colors: '#cbd5e1', fontSize: '11px' } }
      },
      grid: {
        borderColor: '#334155',
        strokeDashArray: 4
      },
      tooltip: {
        theme: 'dark'
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
      name: "Gym Check-Ins",
      data: this.data.map(d => d.count)
    }];
    this.chartOptions.xaxis = {
      ...this.chartOptions.xaxis,
      categories: this.data.map(d => d.date)
    };
  }
}
