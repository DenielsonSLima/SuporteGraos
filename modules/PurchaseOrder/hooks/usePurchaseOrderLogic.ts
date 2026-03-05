
import { useState, useEffect, useMemo } from 'react';
import { PurchaseOrder, OrderTransaction } from '../types';
import { Loading } from '../../Loadings/types';
import { loadingService } from '../../../services/loadingService';
// ✅ SKIL Gap 7: LoadingCache removido — loadingService.getByPurchaseOrder() lê direto do db (sempre fresh)
import { purchaseService } from '../../../services/purchaseService';
import { financialActionService } from '../../../services/financialActionService';
import { useToast } from '../../../contexts/ToastContext';
import { SettingsCache } from '../../../services/settingsCache';
import { ledgerService } from '../../../services/ledgerService';
import { payablesService } from '../../../services/financial/payablesService';

export const usePurchaseOrderLogic = (initialOrder: PurchaseOrder, onFinalizeCallback: () => void) => {
  const { addToast } = useToast();
  const [currentOrder, setCurrentOrder] = useState<PurchaseOrder>(initialOrder);
  const [loadings, setLoadings] = useState<Loading[]>([]);
  const [isFinalizePromptOpen, setIsFinalizePromptOpen] = useState(false);

  // Function to refresh loadings and order data
  const refreshLoadings = (id?: string) => {
    const orderId = id || currentOrder.id;
    const list = loadingService.getByPurchaseOrder(orderId);
    setLoadings([...list]);
    const freshOrder = purchaseService.getById(orderId);
    if (freshOrder) setCurrentOrder(freshOrder);
  };

  useEffect(() => {
    refreshLoadings(initialOrder.id);
  }, [initialOrder]);

  // Atualiza automaticamente quando houver mudanças no serviço (Realtime)
  useEffect(() => {
    const unsubscribe = loadingService.subscribe(() => {
      refreshLoadings();
    });
    return unsubscribe;
  }, [currentOrder.id]);

  const activeLoadings = useMemo(() => loadings.filter(l => l.status !== 'canceled'), [loadings]);

  const stats = useMemo(() => {
    const totalPurchaseVal = activeLoadings.reduce((acc, l) => acc + (l.totalPurchaseValue || 0), 0);
    const totalFreightVal = activeLoadings.reduce((acc, l) => acc + (l.totalFreightValue || 0), 0);
    const totalSalesVal = activeLoadings.reduce((acc, l) => acc + (l.totalSalesValue || 0), 0);

    const txs = currentOrder.transactions || [];

    const expensesDeducted = txs
      .filter(t => (t.type === 'expense' || t.type === 'commission') && t.deductFromPartner)
      .reduce((acc, t) => acc + t.value + (t.discountValue || 0), 0);

    const paidFromTx = txs
      .filter(t => t.type === 'payment' || t.type === 'advance')
      .reduce((acc, t) => acc + (t.value || 0), 0);
    const discFromTx = txs.reduce((acc, t) => acc + (t.discountValue || 0), 0);

    const totalPaidCash = Math.max(paidFromTx, currentOrder.paidValue || 0);
    const totalDisc = Math.max(discFromTx, currentOrder.discountValue || 0);

    const totalSettled = totalPaidCash + totalDisc + expensesDeducted;
    const balancePartner = Math.max(0, totalPurchaseVal - totalSettled);
    const advanceBalance = Math.max(0, totalSettled - totalPurchaseVal);

    const totalSc = activeLoadings.reduce((acc, l) => acc + l.weightSc, 0);
    const totalKg = activeLoadings.reduce((acc, l) => acc + l.weightKg, 0);

    const totalCommissionDue = currentOrder.hasBroker ? totalSc * (currentOrder.brokerCommissionPerSc || 0) : 0;

    return {
      totalPurchaseVal, totalFreightVal, totalSalesVal, totalSettled,
      totalAbatements: totalDisc + expensesDeducted,
      balancePartner, advanceBalance, totalSc, totalKg,
      avgSalesPrice: totalSc > 0 ? totalSalesVal / totalSc : 0,
      avgPurchasePrice: totalSc > 0 ? totalPurchaseVal / totalSc : 0,
      totalCommissionDue
    };
  }, [activeLoadings, currentOrder]);

  const actions = {
    // Exposed refreshLoadings to the actions object
    refreshLoadings,
    handleConfirmTransaction: async (data: any) => {
      try {
        await financialActionService.processRecord(`po-grain-${currentOrder.id}`, data, 'purchase_order');

        // ✅ FIX: Adicionar transação ao array local do pedido (para exibir no OrderFinancialCard)
        const txValue = parseFloat(data.amount) || 0;
        const txDiscount = parseFloat(data.discount) || 0;
        const tx: OrderTransaction = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'payment',
          date: data.date,
          value: txValue,
          discountValue: txDiscount,
          accountId: data.accountId,
          accountName: data.accountName || 'Caixa',
          notes: data.notes || ''
        };
        const updatedTxs = [tx, ...(currentOrder.transactions || [])];
        const newPaidValue = (currentOrder.paidValue || 0) + txValue + txDiscount;
        const updated = { ...currentOrder, transactions: updatedTxs, paidValue: newPaidValue, discountValue: (currentOrder.discountValue || 0) + txDiscount };
        purchaseService.update(updated);
        setCurrentOrder(updated);

        SettingsCache.refreshBalances();
        refreshLoadings();
        addToast('success', 'Pagamento Confirmado');

        // Verificar se pagamento quitou o saldo
        const totalPurchaseVal = loadings.filter(l => l.status !== 'canceled').reduce((acc, l) => acc + (l.totalPurchaseValue || 0), 0);
        if (totalPurchaseVal > 0 && newPaidValue >= totalPurchaseVal - 0.01) {
          setIsFinalizePromptOpen(true);
        }
      } catch (err: any) {
        console.error('[PO-PAYMENT] Erro completo:', err);
        addToast('error', `Erro ao confirmar pagamento: ${err?.message || 'Erro desconhecido'}`);
      }
    },
    handleRegisterAdvance: (data: any) => {
      const tx: OrderTransaction = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'advance',
        date: data.date,
        value: data.value,
        accountId: data.accountId,
        accountName: data.accountName,
        notes: data.description || 'Adiantamento'
      };
      const updated = { ...currentOrder, transactions: [tx, ...(currentOrder.transactions || [])], paidValue: (currentOrder.paidValue || 0) + data.value };
      purchaseService.update(updated);

      financialActionService.addAdminExpense({
        id: `adv-po-${tx.id}`,
        description: `Adiantamento Pedido ${currentOrder.number}`,
        entityName: currentOrder.partnerName,
        category: 'Adiantamentos',
        dueDate: data.date,
        issueDate: data.date,
        originalValue: data.value,
        paidValue: data.value,
        status: 'paid',
        subType: 'admin',
        bankAccount: data.accountName
      });
      SettingsCache.refreshBalances();
      ledgerService.onTransactionChange('add', tx);
      refreshLoadings();
      addToast('success', 'Adiantamento Concedido');
    },
    handleAddExpense: async (data: any) => {
      const tx = { id: Math.random().toString(36).substr(2, 9), type: 'expense' as const, ...data };
      // 1. Atualiza transação do pedido
      purchaseService.update({ ...currentOrder, transactions: [tx, ...(currentOrder.transactions || [])] });

      // 2. Cria movimentação financeira real (pagamento) (Legado)
      await financialActionService.processRecord(
        `expense-extra-${currentOrder.id}-${tx.id}`,
        {
          amount: tx.value,
          date: tx.date,
          accountId: tx.accountId,
          accountName: tx.accountName,
          bankAccount: tx.accountId,
          notes: tx.notes,
          entityName: currentOrder.partnerName,
          subType: 'expense',
          category: tx.expenseSubtypeName,
          isExtraExpense: true,
          deductFromPartner: tx.deductFromPartner,
        },
        'expense'
      );

      SettingsCache.refreshBalances();
      ledgerService.onTransactionChange('add', tx);
      refreshLoadings();
    },
    handleAddCommission: async (data: any) => {
      const tx = { id: Math.random().toString(36).substr(2, 9), type: 'commission' as const, ...data };
      const updated = { ...currentOrder, transactions: [tx, ...(currentOrder.transactions || [])] };
      purchaseService.update(updated);

      if (data.partnerId && data.value && data.value > 0) {
        const generateUUID = () => {
          if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
          const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
          return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
        };

        const payableId = generateUUID();

        // 1. Legado (Dual Write)
        payablesService.add({
          id: payableId,
          purchaseOrderId: currentOrder.id,
          partnerId: data.partnerId,
          partnerName: data.partnerName || 'Corretor',
          description: `Comissão de Corretagem - Pedido #${currentOrder.number}`,
          dueDate: currentOrder.date,
          amount: data.value,
          paidAmount: data.paid || 0,
          status: (data.paid || 0) >= data.value ? 'paid' : 'pending',
          subType: 'commission',
          notes: `Comissão: R$ ${data.value}/SC`
        });

        addToast('success', `💰 Comissão criada no financeiro`);
      }

      SettingsCache.refreshBalances();
      ledgerService.onTransactionChange('add', tx);
      refreshLoadings();
    },
    // Added handleSaveNote for persistent order observations
    handleSaveNote: (note: any) => {
      const newNote = { ...note, id: Math.random().toString(36).substr(2, 9) };
      const updated = { ...currentOrder, notesList: [newNote, ...(currentOrder.notesList || [])] };
      purchaseService.update(updated);
      refreshLoadings();
    },
    handleUpdateTx: (tx: OrderTransaction) => {
      purchaseService.updateTransaction(currentOrder.id, tx);
      SettingsCache.refreshBalances();
      ledgerService.onTransactionChange('update', tx);
      refreshLoadings();
    },
    handleDeleteTx: async (id: string) => {
      purchaseService.deleteTransaction(currentOrder.id, id);
      // Exclui também o registro financeiro correspondente (Legado)
      financialActionService.deleteStandaloneRecord('hist-' + id);
      await financialActionService.syncDeleteFromOrigin(id);

      SettingsCache.refreshBalances();
      ledgerService.onTransactionChange('delete', { id });
      refreshLoadings();
    },
    handleSaveNewLoading: (loading: Loading) => {
      loadingService.add(loading);
      refreshLoadings();
    },
    handleDeleteLoading: async (loadingId: string) => {
      await loadingService.delete(loadingId);
      refreshLoadings();
    },
    confirmFinalize: () => {
      purchaseService.update({ ...currentOrder, status: 'completed' });
      setIsFinalizePromptOpen(false);
      refreshLoadings();
      onFinalizeCallback();
    }
  };

  return { currentOrder, loadings, stats, isFinalizePromptOpen, setIsFinalizePromptOpen, actions };
};
