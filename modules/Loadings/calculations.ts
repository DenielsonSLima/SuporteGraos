/**
 * loadingCalculations.ts
 *
 * Funções PURAS de cálculo para o módulo de Carregamentos.
 * Centraliza toda a lógica de cálculo que antes estava espalhada em:
 *   - LoadingManagement.tsx (stats useMemo — 17 ops)
 *   - LoadingForm.tsx (totals useEffect — 6 ops)
 *   - LoadingFinancialTab.tsx (financial summary — 4 aggregações)
 *
 * ✅ SKIL §5.4: Estes cálculos são valores DERIVADOS para PREVIEW UX.
 *    O valor persistido sempre passa pelo loadingService.update() → Supabase,
 *    onde o TRIGGER fn_ops_loading_compute_totals recomputa os totais
 *    a partir dos campos-base (peso, preço unitário, freightBase).
 *    O SQL é a AUTORIDADE — o frontend é best-effort.
 */

import { Loading, LoadingExtraExpense } from './types';

// ─── Stats da Carga (LoadingManagement) ─────────────────────────────────────

export interface LoadingStats {
  /** Peso origem (KG) */ wOri: number;
  /** Peso destino (KG) */ wDest: number;
  /** Quebra (KG) */ brk: number;
  /** Valor total compra (R$) */ purVal: number;
  /** Valor total venda (R$) */ salVal: number;
  /** Valor total frete (R$) */ frVal: number;
  /** Custo total (compra + frete) */ totalCost: number;
  /** Lucro (venda - custos) */ profit: number;
  /** Margem percentual */ margin: number;
}

/**
 * Calcula todas as métricas financeiras de um carregamento.
 * Usado no painel de gestão (LoadingManagement) para exibir stats.
 */
export function computeLoadingStats(
  loading: Partial<Loading>,
  freightBase: 'origin' | 'destination'
): LoadingStats {
  const wOri = loading.weightKg || 0;
  const wDest = loading.unloadWeightKg || 0;
  const brk = Math.max(0, wOri - wDest);

  const purVal = (wOri / 60) * (loading.purchasePricePerSc || 0);
  const weightForRevenue = wDest > 0 ? wDest : wOri;
  const salVal = (weightForRevenue / 60) * (loading.salesPrice || 0);

  const wRef = freightBase === 'origin' ? wOri : wDest;
  const frVal = (wRef / 1000) * (loading.freightPricePerTon || 0) + (loading.redirectDisplacementValue || 0);

  const totalCost = purVal + frVal;
  const profit = salVal - totalCost;
  const margin = salVal > 0 ? (profit / salVal) * 100 : 0;

  return { wOri, wDest, brk, purVal, salVal, frVal, totalCost, profit, margin };
}

// ─── Totais do Formulário (LoadingForm) ─────────────────────────────────────

export interface LoadingFormTotals {
  weightTon: number;
  weightSc: number;
  totalPurchaseValue: number;
  totalFreightValue: number;
  totalSalesValue: number;
}

/**
 * Calcula os totais derivados a partir dos campos do formulário de criação.
 * Usado no LoadingForm para atualizar campos calculados.
 */
export function computeFormTotals(
  weightKg: number,
  purchasePricePerSc: number,
  freightPricePerTon: number,
  salesPrice: number
): LoadingFormTotals {
  const sc = weightKg / 60;
  const ton = weightKg / 1000;
  const purchaseTotal = sc * purchasePricePerSc;
  const freightTotal = ton * freightPricePerTon;
  const salesTotal = sc * salesPrice;

  return {
    weightTon: parseFloat(ton.toFixed(3)),
    weightSc: parseFloat(sc.toFixed(2)),
    totalPurchaseValue: parseFloat(purchaseTotal.toFixed(2)),
    totalFreightValue: parseFloat(freightTotal.toFixed(2)),
    totalSalesValue: parseFloat(salesTotal.toFixed(2)),
  };
}

// ─── Resumo Financeiro do Frete (LoadingFinancialTab) ───────────────────────

export interface FreightFinancialSummary {
  /** Total em extras/adicionais */ totalAdditions: number;
  /** Total em descontos/deduções */ totalDeductions: number;
  /** Total já pago */ totalPaid: number;
  /** Total em abatimentos (discounts nas transações) */ totalDiscount: number;
  /** Líquido a pagar (bruto + extras - deduções) */ netFreightTotal: number;
  /** Saldo pendente */ balance: number;
}

/**
 * Calcula o resumo financeiro do frete de um carregamento.
 * Usado no LoadingFinancialTab para exibir cards de resumo.
 */
export function computeFreightSummary(loading: Loading): FreightFinancialSummary {
  const totalAdditions = loading.extraExpenses
    ?.filter((e: LoadingExtraExpense) => e.type === 'addition')
    .reduce((acc: number, e: LoadingExtraExpense) => acc + e.value, 0) || 0;

  const totalDeductions = loading.extraExpenses
    ?.filter((e: LoadingExtraExpense) => e.type === 'deduction')
    .reduce((acc: number, e: LoadingExtraExpense) => acc + e.value, 0) || 0;

  const totalPaid = loading.freightPaid || 0;

  const totalDiscount = loading.transactions
    ?.reduce((acc: number, t: any) => acc + (t.discountValue || 0), 0) || 0;

  const netFreightTotal = loading.totalFreightValue + totalAdditions - totalDeductions;
  const balance = Math.max(0, netFreightTotal - totalPaid - totalDiscount);

  return { totalAdditions, totalDeductions, totalPaid, totalDiscount, netFreightTotal, balance };
}

// ─── Recalculadores para handlers ───────────────────────────────────────────

/**
 * Recalcula o totalFreightValue com base no peso de referência.
 * Usado ao alternar base de frete (origem / destino) ou confirmar peso.
 */
export function recalcFreightValue(
  weightKg: number,
  freightPricePerTon: number,
  redirectDisplacementValue: number = 0
): number {
  return parseFloat(((weightKg / 1000) * freightPricePerTon).toFixed(2)) + redirectDisplacementValue;
}

/**
 * Recalcula totalSalesValue (para confirmar peso destino).
 */
export function recalcSalesValue(weightKg: number, salesPrice: number): number {
  return parseFloat(((weightKg / 60) * salesPrice).toFixed(2));
}
