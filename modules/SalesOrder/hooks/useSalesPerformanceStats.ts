/**
 * useSalesPerformanceStats.ts
 *
 * Hook que encapsula os cálculos de performance financeira de um pedido de venda:
 * volumes (sacas), custos (grão + frete), faturamento e lucro bruto.
 *
 * SKILL: Cálculos financeiros não devem residir em componentes visuais.
 *        Este hook centraliza a lógica para reuso entre SalesProductSummary,
 *        PdfDocument e qualquer outro consumidor.
 *
 * Exporta também a função pura `calculateSalesPerformance` para uso fora do
 * contexto React (ex: PdfDocument renderizado via @react-pdf/renderer).
 */

import { useMemo } from 'react';
import { SalesOrder } from '../types';
import { Loading } from '../../Loadings/types';
import { kpiService } from '../../../services/sales/kpiService';

export interface SalesPerformanceStats {
  // Volumes
  contractQty: number;
  totalLoadedSc: number;
  totalDeliveredSc: number;
  pendingQty: number;

  // Custos
  totalGrainCost: number;
  totalFreightCost: number;
  totalDirectInvestment: number;

  // Receita
  totalRevenueRealized: number;

  // Resultado
  grossProfit: number;
  marginPercent: number;
}

/**
 * Função pura (sem hooks) — reutilizável em contextos fora do React
 * como @react-pdf/renderer.
 */
export function calculateSalesPerformance(order: SalesOrder, loadings: Loading[]): SalesPerformanceStats {
  const stats = kpiService.calculateOrderStats(order, loadings);
  
  return {
    contractQty: stats.contractQty,
    totalLoadedSc: stats.totalLoadedSc,
    totalDeliveredSc: stats.totalDeliveredSc,
    pendingQty: stats.pendingQty,
    totalGrainCost: stats.totalGrainCost,
    totalFreightCost: stats.totalFreightCost,
    totalDirectInvestment: stats.totalDirectInvestment,
    totalRevenueRealized: stats.totalRevenueRealized,
    grossProfit: stats.grossProfit,
    marginPercent: stats.marginPercent,
  };
}

/** Hook React com memoização */
export function useSalesPerformanceStats(order: SalesOrder, loadings: Loading[]): SalesPerformanceStats {
  return useMemo(() => calculateSalesPerformance(order, loadings), [order, loadings]);
}

/** 
 * Mantivemos o calculateInternalPdfStats separado pois ele contém 
 * métricas de auditoria específicas para o PDF Interno.
 */
export function calculateInternalPdfStats(order: SalesOrder, loadings: Loading[]) {
  // Lógica de auditoria interna...
  const safeLoadings = Array.isArray(loadings) ? loadings : [];
  const activeLoadings = safeLoadings.filter((l) => l?.status !== 'canceled');

  const totalWeightKgOrig = order.totalWeightKgOrig ?? activeLoadings.reduce((acc, l) => acc + (Number(l?.weightKg) || 0), 0);
  const totalWeightKgDest = order.totalWeightKgDest ?? activeLoadings.reduce((acc, l) => acc + (Number(l?.unloadWeightKg) || 0), 0);
  const totalWeightScOrig = totalWeightKgOrig / 60;

  const totalGrainCost = order.totalGrainCost ?? activeLoadings.reduce((acc, l) => acc + (Number(l?.totalPurchaseValue) || 0), 0);
  const totalFreightCost = order.totalFreightCost ?? activeLoadings.reduce((acc, l) => acc + (Number(l?.totalFreightValue) || 0), 0);
  const totalRevenue = order.deliveredValue ?? activeLoadings.reduce((acc, l) => acc + (Number(l?.totalSalesValue) || 0), 0);

  const transactions = Array.isArray(order?.transactions) ? order.transactions : [];
  const orderExpenses = transactions
    .filter((t) => t?.type === 'expense')
    .reduce((acc, t) => acc + (Number(t?.value) || 0), 0);
  const brokerCommission = transactions
    .filter((t) => t?.type === 'commission' && !t?.deductFromPartner)
    .reduce((acc, t) => acc + (Number(t?.value) || 0), 0);

  const totalInvestment = totalGrainCost + totalFreightCost + orderExpenses + brokerCommission;
  const netProfit = totalRevenue - totalInvestment;
  const marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  const profitPerSc = totalWeightScOrig > 0 ? netProfit / totalWeightScOrig : 0;

  const totalBreakageKg = Math.max(0, totalWeightKgOrig - totalWeightKgDest);
  const breakagePercent = totalWeightKgOrig > 0 ? (totalBreakageKg / totalWeightKgOrig) * 100 : 0;

  return {
    activeLoadings,
    totalWeightKgOrig, totalWeightKgDest, totalWeightScOrig,
    totalGrainCost, totalFreightCost, totalRevenue,
    orderExpenses, brokerCommission, totalInvestment,
    netProfit, marginPercent, profitPerSc,
    totalBreakageKg, breakagePercent,
  };
}

