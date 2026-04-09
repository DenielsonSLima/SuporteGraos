import { SalesOrder } from '../../modules/SalesOrder/types';
import { Loading } from '../../modules/Loadings/types';

export interface SalesPerformanceStats {
  // Volumes
  contractQty: number;
  totalLoadedSc: number;
  totalDeliveredSc: number;
  pendingQty: number;

  // Custos (Investimento Direto)
  totalGrainCost: number;
  totalFreightCost: number;
  totalDirectInvestment: number;

  // Receita (Faturamento)
  totalRevenueRealized: number; // Valor entregue/faturado
  totalContractValue: number;  // Valor total do contrato

  // Resultado
  grossProfit: number;
  marginPercent: number;

  // Financeiro (Entradas)
  totalReceived: number;
  totalPending: number;
  receivedPercent: number;
}

/**
 * Funções puras de cálculo para o módulo de Pedido de Venda.
 * Centraliza a inteligência de negócio fora dos hooks/componentes.
 */
export const kpiService = {
  /**
   * Calcula as estatísticas principais de um pedido individual.
   */
  calculateOrderStats: (
    order: SalesOrder, 
    loadings: Loading[] = [], 
    transactions: any[] = []
  ): SalesPerformanceStats => {
    // 1. Volumes (Sacas) - Mantido fallback para loadings se view não trouxer
    const activeLoadings = loadings.filter(l => l.status !== 'canceled');
    const totalLoadedSc = Number(order.deliveredQtySc) || activeLoadings.reduce((acc, l) => acc + (Number(l.weightSc) || 0), 0);
    const totalDeliveredSc = Number(order.deliveredQtySc) || activeLoadings.reduce((acc, l) => acc + (l.unloadWeightKg ? l.unloadWeightKg / 60 : 0), 0);
    const contractQty = Number(order.quantity) || 0;
    const pendingQty = Math.max(0, contractQty - totalLoadedSc);

    // 2. Custos e Investimento - SQL-FIRST 🟢
    // Agora consumimos diretamente os campos calculados pelo banco (vw_sales_orders_enriched)
    const totalGrainCost = Number(order.totalGrainCost || 0);
    const totalFreightCost = Number(order.totalFreightCost || 0);
    const totalDirectInvestment = Number(order.grossProfit !== undefined ? (order.deliveredValue || 0) - (order.grossProfit || 0) : (totalGrainCost + totalFreightCost));

    // 3. Receita (Faturamento) - SQL-FIRST 🟢
    const totalRevenueRealized = Number(order.deliveredValue || 0);
    const totalContractValue = Number(order.totalValue || (contractQty * (Number(order.unitPrice) || 0)));

    // 4. Resultado (P&L) - SQL-FIRST 🟢
    const grossProfit = Number(order.grossProfit ?? (totalRevenueRealized - totalDirectInvestment));
    const marginPercent = Number(order.marginPercent ?? (totalRevenueRealized > 0 ? (grossProfit / totalRevenueRealized) * 100 : 0));

    // 5. Recebimentos (Financeiro)
    const totalReceived = transactions.length > 0
      ? transactions
          .filter(tx => tx.type === 'receipt' || tx.type === 'IN')
          .reduce((acc, tx) => acc + (Number(tx.amount || tx.value) || 0), 0)
      : Number(order.paidValue || 0);
    
    const totalPending = Math.max(0, totalRevenueRealized - totalReceived);
    const receivedPercent = totalRevenueRealized > 0 
      ? (totalReceived / totalRevenueRealized) * 100 
      : (totalContractValue > 0 ? (totalReceived / totalContractValue) * 100 : 0);

    return {
      contractQty, totalLoadedSc, totalDeliveredSc, pendingQty,
      totalGrainCost, totalFreightCost, totalDirectInvestment,
      totalRevenueRealized, totalContractValue,
      grossProfit, marginPercent,
      totalReceived, totalPending, receivedPercent
    };
  },

  /**
   * Calcula os KPIs globais para uma lista de pedidos (Dashboard).
   */
  calculateGlobalSalesKPIs: (orders: SalesOrder[]) => {
    return orders.reduce((acc, o) => {
      acc.totalContractValue += Number(o.totalValue) || 0;
      acc.totalDeliveredValue += Number(o.deliveredValue) || 0;
      acc.totalReceived += Number(o.paidValue) || 0;
      acc.totalTransitValue += Number(o.transitValue) || 0;
      acc.transitCount += Number(o.transitCount) || 0;
      
      // O saldo pendente global é a soma do faturado menos o recebido de cada pedido
      acc.pendingReceipt += Math.max(0, (Number(o.deliveredValue) || 0) - (Number(o.paidValue) || 0));
      
      return acc;
    }, {
      totalContractValue: 0,
      totalDeliveredValue: 0,
      totalReceived: 0,
      totalTransitValue: 0,
      transitCount: 0,
      count: orders.length,
      pendingReceipt: 0
    });
  }
};

