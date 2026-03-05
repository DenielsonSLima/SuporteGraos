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
 * como @react-pdf/renderer `pdf().toBlob()`.
 */
export function calculateSalesPerformance(order: SalesOrder, loadings: Loading[]): SalesPerformanceStats {
  const activeLoadings = loadings.filter(l => l.status !== 'canceled');

  // 1. Volumes (Sacas)
  const totalLoadedSc = activeLoadings.reduce((acc, l) => acc + l.weightSc, 0);
  const totalDeliveredSc = activeLoadings.reduce((acc, l) => acc + (l.unloadWeightKg ? l.unloadWeightKg / 60 : 0), 0);
  const contractQty = order.quantity || 0;
  const pendingQty = Math.max(0, contractQty - totalLoadedSc);

  // 2. Financeiro (Custos)
  const totalGrainCost = activeLoadings.reduce((acc, l) => acc + (l.totalPurchaseValue || 0), 0);
  const totalFreightCost = activeLoadings.reduce((acc, l) => acc + (l.totalFreightValue || 0), 0);
  const totalDirectInvestment = totalGrainCost + totalFreightCost;

  // 3. Financeiro (Receita/Faturamento) — Peso Destino se houver, senão Origem × Preço Venda
  const totalRevenueRealized = activeLoadings.reduce((acc, l) => {
    const weightSc = l.unloadWeightKg ? l.unloadWeightKg / 60 : l.weightSc;
    return acc + (weightSc * (l.salesPrice || order.unitPrice || 0));
  }, 0);

  // 4. Resultado (Lucro Bruto)
  const grossProfit = totalRevenueRealized - totalDirectInvestment;
  const marginPercent = totalRevenueRealized > 0 ? (grossProfit / totalRevenueRealized) * 100 : 0;

  return {
    contractQty, totalLoadedSc, totalDeliveredSc, pendingQty,
    totalGrainCost, totalFreightCost, totalDirectInvestment,
    totalRevenueRealized, grossProfit, marginPercent,
  };
}

/* ─────────────────────────────────────────────────────────────
 * Stats internos (PDF "internal"): métricas de auditoria / P&L
 * detalhado com despesas, comissão, quebra e lucro/sc.
 * ──────────────────────────────────────────────────────────── */

export interface InternalPdfStats {
  activeLoadings: Loading[];
  totalWeightKgOrig: number;
  totalWeightKgDest: number;
  totalWeightScOrig: number;
  totalGrainCost: number;
  totalFreightCost: number;
  totalRevenue: number;
  orderExpenses: number;
  brokerCommission: number;
  totalInvestment: number;
  netProfit: number;
  marginPercent: number;
  profitPerSc: number;
  totalBreakageKg: number;
  breakagePercent: number;
}

/**
 * Função pura para cálculos de performance P&L detalhado
 * usada pelo PdfDocument (variant 'internal') — fora do React tree.
 */
export function calculateInternalPdfStats(order: SalesOrder, loadings: Loading[]): InternalPdfStats {
  const safeLoadings = Array.isArray(loadings) ? loadings : [];
  const activeLoadings = safeLoadings.filter((l) => l?.status !== 'canceled');

  const totalWeightKgOrig = activeLoadings.reduce((acc, l) => acc + (Number(l?.weightKg) || 0), 0);
  const totalWeightKgDest = activeLoadings.reduce((acc, l) => acc + (Number(l?.unloadWeightKg) || 0), 0);
  const totalWeightScOrig = totalWeightKgOrig / 60;

  const totalGrainCost = activeLoadings.reduce((acc, l) => acc + (Number(l?.totalPurchaseValue) || 0), 0);
  const totalFreightCost = activeLoadings.reduce((acc, l) => acc + (Number(l?.totalFreightValue) || 0), 0);
  const totalRevenue = activeLoadings.reduce((acc, l) => acc + (Number(l?.totalSalesValue) || 0), 0);

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

/** Hook React com memoização — para uso em componentes React */
export function useSalesPerformanceStats(order: SalesOrder, loadings: Loading[]): SalesPerformanceStats {
  return useMemo(() => calculateSalesPerformance(order, loadings), [order, loadings]);
}
