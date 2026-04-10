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
import { Persistence } from './persistence';
import { supabase } from './supabase';

const db = new Persistence<Loading>('ops_loadings', [], { useStorage: false });


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

  subscribe: (callback: (items: Loading[]) => void) => {
    return db.subscribe(callback);
  },
  
  subscribeRealtime: (callback: () => void) => {
    return loadingRealtime.subscribe(callback);
  },

  getAll: () => {
    return db.getAll();
  },
  getById: (id: string) => {
    return db.getById(id);
  },

  getByPurchaseOrder: (purchaseId: string) => {
    return db.getAll().filter(l => l.purchaseOrderId === purchaseId);
  },

  getBySalesOrder: (salesId: string) => {
    return db.getAll().filter(l => l.salesOrderId === salesId);
  },

  loadFromSupabase: async () => {
    const { companyId } = await getLogInfo();
    const data = await loadingPersistence.loadFromSupabase(companyId);
    db.setAll(data);
    
    // ✅ Reativar Realtime para multiusuários — agora com sistema de listeners
    loadingService.startRealtime();
    
    return data;
  },

  startRealtime: async () => {
    const { companyId } = await getLogInfo();
    loadingRealtime.start(companyId, db);
  },

  stopRealtime: () => {
    // Mantido como no-op
  },

  add: async (loading: Loading) => {
    // Persistência no Banco (RPC-First)
    const { companyId, userId, userName } = await getLogInfo();
    const success = await loadingPersistence.persistLoading(loading, companyId);

    if (!success) {
      showToast('error', 'Erro ao salvar', 'O banco de dados não respondeu corretamente.');
      throw new Error('Falha ao inserir no Supabase');
    }

    db.add(loading); // Optimistic update
    invalidateDashboardCache();
    logService.addLog({ userId, userName, action: 'create', module: 'Logística', description: `Carregamento: ${loading.vehiclePlate}`, entityId: loading.id });
    void auditService.logAction('create', 'Logística', `Carregamento criado: ${loading.vehiclePlate}`, { entityType: 'Loading', entityId: loading.id });
  },

  update: async (updatedLoading: Loading) => {
    const { companyId, userId, userName } = await getLogInfo();
    
    // Persistência
    const success = await loadingPersistence.persistLoading(updatedLoading, companyId);
    if (!success) throw new Error('Falha ao atualizar no Supabase');

    db.update(updatedLoading);
    logService.addLog({ userId, userName, action: 'update', module: 'Logística', description: `Atualizou carregamento ${updatedLoading.vehiclePlate}`, entityId: updatedLoading.id });
    void auditService.logAction('update', 'Logística', `Carregamento atualizado: ${updatedLoading.vehiclePlate}`, { entityType: 'Loading', entityId: updatedLoading.id });
  },

  delete: async (id: string) => {
    // 🛡️ O XERIFÃO: Verificação de bloqueio (Fontes canônicas)
    const { data: paidEntries } = await supabase
      .from('financial_entries')
      .select('id, paid_amount')
      .eq('origin_id', id)
      .gt('paid_amount', 0);

    if (paidEntries && paidEntries.length > 0) {
      showToast('error', 'Exclusão Bloqueada', 'Existem pagamentos vinculados a este frete/compra.');
      throw new Error('Bloqueado por pagamentos ativos');
    }

    // 1. Deletar no Banco (RPC-First)
    const success = await loadingPersistence.deleteLoading(id);
    if (!success) {
      showToast('error', 'Erro na Exclusão', 'A exclusão foi negada pela segurança do banco.');
      throw new Error('Falha na deleção');
    }

    // 2. Audit
    const { userId, userName } = await getLogInfo();
    logService.addLog({ userId, userName, action: 'delete', module: 'Logística', description: `Excluiu carregamento ID ${id}`, entityId: id });
    db.delete(id);
    invalidateDashboardCache();
    DashboardCache.clearAll();
  },

  reload: () => {
    loadingPersistence.setLoaded(false);
    return loadingService.loadFromSupabase();
  }
};
