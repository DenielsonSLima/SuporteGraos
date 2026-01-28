
import { FinancialRecord, TransferRecord } from '../modules/Financial/types';
import { purchaseService } from './purchaseService';
import { salesService } from './salesService';
import { loadingService } from './loadingService';
import { assetService } from './assetService';
import { logService } from './logService';
import { authService } from './authService';
import { Persistence } from './persistence';
import { invalidateFinancialCache } from './financialCache';

const standaloneDb = new Persistence<FinancialRecord>('standalone_records', []);
const transfersDb = new Persistence<TransferRecord>('transfers', []);

const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return { userId: user?.id || 'system', userName: user?.name || 'Sistema' };
};

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const financialActionService = {
  getStandaloneRecords: () => standaloneDb.getAll(),
  getTransfers: () => transfersDb.getAll(),

  processRecord: (recordId: string, data: any, subType?: string) => {
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

    const standalone = standaloneDb.getById(recordId);
    if (standalone) {
        const currentPaid = standalone.paidValue || 0;
        const currentDisc = standalone.discountValue || 0;
        
        standaloneDb.update({
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
        const orderId = recordId.replace('po-grain-', '');
        const order = purchaseService.getById(orderId);
        if (order) {
            const newPaid = (order.paidValue || 0) + transactionValue;
            const newDiscount = (order.discountValue || 0) + discountValue;
            purchaseService.update({
                ...order,
                paidValue: newPaid,
                discountValue: newDiscount,
                transactions: [commonTx as any, ...(order.transactions || [])]
            });
        }
    } else if (subType === 'sales_order') {
        const orderId = recordId.replace('so-', '');
        const order = salesService.getById(orderId);
        if (order) {
            salesService.update({
                ...order,
                paidValue: (order.paidValue || 0) + transactionValue,
                transactions: [commonTx as any, ...(order.transactions || [])]
            });
        }
    } else if (subType === 'freight') {
        const loadingId = recordId.replace('fr-', '');
        const loading = loadingService.getAll().find(l => l.id === loadingId);
        if (loading) {
            loadingService.update({
                ...loading,
                freightPaid: (loading.freightPaid || 0) + transactionValue,
                transactions: [commonTx as any, ...(loading.transactions || [])]
            });
        }
    }

    if (!recordId.startsWith('hist-')) {
        standaloneDb.add({
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
          notes: data.notes
        });
    }

    logService.addLog({
        userId, userName, action: 'approve', module: 'Financeiro',
        description: `Baixa Realizada: ${formatCurrency(transactionValue)} ${discountValue > 0 ? `(+ Abatimento: ${formatCurrency(discountValue)})` : ''}`,
        entityId: recordId
    });
    
    invalidateFinancialCache();
  },

  addAdminExpense: (record: FinancialRecord) => {
    standaloneDb.add(record);
    invalidateFinancialCache();
  },
  deleteStandaloneRecord: (id: string) => {
    standaloneDb.delete(id);
    invalidateFinancialCache();
  },
  
  importData: (expenses: FinancialRecord[], transfers: TransferRecord[]) => {
    if (expenses) standaloneDb.setAll(expenses);
    if (transfers) transfersDb.setAll(transfers);
  },

  syncDeleteFromOrigin: (originTxId: string) => standaloneDb.delete(`hist-${originTxId}`),
  
  addTransfer: (transfer: TransferRecord) => {
    transfersDb.add(transfer);
    const { userId, userName } = getLogInfo();
    logService.addLog({ userId, userName, action: 'create', module: 'Financeiro', description: `Transferência bancária: ${transfer.originAccount} -> ${transfer.destinationAccount} no valor de ${formatCurrency(transfer.value)}` });
    invalidateFinancialCache();
  },

  updateTransfer: (transfer: TransferRecord) => {
    transfersDb.update(transfer);
    const { userId, userName } = getLogInfo();
    logService.addLog({ userId, userName, action: 'update', module: 'Financeiro', description: `Editou transferência ID ${transfer.id}` });
  },

  deleteTransfer: (id: string) => {
    const t = transfersDb.getById(id);
    transfersDb.delete(id);
    const { userId, userName } = getLogInfo();
    logService.addLog({ userId, userName, action: 'delete', module: 'Financeiro', description: `Excluiu transferência de ${formatCurrency(t?.value || 0)} entre ${t?.originAccount} e ${t?.destinationAccount}` });
  }
};
