// ⚠️ LEGACY SERVICE — Em modo canônico (SQL Canonical Ops), todas as operações
// são ignoradas via shouldSkipLegacyTableOps('payables').
// O PayablesTab agora usa vw_payables_enriched (VIEW SQL) via usePayables.
// TODO: Remover completamente quando todos os consumidores forem migrados.

import { Persistence } from '../persistence';
import { supabase } from '../supabase';
import { supabaseWithRetry } from '../../utils/fetchWithRetry';
import { DashboardCache, invalidateDashboardCache } from '../dashboardCache';
import { invalidateFinancialCache } from '../financialCache';
import { auditService } from '../auditService';
import { logService } from '../logService';
import { authService } from '../authService';
import { getTodayBR } from '../../utils/dateUtils';
import { shouldSkipLegacyTableOps } from '../realtimeTableAvailability';
import { sqlCanonicalOpsLog } from '../sqlCanonicalOps';
// import { purchaseService } from '../purchaseService'; // Removido para evitar dependência circular

const generateUUID = (): string => {
  if (typeof self !== 'undefined' && self.crypto && self.crypto.randomUUID) {
    return self.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export interface Payable {
  id: string;
  purchaseOrderId?: string;
  loadingId?: string; // ID do carregamento (para fretes)
  commissionId?: string; // ID da comissão
  partnerId: string;
  partnerName?: string;
  description: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  subType?: 'purchase_order' | 'freight' | 'commission' | 'other';
  paymentMethod?: string;
  bankAccountId?: string;
  paymentDate?: string;
  notes?: string;
  companyId?: string;
  driverName?: string;
  weightKg?: number;
  loadCount?: number;
}

export interface PayablesPageOptions {
  limit: number;
  beforeDate?: string;
  startDate?: string;
  endDate?: string;
}

const db = new Persistence<Payable>('payables', [], { useStorage: false });
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let isLoaded = false;

// ============================================================================
// MAPEAMENTO
// ============================================================================

const mapToDb = (item: Payable) => ({
  id: item.id,
  purchase_order_id: item.purchaseOrderId || null,
  loading_id: item.loadingId || null,
  commission_id: item.commissionId || null,
  partner_id: item.partnerId,
  partner_name: item.partnerName || null,
  description: item.description,
  due_date: item.dueDate,
  amount: item.amount,
  paid_amount: item.paidAmount,
  status: item.status,
  sub_type: item.subType || 'other',
  payment_method: item.paymentMethod || null,
  bank_account_id: item.bankAccountId || null,
  payment_date: item.paymentDate || null,
  notes: item.notes || null,
  company_id: item.companyId || authService.getCurrentUser()?.companyId || null,
  created_by: authService.getCurrentUser()?.id || null,
  driver_name: item.driverName || null,
  weight_kg: item.weightKg || null,
  load_count: item.loadCount || 0
});

const mapFromDb = (row: any): Payable => ({
  id: row.id,
  purchaseOrderId: row.purchase_order_id,
  loadingId: row.loading_id,
  commissionId: row.commission_id,
  partnerId: row.partner_id,
  partnerName: row.partner_name,
  description: row.description,
  dueDate: row.due_date || getTodayBR(),
  amount: Number(row.amount),
  paidAmount: Number(row.paid_amount || 0),
  status: row.status,
  subType: row.sub_type || 'other',
  paymentMethod: row.payment_method,
  bankAccountId: row.bank_account_id,
  paymentDate: row.payment_date,
  notes: row.notes,
  companyId: row.company_id,
  driverName: row.driver_name,
  weightKg: row.weight_kg ? Number(row.weight_kg) : undefined,
  loadCount: row.load_count ? Number(row.load_count) : undefined
});

const PAYABLES_SELECT_FIELDS = [
  'id',
  'purchase_order_id',
  'loading_id',
  'commission_id',
  'partner_id',
  'partner_name',
  'description',
  'due_date',
  'amount',
  'paid_amount',
  'status',
  'sub_type',
  'payment_method',
  'bank_account_id',
  'payment_date',
  'notes',
  'company_id',
  'driver_name',
  'driver_name',
  'weight_kg',
  'load_count'
].join(',');

const fetchPage = async (options: PayablesPageOptions): Promise<Payable[]> => {
  if (shouldSkipLegacyTableOps('payables')) {
    sqlCanonicalOpsLog('payablesService.fetchPage ignorado: tabela payables indisponível no modo canônico');
    return [];
  }

  try {
    const { limit, beforeDate, startDate, endDate } = options;
    const user = authService.getCurrentUser();
    const companyId = user?.companyId;

    let query = supabase
      .from('payables')
      .select(PAYABLES_SELECT_FIELDS)
      .eq('company_id', companyId)
      .order('due_date', { ascending: false })
      .limit(limit);

    if (beforeDate) query = query.lte('due_date', beforeDate);
    if (startDate) query = query.gte('due_date', startDate);
    if (endDate) query = query.lte('due_date', endDate);

    const data = await supabaseWithRetry(() => query);
    return (data as any[] || []).map(mapFromDb);
  } catch (error) {
    return [];
  }
};

// ============================================================================
// CARREGAMENTO INICIAL
// ============================================================================

const loadFromSupabase = async (): Promise<Payable[]> => {
  if (shouldSkipLegacyTableOps('payables')) {
    sqlCanonicalOpsLog('payablesService.loadFromSupabase ignorado: tabela payables indisponível no modo canônico');
    db.setAll([]);
    isLoaded = true;
    return [];
  }

  try {
    const user = authService.getCurrentUser();
    let query = supabase
      .from('payables')
      // Egress: usa campos nomeados (evita colunas desnecessárias) + cap de 500 registros
      .select(PAYABLES_SELECT_FIELDS)
      .order('due_date', { ascending: false })
      .limit(500);

    if (user?.companyId) {
      query = query.eq('company_id', user.companyId);
    }

    const data = await supabaseWithRetry(() => query);

    if (data) {
      const mapped = (data as any[]).map(mapFromDb);
      db.setAll(mapped);
      isLoaded = true;
      return mapped;
    }
    return [];
  } catch (error) {
    return [];
  }
};

// ============================================================================
// REALTIME
// ============================================================================

const startRealtime = () => {
  if (shouldSkipLegacyTableOps('payables')) {
    sqlCanonicalOpsLog('payablesService.startRealtime ignorado: tabela payables indisponível no modo canônico');
    return;
  }

  if (realtimeChannel) return;

  realtimeChannel = supabase
    .channel('realtime:payables')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'payables' }, (payload) => {
      const rec = payload.new || payload.old;
      if (!rec) return;

      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const mapped = mapFromDb(rec);
        const existing = db.getById(mapped.id);
        if (existing) db.update(mapped);
        else db.add(mapped);
      } else if (payload.eventType === 'DELETE') {
        db.delete(rec.id);
      }

      invalidateFinancialCache();
      invalidateDashboardCache();
    })
    .subscribe();
};

// ============================================================================
// PERSISTÊNCIA
// ============================================================================

const persistUpsert = async (item: Payable) => {
  if (shouldSkipLegacyTableOps('payables')) {
    return;
  }

  try {
    const payload = mapToDb(item);
    const { data: savedData, error } = await supabase.from('payables').upsert(payload).select().single();

    if (error) {
      return;
    }

    if (savedData) {
      const mapped = mapFromDb(savedData);
      const existing = db.getById(mapped.id);
      if (existing) db.update(mapped);
      else db.add(mapped);
    }
  } catch (err) {
  }
};

const persistDelete = async (id: string) => {
  if (shouldSkipLegacyTableOps('payables')) {
    return;
  }

  try {
    const { error } = await supabase.from('payables').delete().eq('id', id);
    if (error) {
      return;
    }
  } catch (err) {
  }
};

const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return {
    userId: user?.id || 'unknown',
    userName: user?.email || 'unknown'
  };
};

const stopRealtime = () => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
};

// ❌ NÃO inicializar automaticamente - aguardar autenticação via supabaseInitService
// void loadFromSupabase();
// startRealtime();

// ============================================================================
// EXPORT SERVICE
// ============================================================================

export const payablesService = {
  getAll: () => db.getAll(),
  getById: (id: string) => db.getById(id),
  subscribe: (callback: (items: Payable[]) => void) => db.subscribe(callback),
  loadFromSupabase,
  fetchPage,
  startRealtime,
  stopRealtime,
  persistUpsert,

  add: (item: Payable) => {
    db.add(item);
    void persistUpsert(item);
    invalidateDashboardCache();
    invalidateFinancialCache();

    // Audit Log
    void auditService.logAction('create', 'Financeiro', `Conta a pagar criada: ${item.description} - R$ ${item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, {
      entityType: 'Payable',
      entityId: item.id,
      metadata: { partnerId: item.partnerId, amount: item.amount, dueDate: item.dueDate }
    });
  },

  update: (item: Payable) => {
    const old = db.getById(item.id);
    db.update(item);
    void persistUpsert(item);

    // Audit Log (detecta se é pagamento)
    const isPaying = old && old.paidAmount !== item.paidAmount;
    const action = isPaying ? 'update' : 'update';
    const desc = isPaying
      ? `Pagamento registrado: ${item.description} - R$ ${(item.paidAmount - old.paidAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      : `Conta a pagar atualizada: ${item.description}`;

    void auditService.logAction(action as any, 'Financeiro', `Conta a pagar: #${item.description} - ${desc}`, {
      entityType: 'Payable',
      entityId: item.id,
      metadata: { status: item.status, amount: item.amount, paidAmount: item.paidAmount }
    });

    invalidateDashboardCache();
    invalidateFinancialCache();

    // ✅ Sincronizar status financeiro via EventBus
    if (item.purchaseOrderId && (item.subType === 'purchase_order' || item.subType === 'commission')) {
      // Emite evento para quem estiver ouvindo (purchaseService)
      // Passa paidAmount para evitar condição de corrida com cache desatualizado
      import('../eventBus').then(({ eventBus }) => {
        eventBus.emit('payable:updated', { purchaseOrderId: item.purchaseOrderId, paidAmount: item.paidAmount, subType: item.subType });
      });
    }
  },

  /**
   * Registra um pagamento parcial ou total para um payable
   */
  recordPayment: async (payableId: string, data: { amount: number; date: string; description: string; bankAccountId: string }) => {
    const payable = db.getById(payableId);
    if (!payable) throw new Error('Payable not found');

    const { financialTransactionService } = await import('./financialTransactionService');

    // 1. Criar a transação financeira
    await financialTransactionService.add({
      date: data.date,
      description: data.description || `Pagamento: ${payable.description}`,
      amount: data.amount,
      type: 'payment',
      bankAccountId: data.bankAccountId,
      financialRecordId: payableId,
      companyId: payable.companyId
    });

    // 2. Atualizar o payable com o novo valor pago
    const newPaidAmount = (payable.paidAmount || 0) + data.amount;
    const newStatus = newPaidAmount >= payable.amount ? 'paid' : 'partially_paid';

    payablesService.update({
      ...payable,
      paidAmount: newPaidAmount,
      status: newStatus,
      paymentDate: data.date,
      bankAccountId: data.bankAccountId
    });

    return { success: true };
  },

  delete: async (id: string) => {
    const payable = db.getById(id);
    if (!payable) return;

    db.delete(id);
    void persistDelete(id);

    // ✅ Clean up associated transactions
    const { financialTransactionService } = await import('./financialTransactionService');
    void financialTransactionService.deleteByRecordId(id, 'payable');

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'delete',
      module: 'Financeiro',
      description: `Excluiu conta a pagar: ${payable.description}`,
      entityId: id
    });

    // Audit Log
    void auditService.logAction('delete', 'Financeiro', `Conta a pagar excluída: #${payable.description}`, {
      entityType: 'Payable',
      entityId: id,
      metadata: { amount: payable.amount }
    });

    invalidateDashboardCache();
    invalidateFinancialCache();

    // ✅ Sincronizar status financeiro via EventBus
    if (payable.purchaseOrderId && (payable.subType === 'purchase_order' || payable.subType === 'commission')) {
      // Emite evento para quem estiver ouvindo (purchaseService)
      import('../eventBus').then(({ eventBus }) => {
        eventBus.emit('payable:updated', { purchaseOrderId: payable.purchaseOrderId, paidAmount: 0, subType: payable.subType });
      });
    }
  }
};
