import { payablesService, Payable } from './financial/payablesService';
import { purchaseService } from './purchaseService';
import { standaloneRecordsService } from './standaloneRecordsService';

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
  if (hasRun) return;
  hasRun = true;

  console.log('🔄 Iniciando reconciliação de payables...');

  // Buscar histórico de pagamentos de purchase_order
  const allRecords = standaloneRecordsService.getAll();
  console.log(`📊 Total de registros no histórico: ${allRecords.length}`);
  
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

  console.log(`📊 Pagamentos de purchase_order encontrados: ${history.length}`);
  
  if (history.length === 0) {
    console.log('⚠️ Nenhum pagamento de purchase_order encontrado no histórico');
    return;
  }

  // Agrupar por origem (ID do pedido/payable)
  const historyByOrigin = new Map<string, typeof history>();
  for (const record of history) {
    const origin = parseOrigin(record.notes);
    console.log(`  📝 Registro ${record.id}: origin=${origin || 'N/A'}, valor=${record.value}`);
    if (!origin) continue;
    if (!historyByOrigin.has(origin)) historyByOrigin.set(origin, []);
    historyByOrigin.get(origin)!.push(record);
  }

  console.log(`📊 Origins únicos encontrados: ${historyByOrigin.size}`);
  
  if (historyByOrigin.size === 0) {
    console.log('⚠️ Nenhuma origem válida encontrada nos pagamentos');
    return;
  }

  const payables = payablesService.getAll();
  console.log(`📊 Total de payables: ${payables.length}`);
  
  const payableById = new Map(payables.map(p => [p.id, p] as [string, Payable]));
  const payableByOrder = new Map(
    payables
      .filter(p => p.purchaseOrderId)
      .map(p => [p.purchaseOrderId!, p] as [string, Payable])
  );
  
  console.log(`📊 Payables com purchaseOrderId: ${payableByOrder.size}`);
  payables.forEach(p => {
    console.log(`  💳 Payable ${p.id}: purchaseOrderId=${p.purchaseOrderId || 'N/A'}, amount=${p.amount}, paidAmount=${p.paidAmount}`);
  });

  const orders = purchaseService.getAll();
  const orderById = new Map(orders.map(o => [o.id, o]));

  historyByOrigin.forEach((records, origin) => {
    const totalPaid = records.reduce((acc, r) => acc + r.value + r.discountValue, 0);
    console.log(`\n🔍 Processando origin: ${origin}, totalPaid: ${totalPaid}`);
    if (totalPaid <= 0) return;

    // Tentar encontrar o orderId a partir do origin
    const orderIdFromOrigin = origin.startsWith('po-grain-') ? origin.replace('po-grain-', '') : '';
    console.log(`  orderId extraído: ${orderIdFromOrigin || 'N/A'}`);
    
    const payableFromOrigin = payableById.get(origin);
    console.log(`  payable por ID direto: ${payableFromOrigin?.id || 'N/A'}`);
    
    const orderId = orderIdFromOrigin || payableFromOrigin?.purchaseOrderId || '';

    // Atualizar payable
    let payable = payableFromOrigin || (orderId ? payableByOrder.get(orderId) : undefined);
    console.log(`  payable por purchaseOrderId: ${payable?.id || 'N/A'}`);
    
    // Se ainda não encontrou, procurar por nome do parceiro ou qualquer payable com o mesmo purchaseOrderId
    if (!payable && orderId) {
      payable = payables.find(p => p.purchaseOrderId === orderId);
      console.log(`  payable por busca direta: ${payable?.id || 'N/A'}`);
    }
    
    if (payable) {
      const newPaidAmount = Number(totalPaid.toFixed(2));
      console.log(`  Atualizando payable: atual=${payable.paidAmount}, novo=${newPaidAmount}`);
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
        console.log(`✅ Payable reconciliado: ${payable.id} - R$ ${newPaidAmount.toFixed(2)}`);
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
          console.log(`✅ Pedido de compra reconciliado: ${order.id} - R$ ${newPaidValue.toFixed(2)}`);
        }
      }
    }
  });

  console.log('🔄 Reconciliação de payables concluída');
};

// Função para forçar reconciliação (reseta o flag hasRun)
export const forceReconcilePayables = async () => {
  hasRun = false;
  await reconcilePayablesFromHistory();
};

// Expor no window para debug via console do browser
if (typeof window !== 'undefined') {
  (window as any).forceReconcilePayables = forceReconcilePayables;
  (window as any).debugPayables = () => {
    const payables = payablesService.getAll();
    const records = standaloneRecordsService.getAll().filter(r => r.subType === 'purchase_order');
    console.log('=== DEBUG PAYABLES ===');
    console.log('Payables:', payables);
    console.log('Histórico de pagamentos purchase_order:', records);
    return { payables, records };
  };
}
