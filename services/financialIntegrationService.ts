
import { FinancialRecord, FinancialStatus } from '../modules/Financial/types';
import { purchaseService } from './purchaseService';
import { salesService } from './salesService';
import { loadingService } from './loadingService';
import { financialActionService } from './financialActionService';
import { loansService } from './financial/loansService';

// Função segura para adicionar dias a uma data string YYYY-MM-DD
const addDaysLocal = (dateStr: string, days: number): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Lógica de Status: Considera (Pago + Desconto) >= Total
const getStatus = (total: number, paid: number, discount: number = 0, dueDate: string): FinancialStatus => {
  const settledAmount = paid + discount;
  if (total <= 0) return 'pending';
  if (settledAmount >= total - 0.05) return 'paid';
  if (settledAmount > 0) return 'partial';

  const todayStr = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD
  if (dueDate < todayStr) return 'overdue';

  return 'pending';
};

export const financialIntegrationService = {

  // Consolida tudo que a empresa DEVE (Passivo)
  getPayables: (): FinancialRecord[] => {
    const records: FinancialRecord[] = [];
    const allLoadings = loadingService.getAll();
    const allPurchases = purchaseService.getAll();

    // 1. FORNECEDORES DE GRÃOS (Dívida gerada pelo que foi carregado)
    allPurchases.forEach(order => {
      if (order.status === 'canceled') return;

      const orderLoadings = allLoadings.filter(l => l.purchaseOrderId === order.id && l.status !== 'canceled');
      const totalLoadedValue = orderLoadings.reduce((acc, l) => acc + (l.totalPurchaseValue || 0), 0);

      const txs = order.transactions || [];
      const totalPaidTx = txs
        .filter(t => t.type === 'payment' || t.type === 'advance')
        .reduce((acc, t) => acc + (t.value || 0), 0);
      const totalPaid = Math.max(totalPaidTx, order.paidValue || 0);
      const totalFinancialDiscount = Math.max(
        txs.reduce((acc, t) => acc + (t.discountValue || 0), 0),
        order.discountValue || 0
      );

      // Despesas debitadas do produtor também abatem a dívida
      const deductions = (order.transactions || [])
        .filter(t => (t.type === 'expense' || t.type === 'commission') && t.deductFromPartner)
        .reduce((acc, t) => acc + t.value + (t.discountValue || 0), 0);

      const finalDiscount = totalFinancialDiscount + deductions;

      if (totalLoadedValue > 0 || totalPaid > 0) {
        records.push({
          id: `po-grain-${order.id}`,
          description: `Pedido de Compra ${order.number}`,
          entityName: order.partnerName,
          category: 'Matéria Prima',
          issueDate: order.date,
          dueDate: order.date,
          originalValue: totalLoadedValue,
          paidValue: totalPaid,
          discountValue: finalDiscount,
          status: getStatus(totalLoadedValue, totalPaid, finalDiscount, order.date),
          subType: 'purchase_order',
          bankAccount: `${orderLoadings.length} Cargas Realizadas`,
          notes: `Saldo calculado sobre romaneios físicos. Abatimentos inclusos.`
        });
      }
    });

    // 2. FRETES (Dívida com transportadoras)
    allLoadings.forEach(l => {
      if (l.status === 'canceled' || l.totalFreightValue <= 0) return;

      const totalPaid = l.freightPaid || 0;
      const totalDiscount = (l.transactions || []).reduce((acc, t) => acc + (t.discountValue || 0), 0);
      const dueDate = addDaysLocal(l.date, 15);

      records.push({
        id: `fr-${l.id}`,
        description: `Frete ${l.carrierName}${l.vehiclePlate ? ` - ${l.vehiclePlate}` : ''}`,
        entityName: l.carrierName,
        driverName: l.driverName,
        category: 'Logística',
        issueDate: l.date,
        dueDate: dueDate,
        originalValue: l.totalFreightValue,
        paidValue: totalPaid,
        discountValue: totalDiscount,
        status: getStatus(l.totalFreightValue, totalPaid, totalDiscount, dueDate),
        subType: 'freight',
        bankAccount: l.supplierName,
        notes: `Frete referente ao Pedido ${l.purchaseOrderNumber}`,
        weightSc: l.weightKg / 60,
        unitPriceSc: (l.weightKg / 60) > 0 ? l.totalFreightValue / (l.weightKg / 60) : 0
      });
    });

    // 3. DESPESAS ADMINISTRATIVAS E COMISSÕES AVULSAS
    const standalone = financialActionService.getStandaloneRecords();
    standalone.forEach(r => {
      const isDebit = ['admin', 'commission', 'loan_taken', 'shareholder'].includes(r.subType || '');
      if (!isDebit) return;

      // Excluir débitos de empréstimos concedidos (são apenas movimentação de caixa, não dívida real)
      if (r.subType === 'admin' && r.category === 'Empréstimos' && r.description?.startsWith('Débito de Empréstimo')) return;

      records.push(r);
    });

    // 4. EMPRÉSTIMOS TOMADOS (Dívida com credores)
    const allLoans = loansService.getAll();
    allLoans.forEach(loan => {
      if (loan.subType !== 'loan_taken') return;
      if (loan.status === 'paid' || loan.status === 'settled') return;
      // Evitar duplicatas - o loan_taken pode já ter vindo do standalone
      if (records.some(r => r.id === loan.id)) return;
      records.push(loan);
    });

    return records.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  },

  // Consolida tudo que a empresa tem a RECEBER (Ativo)
  getReceivables: (): FinancialRecord[] => {
    const records: FinancialRecord[] = [];
    const sales = salesService.getAll();
    const allLoadings = loadingService.getAll();
    const standalone = financialActionService.getStandaloneRecords();

    // 1. VENDAS DE GRÃOS (Receita gerada pelo que foi entregue no destino)
    sales.forEach(sale => {
      if (sale.status === 'canceled') return;

      const deliveredLoadings = allLoadings.filter(l => l.salesOrderId === sale.id && l.status !== 'canceled' && (l.unloadWeightKg && l.unloadWeightKg > 0));
      const totalDeliveredValue = deliveredLoadings.reduce((acc, l) => {
        const weightSc = l.unloadWeightKg! / 60;
        const price = l.salesPrice || sale.unitPrice || 0;
        return acc + (weightSc * price);
      }, 0);

      const totalReceived = (sale.transactions || []).filter(t => t.type === 'receipt').reduce((acc, t) => acc + t.value, 0);
      const totalDiscount = (sale.transactions || []).filter(t => t.type === 'receipt').reduce((acc, t) => acc + (t.discountValue || 0), 0);

      // Busca o nome da última conta bancária utilizada para este recebimento
      const lastTx = (sale.transactions || [])
        .filter(t => t.type === 'receipt')
        .sort((a, b) => b.date.localeCompare(a.date))[0];

      if (totalDeliveredValue > 0 || totalReceived > 0) {
        const dueDate = addDaysLocal(sale.date, 15);
        records.push({
          id: `so-${sale.id}`,
          description: `Venda ${sale.number}`,
          entityName: sale.customerName,
          category: 'Receita Operacional',
          issueDate: sale.date,
          dueDate: dueDate,
          originalValue: totalDeliveredValue,
          paidValue: totalReceived,
          discountValue: totalDiscount,
          status: getStatus(totalDeliveredValue, totalReceived, totalDiscount, dueDate),
          subType: 'sales_order',
          bankAccount: lastTx ? lastTx.accountName : undefined,
          notes: `Faturamento baseado em peso de destino.`
        });
      }
    });

    // 2. RECEBIMENTOS AVULSOS (Empréstimos concedidos, Venda de Ativos)
    standalone.forEach(r => {
      const isCredit = ['receipt', 'loan_granted'].includes(r.subType || '') || r.category === 'Venda de Ativo';
      // Excluir créditos de empréstimos tomados (são apenas movimentação de caixa, não crédito real)
      if (r.subType === 'receipt' && r.category === 'Empréstimos' && r.description?.startsWith('Crédito de Empréstimo')) return;
      if (isCredit) records.push(r);
    });

    // 3. EMPRÉSTIMOS CONCEDIDOS (Crédito a receber)
    const allLoans = loansService.getAll();
    allLoans.forEach(loan => {
      if (loan.subType !== 'loan_granted') return;
      if (loan.status === 'paid' || loan.status === 'settled') return;
      if (records.some(r => r.id === loan.id)) return;
      records.push(loan);
    });

    return records.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }
};
