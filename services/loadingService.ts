/**
 * ============================================================================
 * LOADING SERVICE — Orchestrator
 * ============================================================================
 */

import { Loading } from '../modules/Loadings/types';
import { logService } from './logService';
import { DashboardCache, invalidateDashboardCache } from './dashboardCache';
import { purchaseService } from './purchaseService';
import { auditService } from './auditService';
import { commissionService } from './financial/commissionService';
import { freightExpenseService } from './freightExpenseService';

// Modular Services
import { loadingPersistence } from './loading/loadingPersistence';
import { loadingRealtime } from './loading/loadingRealtime';
import { isSqlCanonicalOpsEnabled } from './sqlCanonicalOps';
import { getTodayBR } from '../utils/dateUtils';
import { supabase } from './supabase';

let toastCallback: ((type: 'success' | 'error' | 'info', title: string, message?: string) => void) | null = null;

const showToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
  if (toastCallback) toastCallback(type, title, message);
};

const getLogInfo = async () => {
  const { authService } = await import('./authService');
  const user = authService.getCurrentUser();
  return { userId: user?.id || 'system', userName: user?.name || 'Sistema', companyId: user?.companyId };
};

export const loadingService = {
  setToastCallback: (callback: any) => { toastCallback = callback; },

  getAll: () => loadingPersistence.db.getAll(),
  getById: (id: string) => loadingPersistence.db.getById(id),
  subscribe: (callback: (items: Loading[]) => void) => loadingPersistence.db.subscribe(callback),

  getByPurchaseOrder: (purchaseId: string) => {
    return loadingPersistence.db.getAll().filter(l => l.purchaseOrderId === purchaseId);
  },

  getBySalesOrder: (salesId: string) => {
    return loadingPersistence.db.getAll().filter(l => l.salesOrderId === salesId);
  },

  loadFromSupabase: async () => {
    const { companyId } = await getLogInfo();
    return loadingPersistence.loadFromSupabase(companyId);
  },

  startRealtime: async () => {
    const { companyId } = await getLogInfo();
    return loadingRealtime.start(companyId, loadingPersistence.db);
  },

  stopRealtime: () => loadingRealtime.stop(),

  add: async (loading: Loading) => {
    // 1. Cálculos de UI (opcionais, banco recalculado via Trigger)
    if (!loading.totalPurchaseValue && loading.weightKg && loading.purchasePricePerSc) {
      loading.totalPurchaseValue = Number(((loading.weightKg / 60) * loading.purchasePricePerSc).toFixed(2));
    }

    loadingPersistence.db.add(loading);

    // 2. Persistência (Trigger no banco cria o financial_entry automaticamente)
    const { companyId, userId, userName } = await getLogInfo();
    const success = await loadingPersistence.persistLoading(loading, companyId);

    if (!success) {
      showToast('error', 'Erro ao salvar', 'O banco de dados não respondeu corretamente.');
      loadingPersistence.db.delete(loading.id);
      return;
    }

    // 3. Lógica Especializada (Comissão ainda é TS-based)
    if (loading.purchaseOrderId) {
      const purchaseOrder = purchaseService.getById(loading.purchaseOrderId);
      if (purchaseOrder?.brokerId && purchaseOrder.brokerCommissionPerSc) {
        const commissionValue = Number(((loading.weightKg / 60) * purchaseOrder.brokerCommissionPerSc).toFixed(2));
        if (commissionValue > 0) {
          void commissionService.add({
            loadingId: loading.id,
            partnerId: purchaseOrder.brokerId,
            amount: commissionValue,
            date: loading.date,
            status: 'pending',
            description: `Comissão - Placa ${loading.vehiclePlate} - Pedido ${purchaseOrder.number}`,
            companyId: companyId || ''
          });
        }
      }
    }

    // Logs
    invalidateDashboardCache();
    logService.addLog({ userId, userName, action: 'create', module: 'Logística', description: `Carregamento: ${loading.vehiclePlate}`, entityId: loading.id });
    void auditService.logAction('create', 'Logística', `Carregamento criado: ${loading.vehiclePlate}`, { entityType: 'Loading', entityId: loading.id });
  },

  update: async (updatedLoading: Loading) => {
    loadingPersistence.db.update(updatedLoading);
    const { companyId, userId, userName } = await getLogInfo();
    
    // Persistência (Trigger atualiza o financeiro)
    await loadingPersistence.persistLoading(updatedLoading, companyId);

    logService.addLog({ userId, userName, action: 'update', module: 'Logística', description: `Atualizou carregamento ${updatedLoading.vehiclePlate}`, entityId: updatedLoading.id });
    void auditService.logAction('update', 'Logística', `Carregamento atualizado: ${updatedLoading.vehiclePlate}`, { entityType: 'Loading', entityId: updatedLoading.id });
  },

  delete: async (id: string) => {
    const loading = loadingService.getById(id);
    if (!loading) return;

    // 🛡️ O XERIFÃO: Verificação de bloqueio (Fontes canônicas)
    const { data: paidEntries } = await supabase
      .from('financial_entries')
      .select('id, paid_amount')
      .eq('origin_id', id)
      .gt('paid_amount', 0);

    if (paidEntries && paidEntries.length > 0) {
      showToast('error', 'Exclusão Bloqueada', 'Existem pagamentos vinculados a este frete/compra.');
      return;
    }

    // 1. Deletar no Banco (RPC-First)
    const success = await loadingPersistence.deleteLoading(id);
    if (!success) {
      showToast('error', 'Erro na Exclusão', 'A exclusão foi negada pela segurança do banco.');
      return;
    }

    // 2. Limpeza local e Audit
    loadingPersistence.db.delete(id);
    const { userId, userName } = await getLogInfo();
    logService.addLog({ userId, userName, action: 'delete', module: 'Logística', description: `Excluiu placa ${loading.vehiclePlate}`, entityId: id });
    invalidateDashboardCache();
    DashboardCache.clearAll();
  },

  reload: () => {
    loadingPersistence.setLoaded(false);
    return loadingService.loadFromSupabase();
  }
};
