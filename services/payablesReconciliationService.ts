import { payablesService, Payable } from './financial/payablesService';
import { purchaseService } from './purchaseService';
import { loadingService } from './loadingService';
import { standaloneRecordsService } from './standaloneRecordsService';
import { isSqlCanonicalOpsEnabled, sqlCanonicalOpsLog } from './sqlCanonicalOps';

let hasRun = false;

const toNumber = (value: any) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const parseOrigin = (notes?: string) => {
  if (!notes) return '';
  const match = notes.match(/\[ORIGIN:([^\]]+)\]/);
  return match ? match[1] : '';
};

const makeTxKey = (tx: { date?: string; value?: number; discountValue?: number; accountName?: string }) => {
  const date = tx.date || '';
  const value = toNumber(tx.value).toFixed(2);
  const discount = toNumber(tx.discountValue).toFixed(2);
  const account = tx.accountName || '';
  return `${date}|${value}|${discount}|${account}`;
};

export const reconcilePayablesFromHistory = async () => {
  if (isSqlCanonicalOpsEnabled()) {
    sqlCanonicalOpsLog('reconcilePayablesFromHistory ignorado: SQL canônico ativo');
    return;
  }

  if (hasRun) return;
  hasRun = true;


  // Buscar histórico de pagamentos de purchase_order
  const allRecords = standaloneRecordsService.getAll();
  
  const history = allRecords
    .filter(r => r.subType === 'purchase_order')
    .map(r => ({
      id: r.id,
      date: r.settlementDate || r.issueDate,
      value: toNumber(r.paidValue),
      discountValue: toNumber(r.discountValue),
      accountName: r.bankAccount || 'N/D',
      notes: r.notes
    }))
    .filter(r => r.date && (r.value > 0 || r.discountValue > 0));

  
  if (history.length === 0) {
    return;
  }

  // Agrupar por origem (ID do pedido/payable)
  const historyByOrigin = new Map<string, typeof history>();
  for (const record of history) {
    const origin = parseOrigin(record.notes);
    if (!origin) continue;
    if (!historyByOrigin.has(origin)) historyByOrigin.set(origin, []);
    historyByOrigin.get(origin)!.push(record);
  }

  
  if (historyByOrigin.size === 0) {
    return;
  }

  const payables = payablesService.getAll();
  
  const payableById = new Map(payables.map(p => [p.id, p] as [string, Payable]));
  const payableByOrder = new Map(
    payables
      .filter(p => p.purchaseOrderId)
      .map(p => [p.purchaseOrderId!, p] as [string, Payable])
  );
  
  payables.forEach(p => {
  });

  const orders = await purchaseService.loadFromSupabase();
  const orderById = new Map(orders.map(o => [o.id, o]));

  historyByOrigin.forEach((records, origin) => {
    const totalPaid = records.reduce((acc, r) => acc + r.value + r.discountValue, 0);
    if (totalPaid <= 0) return;

    // Tentar encontrar o orderId a partir do origin
    const orderIdFromOrigin = origin.startsWith('po-grain-') ? origin.replace('po-grain-', '') : '';
    
    const payableFromOrigin = payableById.get(origin);
    
    const orderId = orderIdFromOrigin || payableFromOrigin?.purchaseOrderId || '';

    // Atualizar payable
    let payable = payableFromOrigin || (orderId ? payableByOrder.get(orderId) : undefined);
    
    // Se ainda não encontrou, procurar por nome do parceiro ou qualquer payable com o mesmo purchaseOrderId
    if (!payable && orderId) {
      payable = payables.find(p => p.purchaseOrderId === orderId);
    }
    
    if (payable) {
      const newPaidAmount = Number(totalPaid.toFixed(2));
      if (Math.abs((payable.paidAmount || 0) - newPaidAmount) > 0.01) {
        const status: Payable['status'] = newPaidAmount >= payable.amount - 0.01
          ? 'paid'
          : newPaidAmount > 0
            ? 'partially_paid'
            : 'pending';

        payablesService.update({
          ...payable,
          paidAmount: newPaidAmount,
          status
        });
      }
    }

    // Atualizar pedido de compra
    if (orderId) {
      const order = orderById.get(orderId);
      if (order) {
        const historyTx = records.map(r => ({
          id: r.id,
          type: 'payment' as const,
          date: r.date,
          value: r.value,
          discountValue: r.discountValue,
          accountId: r.accountName || 'unknown',
          accountName: r.accountName || 'N/D',
          notes: r.notes
        }));

        const existing = order.transactions || [];
        const existingKeys = new Set(existing.map(t => makeTxKey(t)));
        const merged = [...existing];
        for (const tx of historyTx) {
          const key = makeTxKey(tx);
          if (!existingKeys.has(key)) {
            merged.push(tx as any);
            existingKeys.add(key);
          }
        }

        const newPaidValue = Number(totalPaid.toFixed(2));
        if (Math.abs((order.paidValue || 0) - newPaidValue) > 0.01 || merged.length !== existing.length) {
          purchaseService.update({
            ...order,
            paidValue: newPaidValue,
            transactions: merged
          });
        }
      }
    }
  });

};

// Reconciliar payables diretamente dos pedidos de compra (para pagamentos sem histórico ORIGIN)
export const reconcilePayablesFromOrders = async () => {
  if (isSqlCanonicalOpsEnabled()) {
    sqlCanonicalOpsLog('reconcilePayablesFromOrders ignorado: SQL canônico ativo');
    return { updated: 0, fixed: 0 };
  }

  
  const allPayables = payablesService.getAll();
  const payables = allPayables.filter(p => p.subType === 'purchase_order');
  const orders = await purchaseService.loadFromSupabase();
  
  
  // Log todos os payables para debug
  payables.forEach(p => {
  });
  
  let updated = 0;
  let fixed = 0;
  
  // Para cada pedido de compra, encontrar o payable correspondente
  for (const order of orders) {
    if (!order.totalValue || order.totalValue <= 0) continue;
    
    const orderPaidValue = toNumber(order.paidValue) + toNumber(order.discountValue);
    
    // Estratégia 1: Buscar payable por purchaseOrderId
    let payable = payables.find(p => p.purchaseOrderId === order.id);
    
    // Estratégia 2: Buscar por número do pedido na descrição
    if (!payable) {
      payable = payables.find(p => 
        p.description.includes(order.number || '') && 
        p.partnerId === order.partnerId
      );
    }
    
    // Estratégia 3: Buscar por valor + partnerId (tolerância de 1 centavo)
    if (!payable) {
      payable = payables.find(p => 
        Math.abs(p.amount - (order.totalValue || 0)) < 1 && 
        p.partnerId === order.partnerId
      );
    }
    
    // Estratégia 4: Buscar só por partnerId e status pendente
    if (!payable) {
      payable = payables.find(p => 
        p.partnerId === order.partnerId &&
        (p.status === 'pending' || p.status === 'partially_paid') &&
        !p.purchaseOrderId
      );
    }
    
    if (!payable) {
      continue;
    }
    
    // Corrigir purchaseOrderId se estiver vazio
    if (!payable.purchaseOrderId) {
      fixed++;
    }
    
    const payablePaidAmount = toNumber(payable.paidAmount);
    
    // Se há diferença entre o paidValue do pedido e o paidAmount do payable
    if (Math.abs(orderPaidValue - payablePaidAmount) > 0.01 || !payable.purchaseOrderId) {
      const newStatus: Payable['status'] = orderPaidValue >= payable.amount - 0.01
        ? 'paid'
        : orderPaidValue > 0
          ? 'partially_paid'
          : 'pending';
      
      
      payablesService.update({
        ...payable,
        purchaseOrderId: order.id, // Garantir que está correto
        paidAmount: Number(orderPaidValue.toFixed(2)),
        status: newStatus
      });
      
      updated++;
    }
  }
  
  return { updated, fixed };
};

export const reconcilePayablesFromFreights = async () => {
  if (isSqlCanonicalOpsEnabled()) {
    sqlCanonicalOpsLog('reconcilePayablesFromFreights ignorado: SQL canônico ativo');
    return;
  }


  const payables = payablesService.getAll().filter(p => p.subType === 'freight');
  const allLoadings = await loadingService.loadFromSupabase();
  const loadings = allLoadings.filter(l => l.totalFreightValue && l.totalFreightValue > 0 && l.status !== 'canceled');

  const payableByLoading = new Map(
    payables
      .filter(p => p.loadingId)
      .map(p => [p.loadingId!, p] as [string, Payable])
  );

  loadings.forEach(loading => {
    const txs = loading.transactions || [];
    const totalPaidTx = txs.reduce((acc, t) => acc + toNumber(t.value), 0);
    const totalDiscountTx = txs.reduce((acc, t) => acc + toNumber(t.discountValue), 0);
    const totalPaid = Number(((txs.length > 0 ? totalPaidTx : (loading.freightPaid || 0)) || 0).toFixed(2));

    if (Math.abs((loading.freightPaid || 0) - totalPaid) > 0.01) {
      loadingService.update({
        ...loading,
        freightPaid: totalPaid
      });
    }

    let payable = payableByLoading.get(loading.id);
    if (!payable) {
      payable = payables.find(p => p.purchaseOrderId === loading.purchaseOrderId && p.partnerId === loading.carrierId && Math.abs(p.amount - (loading.totalFreightValue || 0)) < 0.01);
    }
    if (!payable && loading.vehiclePlate) {
      payable = payables.find(p => p.description?.includes(loading.vehiclePlate!));
    }

    if (!payable) return;

    const newPaidAmount = Number(((txs.length > 0 ? (totalPaidTx + totalDiscountTx) : (payable.paidAmount || 0)) || 0).toFixed(2));
    if (Math.abs((payable.paidAmount || 0) - newPaidAmount) > 0.01 || !payable.loadingId) {
      const status: Payable['status'] = newPaidAmount >= payable.amount - 0.01
        ? 'paid'
        : newPaidAmount > 0
          ? 'partially_paid'
          : 'pending';

      payablesService.update({
        ...payable,
        loadingId: payable.loadingId || loading.id,
        paidAmount: newPaidAmount,
        status
      });
    }
  });
};

// Função para forçar reconciliação (reseta o flag hasRun)
export const forceReconcilePayables = async () => {
  if (isSqlCanonicalOpsEnabled()) {
    sqlCanonicalOpsLog('forceReconcilePayables ignorado: SQL canônico ativo');
    return;
  }

  hasRun = false;
  await reconcilePayablesFromHistory();
  // Também reconciliar diretamente dos pedidos (para pagamentos antigos)
  await reconcilePayablesFromOrders();
  await reconcilePayablesFromFreights();
};

// Expor no window para debug via console do browser
if (typeof window !== 'undefined') {
  (window as any).forceReconcilePayables = forceReconcilePayables;
  (window as any).debugPayables = () => {
    const payables = payablesService.getAll();
    const records = standaloneRecordsService.getAll().filter(r => r.subType === 'purchase_order');
    return { payables, records };
  };
  
  // Função de correção direta para o payable do parceiro
  (window as any).fixPayableForOrder = async (orderNumber: string) => {
    const orders = await purchaseService.loadFromSupabase();
    const order = orders.find(o => o.number === orderNumber);
    
    if (!order) {
      return;
    }
    
    
    const payables = payablesService.getAll().filter(p => p.subType === 'purchase_order');
    
    // Buscar payable por descrição ou valor
    let payable = payables.find(p => 
      p.description.includes(orderNumber) ||
      (Math.abs(p.amount - (order.totalValue || 0)) < 0.01 && p.partnerId === order.partnerId)
    );
    
    if (!payable) {
      return;
    }
    
    
    const orderPaidValue = (order.paidValue || 0) + (order.discountValue || 0);
    const newStatus: Payable['status'] = orderPaidValue >= payable.amount - 0.01
      ? 'paid'
      : orderPaidValue > 0
        ? 'partially_paid'
        : 'pending';
    
    
    payablesService.update({
      ...payable,
      purchaseOrderId: order.id,
      paidAmount: Number(orderPaidValue.toFixed(2)),
      status: newStatus
    });
    
    return payable;
  };
}
