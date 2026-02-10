
import { FinancialRecord, TransferRecord } from '../modules/Financial/types';
import { purchaseService } from './purchaseService';
import { salesService } from './salesService';
import { loadingService } from './loadingService';
import { assetService } from './assetService';
import { logService } from './logService';
import { authService } from './authService';
import { invalidateFinancialCache } from './financialCache';
import { invalidateDashboardCache } from './dashboardCache';
import { standaloneRecordsService } from './standaloneRecordsService';
import { transfersService, Transfer } from './financial/transfersService';
import { receivablesService, Receivable } from './financial/receivablesService';
import { payablesService, Payable } from './financial/payablesService';

const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return { userId: user?.id || 'system', userName: user?.name || 'Sistema' };
};

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const resolveAccountId = (value: string) => {
  if (typeof window === 'undefined') return value;
  const accounts = ((window as any).bankAccountsList || []);
  const byId = accounts.find((a: any) => a.id === value);
  if (byId) return byId.id;
  const byName = accounts.find((a: any) => a.bankName === value);
  return byName ? byName.id : value;
};

const resolveAccountLabel = (accountId: string) => {
  if (typeof window === 'undefined') return accountId;
  const accounts = ((window as any).bankAccountsList || []);
  const acc = accounts.find((a: any) => a.id === accountId) || accounts.find((a: any) => a.bankName === accountId);
  return acc ? `${acc.bankName}${acc.owner ? ` - ${acc.owner}` : ''}` : accountId;
};

const mapTransferToRecord = (transfer: Transfer): TransferRecord => ({
  id: transfer.id,
  date: transfer.transferDate,
  originAccount: resolveAccountLabel(transfer.fromAccountId),
  destinationAccount: resolveAccountLabel(transfer.toAccountId),
  value: transfer.amount,
  description: transfer.description,
  user: authService.getCurrentUser()?.name || 'Sistema'
});

const mapRecordToTransfer = (record: TransferRecord): Transfer => ({
  id: record.id,
  transferDate: record.date,
  fromAccountId: resolveAccountId(record.originAccount),
  toAccountId: resolveAccountId(record.destinationAccount),
  amount: record.value,
  description: record.description,
  notes: undefined
});

export const financialActionService = {
  getStandaloneRecords: () => standaloneRecordsService.getAll(),
  getTransfers: () => transfersService.getAll().map(mapTransferToRecord),

  processRecord: async (recordId: string, data: any, subType?: string) => {
    const { userId, userName } = getLogInfo();
    const transactionValue = parseFloat(data.amount) || 0;
    const discountValue = parseFloat(data.discount) || 0;
    const isPureAdjustment = transactionValue === 0 && discountValue > 0;
    // Corrigir para salvar o nome da conta bancária
    let accountName = data.accountName;
    if (!accountName && data.accountId && typeof window !== 'undefined') {
      // Buscar nome do banco pelo id se necessário
      const bankAccounts = ((window as any).bankAccountsList || []);
      const found = bankAccounts.find((a: any) => a.id === data.accountId);
      accountName = found ? found.bankName : data.accountId;
    }
    
    if (data.isAsset && data.assetName) {
      assetService.add({
        id: Math.random().toString(36).substr(2, 9),
        name: data.assetName,
        type: 'other',
        status: 'active',
        acquisitionDate: data.date,
        acquisitionValue: transactionValue + discountValue,
        origin: 'trade_in',
        originDescription: `Recebido de ${data.entityName || 'Parceiro'} para quitar saldo.`
      });
    }

    const standalone = standaloneRecordsService.getById(recordId);
    if (standalone) {
        const currentPaid = standalone.paidValue || 0;
        const currentDisc = standalone.discountValue || 0;
        
        await standaloneRecordsService.update({
          ...standalone,
          paidValue: currentPaid + transactionValue,
          discountValue: currentDisc + discountValue,
          settlementDate: data.date, 
          status: (currentPaid + transactionValue + currentDisc + discountValue) >= standalone.originalValue - 0.01 ? 'paid' : 'partial',
          bankAccount: isPureAdjustment ? 'ABATIMENTO/QUEBRA' : accountName,
          notes: data.notes
        });
    }

    const txId = Math.random().toString(36).substr(2, 9);
    const commonTx = {
        id: txId,
        date: data.date,
        value: transactionValue,
        discountValue: discountValue,
        accountId: data.accountId || 'discount_virtual',
        accountName: isPureAdjustment ? 'ABATIMENTO' : accountName,
        notes: data.notes,
        type: subType === 'sales_order' ? 'receipt' : 'payment'
    };

    if (subType === 'purchase_order') {
        // CORREÇÃO: Detectar se recordId é UUID (do payable) ou formatado (po-grain-...)
        const isPayableUUID = !recordId.startsWith('po-grain-');
        let orderId: string = '';
        let payable: Payable | undefined;
        let order: any;
        
        // Se for UUID do payable, buscar primeiro para obter o purchaseOrderId
        if (isPayableUUID) {
            payable = payablesService.getById(recordId);
            if (payable) {
                orderId = payable.purchaseOrderId || '';
                console.log(`[PAGAMENTO] ID é UUID do payable: ${recordId.substring(0, 8)}..., purchaseOrderId=${orderId || 'VAZIO'}`);
                
                // Se purchaseOrderId estiver vazio, tentar buscar pelo número do pedido na descrição
                if (!orderId && payable.description) {
                    const match = payable.description.match(/PC-\d{4}-\d+|#PC-\d+/i);
                    if (match) {
                        const orderNumber = match[0];
                        order = purchaseService.getAll().find(o => o.number === orderNumber);
                        if (order) {
                            orderId = order.id;
                            console.log(`[PAGAMENTO] Pedido encontrado pelo número ${orderNumber}: ${orderId}`);
                            // Corrigir o purchaseOrderId no payable para futuras operações
                            payablesService.update({ ...payable, purchaseOrderId: orderId });
                        }
                    }
                }
                
                // Se ainda não encontrou, tentar pelo partnerId + valor
                if (!orderId && payable.partnerId && payable.amount > 0) {
                    order = purchaseService.getAll().find(o => 
                        o.partnerId === payable!.partnerId && 
                        Math.abs((o.totalValue || 0) - payable!.amount) < 1
                    );
                    if (order) {
                        orderId = order.id;
                        console.log(`[PAGAMENTO] Pedido encontrado pelo partnerId+valor: ${orderId}`);
                        // Corrigir o purchaseOrderId no payable para futuras operações
                        payablesService.update({ ...payable, purchaseOrderId: orderId });
                    }
                }
            } else {
                orderId = recordId;
                console.log(`[PAGAMENTO] ⚠️ Payable não encontrado pelo UUID: ${recordId}`);
            }
        } else {
            orderId = recordId.replace('po-grain-', '');
        }
        
        console.log(`[PAGAMENTO] processRecord: recordId=${recordId}, orderId=${orderId}, isPayableUUID=${isPayableUUID}`);
        
        // Buscar o pedido se ainda não foi encontrado
        if (!order && orderId) {
            order = purchaseService.getById(orderId);
        }
        
        if (order) {
            const newPaid = (order.paidValue || 0) + transactionValue;
            const newDiscount = (order.discountValue || 0) + discountValue;
            console.log(`[PAGAMENTO] Pedido encontrado: ${order.number}, paidValue=${order.paidValue} -> ${newPaid}`);
            purchaseService.update({
                ...order,
                paidValue: newPaid,
                discountValue: newDiscount,
                transactions: [commonTx as any, ...(order.transactions || [])]
            });
        } else {
            console.log(`[PAGAMENTO] Pedido NÃO encontrado: ${orderId}`);
        }

        // Atualizar o payable correspondente - BUSCA ROBUSTA (apenas purchase_order!)
        // Se já encontramos o payable antes (quando veio como UUID), usar ele
        if (!payable) {
          const allPayables = payablesService.getAll().filter(p => p.subType === 'purchase_order');
          console.log(`[PAGAMENTO] Total payables do tipo purchase_order: ${allPayables.length}`);
          
          // Log de todos os payables de purchase_order para debug
          allPayables.forEach(p => {
            console.log(`[PAGAMENTO] PayableDB: id=${p.id.substring(0, 8)}..., purchaseOrderId=${p.purchaseOrderId || 'VAZIO'}, desc=${p.description}, amount=${p.amount}, paidAmount=${p.paidAmount}`);
          });
          
          // Estratégia 1: Por ID direto (recordId)
          payable = payablesService.getById(recordId);
          console.log(`[PAGAMENTO] Busca 1 (ID direto ${recordId}): ${payable?.id || 'N/A'}`);
          
          // Estratégia 2: Por purchaseOrderId
          if (!payable && orderId) {
            payable = allPayables.find(p => p.purchaseOrderId === orderId);
            console.log(`[PAGAMENTO] Busca 2 (purchaseOrderId=${orderId}): ${payable?.id || 'N/A'}`);
          }
          
          // Estratégia 3: Por número do pedido na descrição + partnerId
          if (!payable && order) {
            payable = allPayables.find(p => 
              p.description.includes(order.number || '') &&
              p.partnerId === order.partnerId
            );
            console.log(`[PAGAMENTO] Busca 3 (número ${order.number} + partnerId): ${payable?.id || 'N/A'}`);
          }
          
          // Estratégia 4: Por valor total + partnerId (fallback)
          if (!payable && order) {
            payable = allPayables.find(p => 
              Math.abs(p.amount - (order.totalValue || 0)) < 0.01 &&
              p.partnerId === order.partnerId
            );
            console.log(`[PAGAMENTO] Busca 4 (valor ${order.totalValue} + partnerId): ${payable?.id || 'N/A'}`);
          }
        }
        
        if (payable) {
          const newPaidAmount = (payable.paidAmount || 0) + transactionValue + discountValue;
          const status: Payable['status'] = newPaidAmount >= payable.amount - 0.01
            ? 'paid'
            : newPaidAmount > 0
            ? 'partially_paid'
            : 'pending';

          console.log(`[PAGAMENTO] ✅ Atualizando payable ${payable.id}: ${payable.paidAmount} -> ${newPaidAmount}, status=${status}`);
          
          // Garantir que o purchaseOrderId está correto
          payablesService.update({
            ...payable,
            purchaseOrderId: payable.purchaseOrderId || orderId, // Corrigir se estiver vazio
            paidAmount: Number(newPaidAmount.toFixed(2)),
            status
          });
        } else {
          console.log(`[PAGAMENTO] ⚠️ NENHUM PAYABLE ENCONTRADO para recordId=${recordId} ou orderId=${orderId}`);
          // Criar payable se não existir
          if (order) {
            console.log(`[PAGAMENTO] 🔧 Criando payable para o pedido ${order.number}...`);
            const newPayableId = Math.random().toString(36).substr(2, 9);
            payablesService.add({
              id: newPayableId,
              purchaseOrderId: order.id,
              partnerId: order.partnerId,
              partnerName: order.partnerName,
              description: `Pedido de Compra ${order.number}`,
              dueDate: new Date(new Date(order.date).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              amount: order.totalValue || 0,
              paidAmount: transactionValue + discountValue,
              status: (transactionValue + discountValue) >= (order.totalValue || 0) - 0.01 ? 'paid' : 'partially_paid',
              subType: 'purchase_order',
              notes: `Fornecedor: ${order.partnerName}`
            });
            console.log(`[PAGAMENTO] ✅ Payable criado: ${newPayableId}`);
          }
        }
    } else if (subType === 'sales_order') {
      const orderIdFromPrefix = recordId.startsWith('so-') ? recordId.replace('so-', '') : '';
      const directReceivable = receivablesService.getById(recordId);
      const orderId = orderIdFromPrefix || directReceivable?.salesOrderId || '';

      const receivable = directReceivable || (orderId ? receivablesService.getAll().find(r => r.salesOrderId === orderId) : undefined);
      if (receivable) {
        const newReceived = (receivable.receivedAmount || 0) + transactionValue + discountValue;
        const status: Receivable['status'] = newReceived >= receivable.amount - 0.01
          ? 'received'
          : newReceived > 0
          ? 'partially_received'
          : 'pending';

        receivablesService.update({
          ...receivable,
          receivedAmount: Number(newReceived.toFixed(2)),
          status
        });
      }

      if (orderId) {
        const order = salesService.getById(orderId);
        if (order) {
          salesService.update({
            ...order,
            paidValue: (order.paidValue || 0) + transactionValue,
            transactions: [commonTx as any, ...(order.transactions || [])]
          });
        }
      }
    } else if (subType === 'freight') {
        // CORREÇÃO: Detectar se recordId é UUID (do payable) ou formatado (fr-...)
        const isPayableUUID = !recordId.startsWith('fr-');
        let loadingId: string;
        let payable: Payable | undefined;
        
        // Se for UUID do payable de frete, buscar o loading correspondente
        if (isPayableUUID) {
            const allFreightPayables = payablesService.getAll().filter(p => p.subType === 'freight');
            payable = allFreightPayables.find(p => p.id === recordId);
            if (payable) {
                // Tentar extrair loadingId da descrição ou notes
                const descMatch = payable.description.match(/Frete.*?(?:ID|id|Carga)?\s*(\w{8,})/i);
                loadingId = descMatch ? descMatch[1] : recordId;
                console.log(`[PAGAMENTO FRETE] ID é UUID do payable: ${recordId.substring(0, 8)}..., loadingId tentativo=${loadingId}`);
            } else {
                loadingId = recordId;
                console.log(`[PAGAMENTO FRETE] ⚠️ Payable de frete não encontrado: ${recordId}`);
            }
        } else {
            loadingId = recordId.replace('fr-', '');
        }
        
        // Buscar o loading
        let loading = loadingService.getAll().find(l => l.id === loadingId);
        
        // Se não encontrou pelo id, tentar buscar pelo payable (vehiclePlate)
        if (!loading && payable) {
            const plateMatch = payable.description.match(/[A-Z]{3}[-\s]?\d{1}[A-Z0-9]\d{2}/i);
            if (plateMatch) {
                loading = loadingService.getAll().find(l => l.vehiclePlate === plateMatch[0].replace(/\s/g, ''));
                console.log(`[PAGAMENTO FRETE] Busca por placa ${plateMatch[0]}: ${loading?.id || 'N/A'}`);
            }
        }
        
        if (loading) {
            console.log(`[PAGAMENTO FRETE] ✅ Loading encontrado: ${loading.id}, freightPaid=${loading.freightPaid} -> ${(loading.freightPaid || 0) + transactionValue}`);
            loadingService.update({
                ...loading,
                freightPaid: (loading.freightPaid || 0) + transactionValue,
                transactions: [commonTx as any, ...(loading.transactions || [])]
            });
            
            // Também atualizar o payable de frete
            if (payable) {
                const newPaidAmount = (payable.paidAmount || 0) + transactionValue + discountValue;
                const status: Payable['status'] = newPaidAmount >= payable.amount - 0.01 ? 'paid' : newPaidAmount > 0 ? 'partially_paid' : 'pending';
                payablesService.update({
                    ...payable,
                    paidAmount: Number(newPaidAmount.toFixed(2)),
                    status
                });
                console.log(`[PAGAMENTO FRETE] ✅ Payable atualizado: ${payable.id.substring(0, 8)}..., paidAmount=${newPaidAmount}`);
            }
        } else {
            console.log(`[PAGAMENTO FRETE] ⚠️ Loading NÃO encontrado para: ${loadingId}`);
        }
    }

    const shouldSkipHistory = standalone?.subType === 'admin' && subType === 'admin';
    if (!recordId.startsWith('hist-') && !shouldSkipHistory) {
        await standaloneRecordsService.add({
          id: `hist-${txId}`,
          description: `${isPureAdjustment ? 'Abatimento' : 'Baixa'} de ${subType === 'sales_order' ? 'Recebimento' : 'Pagamento'}`,
          entityName: data.entityName || 'Parceiro',
          category: isPureAdjustment ? 'Desconto/Ajuste' : 'Liquidação Operacional',
          dueDate: data.date,
          issueDate: data.date,
          settlementDate: data.date,
          originalValue: transactionValue + discountValue,
          paidValue: transactionValue, 
          discountValue: discountValue,
          status: 'paid',
          subType: (subType as any) || 'admin',
          bankAccount: isPureAdjustment ? 'ABATIMENTO' : accountName,
          notes: `${data.notes || ''} [ORIGIN:${recordId}]`.trim()
        });
    }

    logService.addLog({
        userId, userName, action: 'approve', module: 'Financeiro',
        description: `Baixa Realizada: ${formatCurrency(transactionValue)} ${discountValue > 0 ? `(+ Abatimento: ${formatCurrency(discountValue)})` : ''}`,
        entityId: recordId
    });
    
    invalidateFinancialCache();
    invalidateDashboardCache();
  },

  addAdminExpense: async (record: FinancialRecord) => {
    await standaloneRecordsService.add(record);
    // Cache já é invalidado no standaloneRecordsService
  },
  deleteStandaloneRecord: async (id: string) => {
    await standaloneRecordsService.delete(id);
    // Cache já é invalidado no standaloneRecordsService
  },
  
  importData: async (expenses: FinancialRecord[], transfers: TransferRecord[]) => {
    if (expenses) await standaloneRecordsService.importData(expenses);
    if (transfers && transfers.length > 0) {
      transfers.forEach(t => {
        const mapped = mapRecordToTransfer(t);
        const existing = transfersService.getById(mapped.id);
        if (existing) transfersService.update(mapped);
        else transfersService.add(mapped);
      });
      invalidateFinancialCache();
      invalidateDashboardCache();
    }
    // Cache já é invalidado no standaloneRecordsService para expenses
  },

  syncDeleteFromOrigin: async (originTxId: string) => {
    await standaloneRecordsService.delete(`hist-${originTxId}`);
    // Cache já é invalidado no standaloneRecordsService
  },
  
  addTransfer: (transfer: TransferRecord) => {
    const mapped = mapRecordToTransfer(transfer);
    transfersService.add(mapped);
    const { userId, userName } = getLogInfo();
    logService.addLog({ userId, userName, action: 'create', module: 'Financeiro', description: `Transferência bancária: ${transfer.originAccount} -> ${transfer.destinationAccount} no valor de ${formatCurrency(transfer.value)}` });
    invalidateFinancialCache();
    invalidateDashboardCache();
  },

  updateTransfer: (transfer: TransferRecord) => {
    const mapped = mapRecordToTransfer(transfer);
    transfersService.update(mapped);
    const { userId, userName } = getLogInfo();
    logService.addLog({ userId, userName, action: 'update', module: 'Financeiro', description: `Editou transferência ID ${transfer.id}` });
    invalidateFinancialCache();
    invalidateDashboardCache();
  },

  deleteTransfer: (id: string) => {
    const t = transfersService.getById(id);
    transfersService.delete(id);
    const { userId, userName } = getLogInfo();
    const origin = t ? resolveAccountLabel(t.fromAccountId) : 'Conta origem';
    const dest = t ? resolveAccountLabel(t.toAccountId) : 'Conta destino';
    logService.addLog({ userId, userName, action: 'delete', module: 'Financeiro', description: `Excluiu transferência de ${formatCurrency(t?.amount || 0)} entre ${origin} e ${dest}` });
    invalidateFinancialCache();
    invalidateDashboardCache();
  }
};
