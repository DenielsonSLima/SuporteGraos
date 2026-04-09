import { PurchaseOrder, OrderTransaction } from '../../modules/PurchaseOrder/types';

export const kpiService = {
  /**
   * Calcula o resumo de despesas extras de um pedido
   */
  calculateExpensesSummary(transactions: OrderTransaction[]) {
    const expenses = transactions.filter(t => t.type === 'expense');
    const total = expenses.reduce((acc, t) => acc + (t.value || 0), 0);
    const deductedFromPartner = expenses.filter(t => t.deductFromPartner).reduce((acc, t) => acc + (t.value || 0), 0);
    const companyCost = expenses.filter(t => !t.deductFromPartner).reduce((acc, t) => acc + (t.value || 0), 0);

    return {
      total,
      deductedFromPartner,
      companyCost,
      count: expenses.length
    };
  },

  /**
   * Calcula o resumo de pagamentos realizados ao produtor
   */
  calculatePaymentsSummary(transactions: OrderTransaction[]) {
    const payments = transactions.filter(t => t.type === 'payment' || t.type === 'advance');
    const totalPaid = payments.reduce((acc, t) => acc + (t.value || 0), 0);
    const totalDiscount = payments.reduce((acc, t) => acc + (t.discountValue || 0), 0);
    
    return {
      totalPaid,
      totalDiscount,
      count: payments.length
    };
  },

  /**
   * Calcula todas as estatísticas financeiras de um pedido de compra (Prioriza SQL-First)
   */
  calculateOrderStats(order: PurchaseOrder, transactions: OrderTransaction[] = [], loadings: any[] = []) {
    // 1. Valores vindo do Banco de Dados (Via View vw_purchase_orders_enriched)
    // Estes campos são preenchidos pelo loader.ts e vêm da agregação SQL
    const totalPurchaseVal = Number(order.totalPurchaseValCalc) || 0;
    const totalFreightVal = Number(order.totalFreightValCalc) || 0;
    const totalSalesVal = Number(order.totalSalesValCalc) || 0;
    const totalSc = Number(order.totalSc) || 0;
    const totalKg = Number(order.totalKg) || 0;

    // 2. Liquidado Real (DB-Driven)
    // O paidValue agora é atualizado por trigger no SQL a cada mudança no financial_links
    const totalSettled = Number(order.paidValue) || 0;
    const totalAbatements = Number(order.discountValue) || 0;
    
    // 3. Saldo (Calculado localmente apenas como reflexo do que o banco enviou)
    const balancePartner = Math.max(0, totalPurchaseVal - totalSettled);
    const advanceBalance = Math.max(0, totalSettled - totalPurchaseVal);

    const totalCommissionDue = order.hasBroker ? totalSc * (Number(order.brokerCommissionPerSc) || 0) : 0;

    return {
      totalPurchaseVal,
      totalFreightVal,
      totalSalesVal,
      totalSettled,
      totalAbatements,
      balancePartner: balancePartner > 0.01 ? balancePartner : 0,
      advanceBalance: advanceBalance > 0.01 ? advanceBalance : 0,
      totalSc,
      totalKg,
      avgSalesPrice: totalSc > 0 ? totalSalesVal / totalSc : 0,
      avgPurchasePrice: totalSc > 0 ? totalPurchaseVal / totalSc : 0,
      totalCommissionDue
    };
  },

  /**
   * Calcula as estatísticas globais para a listagem (Utiliza exclusivamente valores do Banco/View)
   */
  calculateGlobalPurchaseKPIs(orders: PurchaseOrder[], externalLoadings: any[] = []) {
    return orders.reduce((acc, order) => {
      const totalContract = Number(order.totalValue) || 0;
      const totalSettled = Number(order.paidValue) || 0;
      const totalLoaded = Number(order.totalPurchaseValCalc) || 0;
      
      const pendingPayment = Math.max(0, totalLoaded - totalSettled);

      return {
        totalContractValue: acc.totalContractValue + totalContract,
        totalSettled: acc.totalSettled + totalSettled,
        totalPendingPayment: acc.totalPendingPayment + pendingPayment,
        totalInTransitValue: acc.totalInTransitValue + (Number(order.totalInTransitValCalc) || 0),
        count: acc.count + 1,
        loadedCount: acc.loadedCount + (order.totalSc ? 1 : 0)
      };
    }, {
      totalContractValue: 0,
      totalSettled: 0,
      totalPendingPayment: 0,
      totalInTransitValue: 0,
      count: 0,
      loadedCount: 0
    });
  }
};
