import React from 'react';

export interface PerformanceFilter {
  months: number | null; // null = Tudo
}

export interface MonthlyData {
  name: string;
  fullDate: string;
  revenue: number;
  freightCost: number;
  purchaseCost: number;
  otherExpenses: number;
  netResult: number;
  totalQuantitySc: number;
  // Métricas Unitárias (R$/SC)
  avgPurchaseCostSc: number;
  avgFreightCostSc: number;
  avgOtherCostSc: number;
  avgTotalCostSc: number;
}

export interface PriceTrendData {
  name: string;
  avgPurchasePrice: number;
  avgSalesPrice: number;
}

export interface HarvestData {
  uf: string;
  volumeTon: number;
  volumeSc: number;
  avgPurchasePrice: number;
  avgSalesPrice: number;
  avgFreightPrice: number;
  totalPurchase: number;
  totalSales: number;
  totalFreight: number; // Acumulador de soma de frete (dividido por tonelagem = avgFreightPrice)
}

// Interfaces para os 3 cards de despesas
export interface ExpenseSubtypeValue {
  name: string;
  value: number;
  percentage: number;
}

export interface ExpenseCategorySummary {
  label: string;
  total: number;
  type: 'fixed' | 'variable' | 'administrative';
  items: ExpenseSubtypeValue[];
}

export interface ProductMix {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

export interface GoalMetric {
  label: string;
  current: number;
  target: number;
  unit: 'currency' | 'number';
}

// Order level insights for top/bottom performers
export interface OrderInsight {
  id: string;
  orderNumber: string;
  partnerName: string;
  profit: number;
  margin: number;
}

export interface PerformanceReport {
  // KPIs Principais
  totalRevenue: number;
  totalDebits: number;
  balance: number;
  avgProfitPerSc: number;
  globalMarginPercent: number;

  // Estatísticas Operacionais
  totalVolumeTon: number;
  totalVolumeSc: number;
  avgPurchasePrice: number;
  avgSalesPrice: number;
  avgFreightPriceTon: number;
  avgTotalCostPerSc: number;

  // Métricas Segregadas por Saca
  avgFreightCostSc: number; // NOVO: Só frete por saca
  avgPureOpCostSc: number;  // NOVO: Só ADM/Fixo por saca (sem frete)

  avgOtherExpensesMonthly: number;

  // Custo de Recusas/Redirecionamentos
  totalRedirectCosts: number;

  // Gráficos
  monthlyHistory: MonthlyData[];
  priceTrendHistory: PriceTrendData[];

  // Tabelas
  harvests: HarvestData[];

  // Novos Cards de Despesas
  expenseBreakdown: ExpenseCategorySummary[];

  // Insights section data
  topProfitOrders: OrderInsight[];
  topLossOrders: OrderInsight[];
  bestMonths: MonthlyData[];
  worstMonths: MonthlyData[];
}