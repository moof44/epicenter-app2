import { Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule, ChartComponent, ApexAxisChartSeries, ApexChart, ApexXAxis, ApexYAxis, ApexDataLabels, ApexTitleSubtitle, ApexPlotOptions, ApexTooltip, ApexGrid, ApexLegend } from "ng-apexcharts";

import { MatIconModule } from '@angular/material/icon';

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
  selector: 'app-member-attendance',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule, MatIconModule],
  templateUrl: './member-attendance.html',
  styleUrl: './member-attendance.css'
})
export class MemberAttendanceComponent implements OnChanges {
  @ViewChild("chart") chart: ChartComponent | undefined;
  @Input() data: { name: string; count: number }[] = [];

  public chartOptions: Partial<ChartOptions>;

  constructor() {
    this.chartOptions = {
      series: [],
      chart: {
        type: "bar",
        height: 380,
        background: 'transparent',
        toolbar: { show: false },
        fontFamily: 'Inter, sans-serif'
      },
      plotOptions: {
        bar: {
          borderRadius: 6,
          horizontal: true,
          barHeight: '60%',
          distributed: true,
          dataLabels: { position: 'bottom' }
        }
      },
      dataLabels: {
        enabled: true,
        textAnchor: 'start',
        style: { colors: ['#ffffff'], fontSize: '12px', fontWeight: 'bold' },
        formatter: function (val) {
          return val + " Visits";
        },
        offsetX: 10
      },
      xaxis: {
        categories: [],
        labels: { show: false },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: {
          style: { colors: '#ffffff', fontSize: '12px', fontWeight: 'bold' }
        }
      },
      title: {
        text: "🏆 Top Gym Goers Leaderboard",
        style: { color: '#ffffff', fontSize: '16px', fontWeight: '800' }
      },
      colors: ['#fbbf24', '#cbd5e1', '#d97706', '#06b6d4', '#06b6d4', '#06b6d4', '#06b6d4', '#06b6d4'],
      tooltip: {
        theme: 'dark',
        y: { formatter: (val) => val + " Visits" }
      },
      grid: { show: false },
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
      this.chartOptions.colors = [];
      return;
    }
    const counts = this.data.map(d => d.count || 0);
    const uniqueCounts = Array.from(new Set(counts)).sort((a, b) => b - a);

    const goldValue = uniqueCounts[0];
    const silverValue = uniqueCounts[1];
    const bronzeValue = uniqueCounts[2];

    const colors = this.data.map(d => {
      const c = d.count || 0;
      if (c === goldValue) return '#fbbf24'; // Gold
      if (c === silverValue) return '#cbd5e1'; // Silver
      if (c === bronzeValue) return '#d97706'; // Bronze
      return '#06b6d4'; // Cyan
    });

    this.chartOptions.series = [{
      name: "Visits",
      data: counts
    }];

    this.chartOptions.xaxis = {
      ...this.chartOptions.xaxis,
      categories: this.data.map(d => d.name || 'Gym Member')
    };

    this.chartOptions.colors = colors;
  }
}
