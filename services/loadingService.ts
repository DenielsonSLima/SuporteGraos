/**
 * ============================================================================
 * LOADING SERVICE — Serviço de Carregamentos (Logística)
 * ============================================================================
 * 
 * MODULARIZADO: Lógica extraída para módulos isolados:
 *   loading/loadingMapper.ts         → Mapeamento Loading ↔ Supabase
 *   loading/loadingPayableSync.ts    → Sync de payables (frete + fornecedor)
 *   loading/loadingReceivableSync.ts → Sync de receivables (venda)
 *   loading/loadingHistorySync.ts    → Sync de histórico financeiro
 *   loading/loadingRecalculation.ts  → Funções de recálculo manual
 */

import { Loading } from '../modules/Loadings/types';
import { logService } from './logService';
import { authService } from './authService';
import { Persistence } from './persistence';
import { supabase } from './supabase';
import { supabaseWithRetry } from '../utils/fetchWithRetry';
import { payablesService } from './financial/payablesService';
import { DashboardCache, invalidateDashboardCache } from './dashboardCache';
import { purchaseService } from './purchaseService';
import { auditService } from './auditService';
import { commissionService } from './financial/commissionService';
import { freightExpenseService } from './freightExpenseService';

// Módulos extraídos
import { mapLoadingToDb, mapLoadingFromDb, generateUUID } from './loading/loadingMapper';
import { syncPurchaseOrderPayable, createFreightPayable, syncFreightPayable } from './loading/loadingPayableSync';
import { syncReceivableFromLoading } from './loading/loadingReceivableSync';
import { syncFinancialHistory } from './loading/loadingHistorySync';
import { recalculateAllPurchasePayables as _recalcPurchase, recalculateAllFreightPayables as _recalcFreight } from './loading/loadingRecalculation';
import { isSqlCanonicalOpsEnabled, sqlCanonicalOpsLog } from './sqlCanonicalOps';
import { getTodayBR } from '../utils/dateUtils';

const db = new Persistence<Loading>('logistics_loadings', [], { useStorage: false });
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let isLoaded = false;
let toastCallback: ((type: 'success' | 'error' | 'info', title: string, message?: string) => void) | null = null;

const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return { userId: user?.id || 'system', userName: user?.name || 'Sistema' };
};

const showToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
  if (toastCallback) toastCallback(type, title, message);
};

const notifyFinancialRefresh = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('financial:updated'));
  window.dispatchEvent(new Event('data:updated'));
};

const getCurrentCompanyId = () => authService.getCurrentUser()?.companyId || undefined;

const resolveCompanyId = (fallbackCompanyId?: string) => {
  return getCurrentCompanyId() || fallbackCompanyId;
};

/**
 * Busca uma financial_entry existente por tipo, origin_type e origin_id.
 * Schema real: coluna origin_type (origin_module NÃO existe).
 */
const findFinancialEntry = async (
  type: 'payable' | 'receivable',
  origin: string,
  originId: string
): Promise<string | null> => {
  const companyId = resolveCompanyId();

  let query = supabase
    .from('financial_entries')
    .select('id')
    .eq('type', type)
    .eq('origin_type', origin)
    .eq('origin_id', originId)
    .limit(1)
    .maybeSingle();

  if (companyId) query = query.eq('company_id', companyId);
  const { data, error } = await query;

  if (error) {
    console.warn('[loadingService] findFinancialEntry error:', error.message);
    return null;
  }

  return data?.id ?? null;
};

/**
 * Upsert de obrigação financeira (payable) na tabela financial_entries.
 * Schema real: usa origin_type (não origin_module), sem coluna description.
 */
const upsertFinancialPayableEntry = async (params: {
  origin: 'purchase_order' | 'freight';
  originId: string;
  amount: number;
  dueDate?: string;
  partnerId?: string;
  companyId?: string;
}) => {
  const companyId = resolveCompanyId(params.companyId);
  if (!companyId || !params.originId) return;

  const safeAmount = Number(params.amount) || 0;
  const payload: Record<string, any> = {
    company_id: companyId,
    type: 'payable',
    origin_type: params.origin,
    origin_id: params.originId,
    total_amount: safeAmount,
    due_date: params.dueDate || getTodayBR(),
    created_date: getTodayBR(),
  };
  if (params.partnerId) payload.partner_id = params.partnerId;

  const existingId = await findFinancialEntry('payable', params.origin, params.originId);

  if (existingId) {
    const { error } = await supabase.from('financial_entries').update({
      total_amount: safeAmount,
      due_date: params.dueDate || getTodayBR(),
      ...(params.partnerId ? { partner_id: params.partnerId } : {})
    }).eq('id', existingId);
    if (error) console.warn('[loadingService] update financial_entry error:', error.message);
    return;
  }

  const { error } = await supabase.from('financial_entries').insert(payload);
  if (error) console.warn('[loadingService] insert financial_entry error:', error.message);
};

const syncFinancialEntriesFromLoading = async (loading: Loading, isDelete = false) => {
  const companyId = resolveCompanyId(loading.companyId);

  const freightAmount = isDelete ? 0 : (Number(loading.totalFreightValue) || 0);
  if (loading.id) {
    // ✅ Guard: não criar financial_entry com frete zerado (evita registros órfãos)
    if (freightAmount <= 0 && !isDelete) {
      // Se for delete, precisamos zerar; senão, simplesmente não cria
      console.info('[loadingService] Frete zerado — pulando criação de financial_entry para', loading.id);
    } else {
      await upsertFinancialPayableEntry({
        origin: 'freight',
        originId: loading.id,
        amount: freightAmount,
        dueDate: loading.date,
        partnerId: loading.carrierId || undefined,
        companyId
      });
    }
  }

  if (loading.purchaseOrderId) {
    const order = purchaseService.getById(loading.purchaseOrderId);
    const relatedLoadings = loadingService
      .getByPurchaseOrder(loading.purchaseOrderId)
      .filter(l => l.status !== 'canceled');
    const purchaseAmount = relatedLoadings.reduce((sum, l) => sum + (Number(l.totalPurchaseValue) || 0), 0);
    const dueDate = relatedLoadings[0]?.date || loading.date || getTodayBR();

    await upsertFinancialPayableEntry({
      origin: 'purchase_order',
      originId: loading.purchaseOrderId,
      amount: purchaseAmount,
      dueDate,
      partnerId: order?.partnerId || undefined,
      companyId
    });
  }

  notifyFinancialRefresh();
};

const rebuildFinancialEntriesFromLoadings = async (loadings: Loading[]) => {
  for (const loading of loadings) {
    try {
      await syncFinancialEntriesFromLoading(loading, false);
    } catch {
    }
  }
};

const mapLoadingFromOpsRow = (row: any): Loading => {
  const payload = row?.raw_payload || row?.metadata || {};
  const purchaseOrder = Array.isArray(row?.purchase_order) ? row.purchase_order[0] : row?.purchase_order;
  const salesOrder = Array.isArray(row?.sales_order) ? row.sales_order[0] : row?.sales_order;

  const weightKg = Number(row?.weight_kg ?? payload?.weightKg ?? 0) || 0;
  const weightSc = Number(payload?.weightSc ?? (weightKg / 60)) || 0;
  const weightTon = Number(payload?.weightTon ?? (weightKg / 1000)) || 0;

  return {
    id: row?.legacy_id ?? row?.id ?? payload?.id ?? generateUUID(),
    companyId: row?.company_id ?? payload?.companyId,
    date: row?.loading_date ?? payload?.date ?? getTodayBR(),
    invoiceNumber: payload?.invoiceNumber ?? payload?.invoice_number,
    purchaseOrderId: payload?.purchaseOrderId ?? purchaseOrder?.legacy_id ?? purchaseOrder?.id ?? row?.purchase_order_id ?? '',
    purchaseOrderNumber: payload?.purchaseOrderNumber ?? purchaseOrder?.number ?? '',
    supplierName: payload?.supplierName ?? purchaseOrder?.partner_name ?? '',
    carrierId: payload?.carrierId ?? payload?.carrier_id ?? '',
    carrierName: payload?.carrierName ?? payload?.carrier_name ?? '',
    driverId: payload?.driverId ?? payload?.driver_id ?? '',
    driverName: row?.driver_name ?? payload?.driverName ?? payload?.driver_name ?? '',
    vehiclePlate: row?.vehicle_plate ?? payload?.vehiclePlate ?? payload?.vehicle_plate ?? '',
    isClientTransport: !!(payload?.isClientTransport ?? payload?.is_client_transport),
    product: payload?.product ?? '',
    weightKg,
    weightTon,
    weightSc,
    unloadWeightKg: row?.unload_weight_kg != null ? Number(row.unload_weight_kg) : payload?.unloadWeightKg,
    breakageKg: payload?.breakageKg,
    purchasePricePerSc: Number(payload?.purchasePricePerSc ?? payload?.purchase_price_per_sc ?? 0),
    totalPurchaseValue: Number(row?.total_purchase_value ?? payload?.totalPurchaseValue ?? 0),
    productPaid: Number(payload?.productPaid ?? payload?.product_paid ?? 0),
    freightPricePerTon: Number(payload?.freightPricePerTon ?? payload?.freight_price_per_ton ?? 0),
    totalFreightValue: Number(row?.total_freight_value ?? payload?.totalFreightValue ?? 0),
    freightAdvances: Number(payload?.freightAdvances ?? payload?.freight_advances ?? 0),
    freightPaid: Number(payload?.freightPaid ?? payload?.freight_paid ?? 0),
    extraExpenses: payload?.extraExpenses || [],
    transactions: payload?.transactions || [],
    salesOrderId: payload?.salesOrderId ?? salesOrder?.legacy_id ?? row?.sales_order_id ?? '',
    salesOrderNumber: payload?.salesOrderNumber ?? salesOrder?.number ?? '',
    customerName: payload?.customerName ?? salesOrder?.customer_name ?? '',
    salesPrice: Number(payload?.salesPrice ?? payload?.sales_price ?? 0),
    totalSalesValue: Number(row?.total_sales_value ?? payload?.totalSalesValue ?? 0),
    status: (row?.status ?? payload?.status ?? 'in_transit') as any,
    notes: payload?.notes,
    isRedirected: !!(payload?.isRedirected ?? payload?.is_redirected),
    originalDestination: payload?.originalDestination ?? payload?.original_destination,
    redirectDisplacementValue: payload?.redirectDisplacementValue ?? payload?.redirect_displacement_value,
    freightBase: (payload?.freightBase ?? row?.freight_base ?? 'Origem') as 'Origem' | 'Destino',
  };
};

// ============================================================================
// SUPABASE I/O
// ============================================================================

const loadFromSupabase = async () => {
  if (isLoaded) return;
  try {
    // Schema real: ops_loadings tem FK para ops_purchase_orders mas NÃO para ops_sales_orders.
    // Tabela logistics_loadings NÃO existe.
    // Sempre usar ops_loadings com JOIN apenas para purchase_order.
    const data = await supabaseWithRetry(() =>
      supabase
        .from('ops_loadings')
        .select(`
          *,
          purchase_order:ops_purchase_orders(id, legacy_id, number, partner_id, partner_name)
        `)
        .order('loading_date', { ascending: false })
    );

    const mapped = (data as any[] || []).map(mapLoadingFromOpsRow);
    db.setAll(mapped);
    notifyFinancialRefresh();
    void rebuildFinancialEntriesFromLoadings(mapped);
    isLoaded = true;
    return mapped;
  } catch (error) {
    sqlCanonicalOpsLog('Falha ao carregar carregamentos do Supabase', error);
    isLoaded = false;
    return db.getAll();
  }
};

const startRealtime = () => {
  if (realtimeChannel) return;

  const companyId = authService.getCurrentUser()?.companyId;
  const tableName = 'ops_loadings';

  realtimeChannel = supabase
    .channel(`realtime:${tableName}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: tableName,
      ...(companyId ? { filter: `company_id=eq.${companyId}` } : {})
    }, (payload) => {
      const rec = payload.new || payload.old;
      if (!rec) return;
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const mapped = mapLoadingFromOpsRow(rec);
        const existing = db.getById(mapped.id);
        if (existing) db.update(mapped);
        else db.add(mapped);
      } else if (payload.eventType === 'DELETE') {
        // Sempre usar legacy_id como ID principal (tabela é ops_loadings, id local é legacy_id)
        const mappedId = rec.legacy_id || rec.id;
        if (mappedId) db.delete(mappedId);
        if (rec.id && rec.id !== mappedId) db.delete(rec.id);
      }
    })
    .subscribe();
};

const stopRealtime = () => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
};

/**
 * Persiste carregamento: tenta RPC v2/v1, se ambos falharem faz INSERT/UPSERT direto em ops_loadings.
 * A tabela logistics_loadings NÃO existe — persistência é sempre via ops_loadings.
 */
const persistLoading = async (loading: Loading): Promise<boolean> => {
  // 1. Tentar via RPC (procedimento ideal — SQL-first)
  try {
    const { error } = await supabase.rpc('rpc_ops_loading_upsert_v2', {
      p_payload: loading as any
    });
    if (!error) return true;
    sqlCanonicalOpsLog(`RPC v2 falhou (${loading.id}), tentando v1`, error);
  } catch (err) {
    sqlCanonicalOpsLog(`RPC v2 exception (${loading.id})`, err);
  }

  try {
    const { error } = await supabase.rpc('rpc_ops_loading_upsert_v1', {
      p_payload: loading as any
    });
    if (!error) return true;
    sqlCanonicalOpsLog(`RPC v1 falhou (${loading.id}), tentando INSERT direto`, error);
  } catch (err) {
    sqlCanonicalOpsLog(`RPC v1 exception (${loading.id})`, err);
  }

  // 2. Fallback: INSERT/UPSERT direto em ops_loadings
  try {
    const companyId = resolveCompanyId(loading.companyId);
    const row: Record<string, any> = {
      company_id: companyId,
      legacy_id: loading.id,
      loading_date: loading.date || getTodayBR(),
      purchase_order_id: null,  // FK UUID — precisa do UUID real do ops_purchase_orders
      weight_kg: loading.weightKg || 0,
      total_purchase_value: loading.totalPurchaseValue || 0,
      total_freight_value: loading.totalFreightValue || 0,
      total_sales_value: loading.totalSalesValue || 0,
      status: loading.status || 'in_transit',
      vehicle_plate: loading.vehiclePlate || '',
      driver_name: loading.driverName || '',
      raw_payload: loading,
      metadata: loading,
    };

    // Resolver purchase_order_id UUID real
    if (loading.purchaseOrderId) {
      const { data: poRow } = await supabase
        .from('ops_purchase_orders')
        .select('id')
        .or(`legacy_id.eq.${loading.purchaseOrderId},id.eq.${loading.purchaseOrderId}`)
        .limit(1)
        .maybeSingle();
      if (poRow?.id) row.purchase_order_id = poRow.id;
    }

    const { error } = await supabase.from('ops_loadings').upsert(row, { onConflict: 'legacy_id' });
    if (error) {
      console.error('[loadingService] INSERT direto ops_loadings falhou:', error.message);
      return false;
    }
    console.info('[loadingService] Carregamento salvo via INSERT direto em ops_loadings');
    return true;
  } catch (err) {
    console.error('[loadingService] Fallback direto ops_loadings exception:', err);
    return false;
  }
};

/**
 * Deleta carregamento: tenta RPC, se falhar faz DELETE direto.
 */
const deleteLoadingFromDb = async (loadingId: string): Promise<boolean> => {
  // Tentar via RPC
  try {
    const { error } = await supabase.rpc('rpc_ops_loading_delete_v1', {
      p_legacy_id: loadingId
    });
    if (!error) return true;
    sqlCanonicalOpsLog(`RPC delete falhou (${loadingId}), tentando DELETE direto`, error);
  } catch (err) {
    sqlCanonicalOpsLog(`RPC delete exception (${loadingId})`, err);
  }

  // Fallback: DELETE direto
  try {
    const { error } = await supabase
      .from('ops_loadings')
      .delete()
      .or(`legacy_id.eq.${loadingId},id.eq.${loadingId}`);
    if (error) {
      console.error('[loadingService] DELETE direto falhou:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[loadingService] DELETE direto exception:', err);
    return false;
  }
};

export const loadingService = {
  setToastCallback: (callback: (type: 'success' | 'error' | 'info', title: string, message?: string) => void) => {
    toastCallback = callback;
  },

  getAll: () => db.getAll(),

  subscribe: (callback: (items: Loading[]) => void) => db.subscribe(callback),

  getByPurchaseOrder: (purchaseId: string) => {
    return db.getAll().filter(l => l.purchaseOrderId === purchaseId);
  },

  getBySalesOrder: (salesId: string) => {
    return db.getAll().filter(l => l.salesOrderId === salesId);
  },

  fetchMonthlyFreightHistory: async (filters: { startDate?: string; endDate?: string; carrierName?: string }) => {
    if (isSqlCanonicalOpsEnabled()) {
      let query = supabase
        .from('ops_loadings')
        .select(`
          *,
          purchase_order:ops_purchase_orders(id, legacy_id, number, partner_id, partner_name)
        `)
        .neq('status', 'canceled');

      if (filters.startDate) query = query.gte('loading_date', filters.startDate);
      if (filters.endDate) query = query.lte('loading_date', filters.endDate);

      const { data, error } = await query;
      if (error) throw error;

      let mapped = (data || []).map(mapLoadingFromOpsRow);
      if (filters.carrierName) {
        mapped = mapped.filter(l => l.carrierName === filters.carrierName);
      }
      return mapped;
    }

    // ops_loadings é a ÚNICA tabela — não existe logistics_loadings
    return [];
  },

  add: async (loading: Loading) => {
    const normalizedPurchaseValue = Number(loading.totalPurchaseValue) || 0;
    if (normalizedPurchaseValue <= 0 && loading.weightKg && loading.purchasePricePerSc) {
      const calculatedSc = loading.weightKg / 60;
      loading.totalPurchaseValue = Number((calculatedSc * loading.purchasePricePerSc).toFixed(2));
    }

    if (!loading.transactions) loading.transactions = [];
    if (!loading.extraExpenses) loading.extraExpenses = [];
    db.add(loading);

    // ✅ CRÍTICO: Persistir no banco (RPC → fallback INSERT direto em ops_loadings)
    const persisted = await persistLoading(loading);
    const canonicalAuthoritative = persisted;

    // ✅ Só cria financial_entry via TS se a RPC não conseguiu (ela já faz via SQL)
    if (!canonicalAuthoritative) {
      await syncFinancialEntriesFromLoading(loading, false);
    }

    // ✅ SQL-first: com canônico ativo e RPC aplicada, o financeiro é reconstruído no banco
    if (!canonicalAuthoritative) {
      await createFreightPayable(loading);
      if (loading.totalFreightValue && loading.totalFreightValue > 0 && loading.carrierId) {
        showToast('success', `💰 Frete ${loading.carrierName} criado no financeiro`);
      }

      if (loading.purchaseOrderId) {
        void syncPurchaseOrderPayable(loading.purchaseOrderId, loading.companyId, loadingService.getByPurchaseOrder);
      }
    }

    if (loading.purchaseOrderId) {
      // Lógica de comissão (ainda no frontend ou migrável depois)
      const purchaseOrder = purchaseService.getById(loading.purchaseOrderId);
      if (purchaseOrder && purchaseOrder.brokerId && purchaseOrder.brokerCommissionPerSc && purchaseOrder.brokerCommissionPerSc > 0) {
        // ... (mantém lógica de comissão original se necessário, ou move também)
        // Para simplificar, vou manter a comissão aqui pois ela é gerada PER LOADING

        // Calcula o valor da comissão para ESTA carga
        // Peso em sc = kg / 60
        const weightSc = (loading.weightKg || 0) / 60;
        const commissionValue = Number((weightSc * purchaseOrder.brokerCommissionPerSc).toFixed(2));

        if (commissionValue > 0) {
          void commissionService.add({
            loadingId: loading.id,
            salesOrderId: loading.salesOrderId || undefined,
            partnerId: purchaseOrder.brokerId,
            amount: commissionValue,
            date: loading.date,
            status: 'pending',
            description: `Comissão - Placa ${loading.vehiclePlate || 'N/A'} - Pedido ${purchaseOrder.number}`,
            companyId: loading.companyId || ''
          });
          showToast('success', `💰 Comissão criada: R$ ${commissionValue.toFixed(2)}`);
        }
      }
    }

    const { userId, userName } = getLogInfo();
    invalidateDashboardCache();
    logService.addLog({
      userId,
      userName,
      action: 'create',
      module: 'Logística',
      description: `Registrou carregamento: Placa ${loading.vehiclePlate} (${loading.weightKg}kg)`,
      entityId: loading.id
    });

    // Audit Log
    void auditService.logAction('create', 'Logística', `Carregamento criado: ${loading.vehiclePlate} - ${loading.weightKg}kg - ${loading.product}`, {
      entityType: 'Loading',
      entityId: loading.id,
      metadata: {
        vehiclePlate: loading.vehiclePlate,
        weightKg: loading.weightKg,
        product: loading.product,
        purchaseOrderId: loading.purchaseOrderId,
        salesOrderId: loading.salesOrderId,
        totalFreightValue: loading.totalFreightValue,
        totalPurchaseValue: loading.totalPurchaseValue
      }
    });
  },

  update: (updatedLoading: Loading) => {
    const oldLoading = db.getById(updatedLoading.id);
    if (!updatedLoading.extraExpenses) updatedLoading.extraExpenses = [];
    if (!updatedLoading.transactions) updatedLoading.transactions = [];
    db.update(updatedLoading);

    // ✅ Persistir atualização no banco (RPC → fallback UPSERT direto em ops_loadings)
    const canonicalAttempt = persistLoading(updatedLoading);
    // ✅ Sync financeiro via TS será feito apenas se a RPC falhar (ver abaixo)

    // ✅ DETECÇÃO DE MUDANÇAS FINANCEIRAS (via módulo isolado)
    if (oldLoading) {
      syncFinancialHistory(oldLoading, updatedLoading);
    }

    void canonicalAttempt.then((canonicalUpserted) => {
      const canonicalAuthoritative = canonicalUpserted;

      // ✅ Se a RPC falhou, sincroniza financial entries via TypeScript
      if (!canonicalAuthoritative) {
        void syncFinancialEntriesFromLoading(updatedLoading, false);
      }

      // ✅ SQL-first: recebível é recalculado no banco quando canônico está autoritativo
      if (!canonicalAuthoritative) {
        const shouldSyncReceivable = !!updatedLoading.salesOrderId;
        if (shouldSyncReceivable) {
          const allLoadings = db.getAll();
          void syncReceivableFromLoading(updatedLoading, allLoadings, showToast);
        }
      }
    });

    const { userId, userName } = getLogInfo();
    let description = `Atualizou dados do carregamento ${updatedLoading.vehiclePlate}`;
    if (oldLoading) {
      if (updatedLoading.status === 'redirected' && oldLoading.status !== 'redirected') {
        description = `REMANEJO DE CARGA: Placa ${updatedLoading.vehiclePlate} desviada para ${updatedLoading.customerName}`;
      } else if (updatedLoading.status === 'completed' && oldLoading.status !== 'completed') {
        description = `Finalizou transporte da Placa ${updatedLoading.vehiclePlate}`;
      } else if ((updatedLoading.extraExpenses?.length || 0) > (oldLoading.extraExpenses?.length || 0)) {
        description = `Lançou despesa extra no frete: ${updatedLoading.vehiclePlate}`;
      }
    }

    // Sync Extra Expenses to new table
    if (updatedLoading.extraExpenses && updatedLoading.extraExpenses.length > 0) {
      updatedLoading.extraExpenses.forEach(exp => {
        void freightExpenseService.add({
          loadingId: updatedLoading.id,
          type: exp.type === 'deduction' ? 'quebra' : 'outros', // Map appropriately
          amount: exp.value,
          description: exp.description,
          isDeduction: exp.type === 'deduction',
          companyId: updatedLoading.companyId || ''
        });
      });
    }

    logService.addLog({
      userId,
      userName,
      action: 'update' as any,
      module: 'Logística',
      description,
      entityId: updatedLoading.id
    });

    // Audit Log (detecta peso de descarrego)
    const isUnloadWeight = updatedLoading.unloadWeightKg && (!oldLoading || oldLoading.unloadWeightKg !== updatedLoading.unloadWeightKg);
    const auditDesc = isUnloadWeight
      ? `Peso de descarrego registrado: ${updatedLoading.vehiclePlate} - ${updatedLoading.unloadWeightKg}kg destino`
      : description;

    void auditService.logAction('update', 'Logística', auditDesc, {
      entityType: 'Loading',
      entityId: updatedLoading.id,
      metadata: {
        status: updatedLoading.status,
        weightKg: updatedLoading.weightKg,
        unloadWeightKg: updatedLoading.unloadWeightKg,
        vehiclePlate: updatedLoading.vehiclePlate
      }
    });

    void canonicalAttempt.then((canonicalUpserted) => {
      const canonicalAuthoritative = isSqlCanonicalOpsEnabled() && canonicalUpserted;

      // ✅ SQL-first: payable de frete/compra é reconstruído no banco quando canônico está autoritativo
      if (!canonicalAuthoritative) {
        syncFreightPayable(updatedLoading);
        if (updatedLoading.purchaseOrderId) {
          void syncPurchaseOrderPayable(updatedLoading.purchaseOrderId, updatedLoading.companyId, loadingService.getByPurchaseOrder);
        }
      }
    });
  },

  delete: async (id: string) => {
    const loading = db.getById(id);
    if (!loading) return;

    // ✅ SKIL §5.4 — Gap 6: Verificar pagamentos via financial_entries (fonte canônica), não payablesService
    let hasPaidEntries = false;
    try {
      const { data: paidEntries } = await supabase
        .from('financial_entries')
        .select('id, paid_amount, origin_type')
        .eq('origin_id', id)
        .in('origin_type', ['freight', 'commission'])
        .gt('paid_amount', 0);

      hasPaidEntries = !!(paidEntries && paidEntries.length > 0);
    } catch {
      // Fallback: se financial_entries não estiver disponível, checar payablesService
      const allPayables = payablesService.getAll();
      const freightPayable = allPayables.find((p: any) => p.subType === 'freight' && p.loadingId === id);
      const commissionPayable = allPayables.find((p: any) => p.subType === 'commission' && p.loadingId === id);
      hasPaidEntries = !!((freightPayable && freightPayable.paidAmount > 0) || (commissionPayable && commissionPayable.paidAmount > 0));
    }

    if (hasPaidEntries) {
      showToast('error', 'Exclusão Bloqueada', 'O frete ou comissão deste romaneio possui pagamentos (baixas). Exclua o pagamento primeiro.');
      return; // Interrompe a exclusão
    }

    // Coletar IDs de payables (legado) para limpeza em cascata
    const allPayables = payablesService.getAll();
    const freightPayable = allPayables.find((p: any) => p.subType === 'freight' && p.loadingId === id);
    const commissionPayable = allPayables.find((p: any) => p.subType === 'commission' && p.loadingId === id);

    db.delete(id);
    // ✅ Deletar do banco (RPC → fallback DELETE direto em ops_loadings)
    void deleteLoadingFromDb(id);
    if (loading) {
      void syncFinancialEntriesFromLoading(loading, true);
    }

    // ✅ DELETE EM CASCATA COMPLETA
    if (loading) {
      // 1. Delete specialized records (Commission, Expenses)
      void commissionService.deleteByLoading(id);
      void freightExpenseService.deleteByLoading(id);

      const payableIds: string[] = [];

      // 2. Coletar IDs de payables associados
      if (freightPayable) payableIds.push(freightPayable.id);
      if (commissionPayable) payableIds.push(commissionPayable.id);

      // Limpeza financeira (sempre executar — o SQL cuida da parte dele via trigger, aqui limpamos o legado)
      // 3. ✅ Limpeza COMPLETA via orquestrador centralizado
      // Limpa: financial_history, admin_expenses (standalone), financial_transactions
      void import('./financial/paymentOrchestrator').then(({ cleanupFinancialRecords }) => {
        cleanupFinancialRecords({
          entityId: id,
          entityType: 'loading',
          payableIds
        }).then(() => {
          // 4. Deletar os payables APÓS limpar as dependências
          if (freightPayable) {
            payablesService.delete(freightPayable.id);
          }
          if (commissionPayable) {
            payablesService.delete(commissionPayable.id);
          }

          // 🚀 MIGRADO PARA TRIGGER NO SUPABASE (Fase 2)
          /*
              if (loading.purchaseOrderId) {
                void syncPurchaseOrderPayable(loading.purchaseOrderId, loading.companyId, loadingService.getByPurchaseOrder);
              }
              if (loading.salesOrderId) {
                const allLoadings = db.getAll(); // Agora sem a carga deletada
                void syncReceivableFromLoading(loading, allLoadings, showToast);
              }
              */
            });
          });
    }

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'delete',
      module: 'Logística',
      description: `Excluiu carregamento: Placa ${loading?.vehiclePlate || 'Desconhecida'}`,
      entityId: id
    });

    // Audit Log
    void auditService.logAction('delete', 'Logística', `Carregamento excluído: ${loading?.vehiclePlate || 'Desconhecida'} - ${loading?.weightKg || 0}kg`, {
      entityType: 'Loading',
      entityId: id,
      metadata: {
        vehiclePlate: loading?.vehiclePlate,
        weightKg: loading?.weightKg,
        unloadWeightKg: loading?.unloadWeightKg,
        totalFreightValue: loading?.totalFreightValue
      }
    });

    // 🎯 LIMPAR CACHE DO DASHBOARD IMEDIATAMENTE
    DashboardCache.clearAll();
    invalidateDashboardCache();
  },

  importData: (data: Loading[]) => {
    db.setAll(data);
    // Persistir cada loading via ops_loadings
    void (async () => {
      for (const loading of data) {
        await persistLoading(loading);
      }
    })();
  },

  // ✅ FUNÇÃO DE CORREÇÃO: Recalcular todos os payables de pedidos de compra (módulo extraído)
  recalculateAllPurchasePayables: () => {
    _recalcPurchase(loadingService.getByPurchaseOrder, showToast);
  },

  // ✅ NOVA FUNÇÃO: Recalcular todos os payables de FRETE (módulo extraído)
  recalculateAllFreightPayables: () => {
    _recalcFreight(loadingService.getAll, showToast);
  },

  rebuildFinancialEntriesFromLoadings: async () => {
    const all = loadingService.getAll();
    await rebuildFinancialEntriesFromLoadings(all);
  },

  reload: () => {
    isLoaded = false;
    return loadFromSupabase();
  },
  loadFromSupabase,
  startRealtime,
  stopRealtime
};

// ❌ REMOVIDO: Recálculo automático de payables ao carregar o módulo
// Motivo: Causava efeitos colaterais em cascata — editar um pedido recalculava TODOS os payables
// As funções recalculateAllPurchasePayables() e recalculateAllFreightPayables() 
// continuam disponíveis para uso manual (botão no admin ou chamada explícita)
