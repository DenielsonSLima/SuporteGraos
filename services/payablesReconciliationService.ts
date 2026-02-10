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

// Reconciliar payables diretamente dos pedidos de compra (para pagamentos sem histórico ORIGIN)
export const reconcilePayablesFromOrders = async () => {
  console.log('🔄 [RECONCILE] Iniciando reconciliação de payables a partir dos pedidos de compra...');
  
  const allPayables = payablesService.getAll();
  const payables = allPayables.filter(p => p.subType === 'purchase_order');
  const orders = purchaseService.getAll();
  
  console.log(`📊 [RECONCILE] Total de payables purchase_order: ${payables.length}`);
  console.log(`📊 [RECONCILE] Total de pedidos de compra: ${orders.length}`);
  
  // Log todos os payables para debug
  payables.forEach(p => {
    console.log(`  💳 Payable: id=${p.id.substring(0,8)}, purchaseOrderId=${p.purchaseOrderId || 'VAZIO'}, desc=${p.description}, amount=${p.amount}, paidAmount=${p.paidAmount}, partnerId=${p.partnerId}`);
  });
  
  let updated = 0;
  let fixed = 0;
  
  // Para cada pedido de compra, encontrar o payable correspondente
  for (const order of orders) {
    if (!order.totalValue || order.totalValue <= 0) continue;
    
    const orderPaidValue = toNumber(order.paidValue) + toNumber(order.discountValue);
    console.log(`\n🔍 [RECONCILE] Processando pedido ${order.number}: totalValue=${order.totalValue}, paidValue=${orderPaidValue}`);
    
    // Estratégia 1: Buscar payable por purchaseOrderId
    let payable = payables.find(p => p.purchaseOrderId === order.id);
    console.log(`  Busca 1 (purchaseOrderId=${order.id}): ${payable?.id || 'N/A'}`);
    
    // Estratégia 2: Buscar por número do pedido na descrição
    if (!payable) {
      payable = payables.find(p => 
        p.description.includes(order.number || '') && 
        p.partnerId === order.partnerId
      );
      console.log(`  Busca 2 (desc contém ${order.number}): ${payable?.id || 'N/A'}`);
    }
    
    // Estratégia 3: Buscar por valor + partnerId (tolerância de 1 centavo)
    if (!payable) {
      payable = payables.find(p => 
        Math.abs(p.amount - (order.totalValue || 0)) < 1 && 
        p.partnerId === order.partnerId
      );
      console.log(`  Busca 3 (amount≈${order.totalValue} + partnerId): ${payable?.id || 'N/A'}`);
    }
    
    // Estratégia 4: Buscar só por partnerId e status pendente
    if (!payable) {
      payable = payables.find(p => 
        p.partnerId === order.partnerId &&
        (p.status === 'pending' || p.status === 'partially_paid') &&
        !p.purchaseOrderId
      );
      console.log(`  Busca 4 (partnerId + pending/partially_paid): ${payable?.id || 'N/A'}`);
    }
    
    if (!payable) {
      console.log(`  ⚠️ Nenhum payable encontrado para pedido ${order.number} (${order.id})`);
      continue;
    }
    
    // Corrigir purchaseOrderId se estiver vazio
    if (!payable.purchaseOrderId) {
      console.log(`  🔧 Corrigindo purchaseOrderId do payable ${payable.id} para ${order.id}`);
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
      
      console.log(`  ✅ Atualizando payable ${payable.id}: paidAmount ${payablePaidAmount} -> ${orderPaidValue}, status -> ${newStatus}`);
      
      payablesService.update({
        ...payable,
        purchaseOrderId: order.id, // Garantir que está correto
        paidAmount: Number(orderPaidValue.toFixed(2)),
        status: newStatus
      });
      
      updated++;
    }
  }
  
  console.log(`🔄 Reconciliação concluída: ${updated} payables atualizados, ${fixed} associações corrigidas`);
  return { updated, fixed };
};

// Função para forçar reconciliação (reseta o flag hasRun)
export const forceReconcilePayables = async () => {
  hasRun = false;
  await reconcilePayablesFromHistory();
  // Também reconciliar diretamente dos pedidos (para pagamentos antigos)
  await reconcilePayablesFromOrders();
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
  
  // Função de correção direta para o payable do parceiro
  (window as any).fixPayableForOrder = async (orderNumber: string) => {
    const orders = purchaseService.getAll();
    const order = orders.find(o => o.number === orderNumber);
    
    if (!order) {
      console.log(`❌ Pedido ${orderNumber} não encontrado`);
      return;
    }
    
    console.log(`📝 Pedido encontrado: ${order.id}, paidValue=${order.paidValue}, totalValue=${order.totalValue}`);
    
    const payables = payablesService.getAll().filter(p => p.subType === 'purchase_order');
    
    // Buscar payable por descrição ou valor
    let payable = payables.find(p => 
      p.description.includes(orderNumber) ||
      (Math.abs(p.amount - (order.totalValue || 0)) < 0.01 && p.partnerId === order.partnerId)
    );
    
    if (!payable) {
      console.log(`❌ Nenhum payable encontrado para pedido ${orderNumber}`);
      console.log('Payables disponíveis:', payables.map(p => ({ id: p.id, desc: p.description, purchaseOrderId: p.purchaseOrderId })));
      return;
    }
    
    console.log(`✅ Payable encontrado: ${payable.id}, purchaseOrderId=${payable.purchaseOrderId || 'VAZIO'}, paidAmount=${payable.paidAmount}`);
    
    const orderPaidValue = (order.paidValue || 0) + (order.discountValue || 0);
    const newStatus: Payable['status'] = orderPaidValue >= payable.amount - 0.01
      ? 'paid'
      : orderPaidValue > 0
        ? 'partially_paid'
        : 'pending';
    
    console.log(`🔧 Atualizando: purchaseOrderId=${order.id}, paidAmount=${orderPaidValue}, status=${newStatus}`);
    
    payablesService.update({
      ...payable,
      purchaseOrderId: order.id,
      paidAmount: Number(orderPaidValue.toFixed(2)),
      status: newStatus
    });
    
    console.log('✅ Payable atualizado com sucesso!');
    return payable;
  };
}
