import { OutflowCategory } from './outflow.model';

export interface OutflowCategoryBreakdown {
  category: OutflowCategory;
  label: string;
  amount: number;
  percentage: number;
  color: string;
  icon: string;
}

export type RecommendationSeverity = 'CRITICAL' | 'WARNING' | 'OPPORTUNITY' | 'POSITIVE';

export interface RecommendationCard {
  id: string;
  title: string;
  severity: RecommendationSeverity;
  icon: string;
  category: string;
  summary: string;
  impact: string;
  actionText: string;
  actionRoute?: string;
}

export interface FinancialHealthSummary {
  startDate: Date;
  endDate: Date;
  totalRevenue: number;
  totalOutflows: number;
  netProfit: number;
  netProfitMargin: number;
  
  // Breakdown
  outflowBreakdown: OutflowCategoryBreakdown[];
  
  // Ratios
  payrollAmount: number;
  payrollRatio: number;      // % of total revenue
  utilitiesAmount: number;
  utilitiesRatio: number;    // % of total revenue
  cogsAmount: number;
  cogsRatio: number;         // % of total revenue
  runwayDays: number;        // Days of daily OPEX buffer in cash
  overdueBillsCount: number;
  overdueBillsAmount: number;

  // Grade & Recommendations
  healthGrade: 'A' | 'B' | 'C' | 'D';
  healthScore: number;       // 0 - 100
  recommendations: RecommendationCard[];
}
