
import { useState, useEffect, useMemo, useRef } from 'react';
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
import { usePurchaseOrderTransactions } from './usePurchaseOrderTransactions';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../../hooks/queryKeys';
import { expenseService } from '../../../services/purchase/expenseService';
import { kpiService } from '../../../services/purchase/kpiService';
import { useLoadingsByPurchaseOrder } from '../../../hooks/useLoadings';
import { usePartners } from '../../../hooks/useParceiros';
import { usePurchaseOrder } from '../../../hooks/usePurchaseOrders';

export const usePurchaseOrderLogic = (initialOrder: PurchaseOrder, onFinalizeCallback: () => void) => {
  const { data: fetchedOrder } = usePurchaseOrder(initialOrder.id);
  const order = fetchedOrder || initialOrder;

  // Auditoria Defensiva: Detectar desvios entre cache/prop e banco real
  useEffect(() => {
    if (fetchedOrder && Math.abs((initialOrder.paidValue || 0) - (fetchedOrder.paidValue || 0)) > 0.1) {
      console.warn(`[AUDIT] Desvio detectado no Pedido ${initialOrder.number}: Prop=${initialOrder.paidValue} vs DB=${fetchedOrder.paidValue}. Usando valor do Banco.`);
    }
  }, [fetchedOrder, initialOrder]);

  const { addToast } = useToast();
  const { data: loadings = [] } = useLoadingsByPurchaseOrder(order.id);
  const [isFinalizePromptOpen, setIsFinalizePromptOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shouldCheckCompletion, setShouldCheckCompletion] = useState(false);

  const { data: liveTransactions = [] } = usePurchaseOrderTransactions(order.id);
  const queryClient = useQueryClient();

  // Function to refresh manual invalidations if needed
  const refreshData = async () => {
    try {
      // ✅ OPTIMIZATION: Invalidate only specific queries related to this order 
      // instead of global PURCHASE_ORDERS and LOADINGS lists.
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PURCHASE_ORDERS }),
        queryClient.invalidateQueries({ queryKey: ['purchase_order_transactions', order.id] }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_TRANSACTIONS }),
        // Invalidate all loadings to ensure global lists and PO specific lists are fresh
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LOADINGS })
      ]);
    } catch (refreshErr) {
      console.warn('⚠️ refreshData failed:', refreshErr);
    }
  };

  const { data: rawPartners = { data: [] } } = usePartners();
  const partners = rawPartners.data || [];

  const enrichedLoadings = useMemo(() => {
    return loadings.map(l => {
      if (l.customerNickname) return l; // Já tem, não mexe
      
      // Tenta achar o parceiro pelo nome para pegar o apelido
      const partner = partners.find(p => p.name === l.customerName);
      if (partner?.nickname) {
        return { ...l, customerNickname: partner.nickname };
      }
      
      return l;
    });
  }, [loadings, partners]);

  const activeLoadings = useMemo(() => enrichedLoadings.filter(l => l.status !== 'canceled'), [enrichedLoadings]);

  // Merge transactions from metadata and live financial module
  const mergedTransactions = useMemo(() => {
    const txMap = new Map<string, OrderTransaction>();

    // 1. Start with metadata transactions (legacy/manual)
    (order.transactions || []).forEach(tx => txMap.set(tx.id, tx));

    // 2. Overwrite/Add with live transactions from financial module (SINGLE SOURCE OF TRUTH)
    liveTransactions.forEach(tx => {
      // ✅ FIX: Se a transação foi deletada manualmente (metadata filtrado), não deixamos o stale do backend re-adicionar
      // (Isso assume que o ID é o mesmo entre as duas listas)
      const isActuallyDeleted = order.transactions && 
                                !order.transactions.some(mTx => mTx.id === tx.id);
      
      // Se era uma transação que já flutuava no metadata e sumiu de lá, ignoramos o live stale
      if (isActuallyDeleted && tx.id.length < 30) return; 

      // Heurística V2: Busca por duplicidade mais permissiva
      let duplicateId: string | null = null;
      const existingById = txMap.get(tx.id);

      if (!existingById) {
        const txDate = new Date(tx.date).getTime();

        for (const [id, mTx] of txMap.entries()) {
          const isManualId = id.length < 20 && !id.includes('-');
          if (!isManualId) continue;

          const sameValue = Math.abs(mTx.value - tx.value) < 0.01;
          const sameType = (mTx.type === 'payment' || mTx.type === 'advance') &&
            (tx.type === 'payment' || tx.type === 'receipt' || tx.type === 'advance');

          if (sameValue && sameType) {
            const mTxDate = new Date(mTx.date).getTime();
            const dayInMs = 24 * 60 * 60 * 1000;
            const withinWindow = Math.abs(mTxDate - txDate) <= (3 * dayInMs);

            if (withinWindow) {
              duplicateId = id;
              break;
            }
          }
        }
      }

      const idToUse = existingById ? tx.id : (duplicateId || tx.id);
      const existing = txMap.get(idToUse);

      txMap.set(idToUse, {
        ...tx,
        id: idToUse,
        deductFromPartner: existing?.deductFromPartner ?? tx.deductFromPartner,
        discountValue: Math.max(tx.discountValue || 0, existing?.discountValue || 0)
      });
    });

    return Array.from(txMap.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [order.transactions, liveTransactions]);

  const stats = useMemo(() => {
    return kpiService.calculateOrderStats(order, mergedTransactions, loadings);
  }, [mergedTransactions, order, loadings]);

  // 🔄 RESTORE: Abrir prompt de finalização apenas quando o saldo TRANSITAR para zero (SKIL: UX Manual Control)
  const initialBalanceRef = useRef<number | null>(null);

  useEffect(() => {
    // Registra o saldo inicial assim que os stats estiverem disponíveis
    if (initialBalanceRef.current === null && stats.balancePartner !== undefined) {
      initialBalanceRef.current = stats.balancePartner;
    }
  }, [stats.balancePartner]);

  useEffect(() => {
    if (!shouldCheckCompletion || isFinalizePromptOpen || isProcessing) return;

    const isActuallyPaid = stats.balancePartner <= 0.05 && stats.totalSettled > 0;
    const isNotFinalized = order.status !== 'completed';
    
    // Agora o critério é: Foi solicitada a checagem (após um pagamento) 
    // E o saldo realmente está zerado agora.
    if (isActuallyPaid && isNotFinalized) {
      // Pequeno timeout para garantir que o toast de sucesso do pagamento apareça primeiro
      const timer = setTimeout(() => {
        setIsFinalizePromptOpen(true);
      }, 1000);
      
      // Reseta a flag para não repetir se o usuário fechar o modal
      setShouldCheckCompletion(false);
      return () => clearTimeout(timer);
    }

    // Se checou e não era pra finalizar (ex: pagamento parcial), também reseta a flag
    setShouldCheckCompletion(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldCheckCompletion, stats.balancePartner, order.status, isFinalizePromptOpen, isProcessing]);

  const actions = {
    refreshLoadings: refreshData,
    handleConfirmTransaction: async (data: any) => {
      try {
        // Enviar para o Orquestrador Financeiro (O cérebro do sistema)
        // Isso criará: financial_transactions + financial_links
        // E o trigger DB atualizará o paid_value e status no ops_purchase_orders de forma atômica.
        await financialActionService.processRecord(`po-grain-${order.id}`, data, 'purchase_order');

        SettingsCache.refreshBalances();
        addToast('success', 'Pagamento Confirmado');

        // Refresh TanStack Query para carregar os novos valores calculados pelo Banco
        await refreshData();

        // Agenda a checagem de finalização após o refresh do banco
        setTimeout(() => setShouldCheckCompletion(true), 1500);
      } catch (err: any) {
        console.error('[PO-PAYMENT] Erro completo:', err);
        addToast('error', `Erro ao confirmar pagamento: ${err?.message || 'Erro desconhecido'}`);
      }
    },
    handleRegisterAdvance: async (data: any) => {
      const tx: OrderTransaction = {
        id: crypto.randomUUID(),
        type: 'advance',
        date: data.date,
        value: data.value,
        accountId: data.accountId,
        accountName: data.accountName,
        notes: data.description || 'Adiantamento'
      };
      const updated = { ...order, transactions: [tx, ...(order.transactions || [])], paidValue: (order.paidValue || 0) + data.value };
      await purchaseService.update(updated);

      financialActionService.addAdminExpense({
        id: `adv-po-${tx.id}`,
        description: `Adiantamento Pedido ${order.number}`,
        entityName: order.partnerName,
        category: 'Adiantamentos',
        dueDate: data.date,
        issueDate: data.date,
        originalValue: data.value,
        paidValue: data.value,
        status: 'paid',
        subType: 'admin'
      });
      SettingsCache.refreshBalances();
      ledgerService.onTransactionChange('add', tx);
      await refreshData();
      addToast('success', 'Adiantamento Concedido');
    },
    handleAddExpense: async (data: any) => {
      try {
        const updatedOrder = await expenseService.addExpense(order, data);
        
        // Atualizar Cache Global
        queryClient.setQueryData(QUERY_KEYS.PURCHASE_ORDERS, (old: any[] | undefined) => 
          old ? old.map(o => o.id === order.id ? updatedOrder : o) : [updatedOrder]
        );
        addToast('success', 'Despesa lançada com sucesso');
        
        SettingsCache.refreshBalances();
        ledgerService.onTransactionChange('add', { type: 'expense', ...data } as any);
        await refreshData();
      } catch (err) {
        console.error('Erro ao lançar despesa:', err);
        addToast('error', 'Falha ao salvar despesa');
      }
    },
    handleAddCommission: async (data: any) => {
      const tx = { id: crypto.randomUUID(), type: 'commission' as const, ...data };
      const updated = { ...order, transactions: [tx, ...(order.transactions || [])] };
      await purchaseService.update(updated);

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
          purchaseOrderId: order.id,
          partnerId: data.partnerId,
          partnerName: data.partnerName || 'Corretor',
          description: `Comissão de Corretagem - Pedido #${order.number}`,
          dueDate: order.date,
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
      await refreshData();
    },
    // Added handleSaveNote for persistent order observations
    handleSaveNote: async (note: any) => {
      const newNote = { ...note, id: crypto.randomUUID() };
      const updated = { ...order, notesList: [newNote, ...(order.notesList || [])] };
      await purchaseService.update(updated);
      await refreshData();
    },
    handleUpdateTx: async (tx: OrderTransaction) => {
      await purchaseService.updateTransaction(order.id, tx);
      SettingsCache.refreshBalances();
      ledgerService.onTransactionChange('update', tx);
      await refreshData();
    },
    handleDeleteTx: async (txId: string) => {
      try {
        const tx = (order.transactions || []).find(t => t.id === txId);
        
        if (tx?.type === 'expense') {
          await expenseService.deleteExpense(order, txId);
        } else {
          // Deleta via serviço (Links e Transações financeiras)
          // O Trigger DB cuidará de reverter o paid_value no metadata/coluna do pedido
          await purchaseService.deleteTransaction(order.id, txId);
        }

        addToast('success', 'Lançamento estornado com sucesso');
        SettingsCache.refreshBalances();
        ledgerService.onTransactionChange('delete', { id: txId } as any);
        
        // Sincronização final
        await refreshData();
      } catch (err) {
        console.error('Erro ao estornar:', err);
        addToast('error', 'Falha ao estornar lançamento');
      }
    },
    handleSaveNewLoading: async (loading: Loading) => {
      await loadingService.add(loading);
      await refreshData();
    },
    handleDeleteLoading: async (loadingId: string) => {
      await loadingService.delete(loadingId);
      await refreshData();
    },
    confirmFinalize: async () => {
      // ✅ HARD GUARD: Impede finalização se houver saldo devedor
      if (stats.balancePartner > 0.05) {
        addToast('error', 'Não é possível finalizar', 'O pedido possui saldo devedor pendente.');
        setIsFinalizePromptOpen(false);
        return;
      }

      setIsProcessing(true);
      try {
        await purchaseService.update({ ...order, status: 'completed' });
        setIsFinalizePromptOpen(false);
        addToast('success', 'Pedido Finalizado');
        await refreshData();
        onFinalizeCallback();
      } finally {
        setIsProcessing(false);
      }
    },
    handleReopen: async () => {
      if (isProcessing) return;
      setIsProcessing(true);
      try {
        await purchaseService.update({ ...order, status: 'approved' });
        addToast('success', 'Pedido Reaberto');
        await refreshData();
      } catch (err) {
        addToast('error', 'Falha ao reabrir pedido');
      } finally {
        setIsProcessing(false);
      }
    },
    handleCancel: async (reason?: string) => {
      if (isProcessing) return;
      setIsProcessing(true);
      try {
        const result = await purchaseService.cancel(order.id, reason);
        if (result.success) {
          addToast('success', 'Pedido Cancelado', 'O pedido e os lançamentos financeiros vinculados foram invalidados.');
          await refreshData();
        } else {
          addToast('error', 'Erro ao cancelar', result.error);
        }
      } catch (err) {
        addToast('error', 'Falha ao cancelar pedido');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return { currentOrder: order, loadings: enrichedLoadings, stats, mergedTransactions, isFinalizePromptOpen, setIsFinalizePromptOpen, isProcessing, actions };
};
