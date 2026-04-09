/**
 * loadingKpiService.ts
 * 
 * SERVIÇO DE INTELIGÊNCIA LOGÍSTICA
 * Centraliza todos os cálculos de pesos, quebras, fretes e margens.
 * Substitui o antigo calculations.ts seguindo o padrão modular.
 */

import { Loading, LoadingExtraExpense } from '../../modules/Loadings/types';

export interface LoadingStats {
  wOri: number;      // Peso Origem (KG)
  wDest: number;     // Peso Destino (KG)
  brk: number;       // Quebra (KG)
  purVal: number;    // Valor Compra (Total)
  salVal: number;    // Valor Venda (Total)
  frVal: number;     // Valor Frete (Bruto)
  totalCost: number; // Custo Total (Compra + Frete)
  profit: number;    // Lucro Líquido
  margin: number;    // Margem (%)
}

export interface FreightSummary {
  totalAdditions: number;
  totalDeductions: number;
  totalPaid: number;
  totalDiscount: number;
  netFreightTotal: number;
  balance: number;
  progress: number;
}

export const loadingKpiService = {
  /**
   * Calcula estatísticas básicas de um carregamento individual.
   */
  computeLoadingStats(loading: Partial<Loading>, freightBase: 'origin' | 'destination' = 'origin'): LoadingStats {
    const wOri = loading.weightKg || 0;
    const wDest = loading.unloadWeightKg || 0;
    const brk = Math.max(0, wOri - wDest);

    // Compra sempre baseada no peso de origem
    const purVal = (wOri / 60) * (loading.purchasePricePerSc || 0);
    
    // Venda baseada no peso de destino (se confirmado) ou de origem
    const weightForRevenue = wDest > 0 ? wDest : wOri;
    const salVal = (weightForRevenue / 60) * (loading.salesPrice || 0);

    // Frete baseado na configuração de base (origem vs destino)
    const wRef = freightBase === 'origin' ? wOri : wDest;
    const frVal = (wRef / 1000) * (loading.freightPricePerTon || 0) + (loading.redirectDisplacementValue || 0);

    const totalCost = purVal + frVal;
    const profit = salVal - totalCost;
    const margin = salVal > 0 ? (profit / salVal) * 100 : 0;

    return { wOri, wDest, brk, purVal, salVal, frVal, totalCost, profit, margin };
  },

  /**
   * Calcula resumo financeiro do frete (pagamentos e saldos).
   */
  computeFreightSummary(loading: Loading): FreightSummary {
    const totalAdditions = loading.extraExpenses
      ?.filter((e: LoadingExtraExpense) => e.type === 'addition')
      .reduce((acc, e) => acc + e.value, 0) || 0;

    const totalDeductions = loading.extraExpenses
      ?.filter((e: LoadingExtraExpense) => e.type === 'deduction')
      .reduce((acc, e) => acc + e.value, 0) || 0;

    // Prioridade para freightPaid (autoridade do banco)
    const totalPaid = loading.freightPaid || 0;

    // Descontos diretos em transações
    const totalDiscount = loading.transactions
      ?.reduce((acc, t: any) => acc + (t.discountValue || 0), 0) || 0;

    // Líquido = Bruto + Extras - Deduções
    const netFreightTotal = loading.totalFreightValue + totalAdditions - totalDeductions;
    
    // Saldo = Líquido - Pagamentos - Descontos
    const balance = Math.max(0, netFreightTotal - totalPaid - totalDiscount);
    
    // Progresso de pagamento
    const progress = netFreightTotal > 0 ? Math.min(100, (totalPaid / netFreightTotal) * 100) : 0;

    return { totalAdditions, totalDeductions, totalPaid, totalDiscount, netFreightTotal, balance, progress };
  },

  /**
   * Agrega estatísticas globais para uma lista de carregamentos (Dashboard).
   */
  getGlobalStats(loadings: Loading[]) {
    const active = loadings.filter(l => l.status !== 'canceled');
    
    const totalVolume = active.reduce((acc, l) => acc + (l.weightTon || 0), 0);
    const totalFreight = active.reduce((acc, l) => acc + (l.totalFreightValue || 0), 0);
    const totalPaid = active.reduce((acc, l) => acc + (l.freightPaid || 0), 0);
    const avgFreight = active.length > 0 ? totalFreight / active.length : 0;
    
    // Margem média ponderada (simplificada por volume)
    let weightedMarginSum = 0;
    let totalWeightForMargin = 0;
    
    active.forEach(l => {
      const stats = this.computeLoadingStats(l, (l.freightBase?.toLowerCase() as any) || 'origin');
      weightedMarginSum += stats.margin * (l.weightTon || 1);
      totalWeightForMargin += (l.weightTon || 1);
    });

    const avgMargin = totalWeightForMargin > 0 ? weightedMarginSum / totalWeightForMargin : 0;

    return {
      totalVolume,
      totalFreight,
      totalPaid,
      avgFreight,
      avgMargin,
      count: active.length
    };
  },

  /**
   * Calcula apenas o valor do frete bruto.
   */
  calculateFreightValue(weight: number, pricePerTon: number, displacement: number = 0): number {
    return (weight / 1000) * pricePerTon + displacement;
  },

  /**
   * Aplica peso de destino e recalcula frete se necessário.
   */
  applyUnloadWeight(loading: Loading, unloadWeight: number, freightBase: 'origin' | 'destination'): Loading {
    let totalFreight = loading.totalFreightValue;
    
    if (freightBase === 'destination') {
      totalFreight = this.calculateFreightValue(unloadWeight, loading.freightPricePerTon, loading.redirectDisplacementValue);
    }

    return {
      ...loading,
      unloadWeightKg: unloadWeight,
      totalFreightValue: totalFreight,
      freightBase: (freightBase === 'origin' ? 'Origem' : 'Destino') as Loading['freightBase']
    };
  }
};
