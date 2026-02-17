import { supabase } from './supabase';
import { Persistence } from './persistence';
import { FinancialRecord } from '../modules/Financial/types';
import { invalidateFinancialCache } from './financialCache';
import { invalidateDashboardCache } from './dashboardCache';
import { logService } from './logService';
import { authService } from './authService';

// In-memory persistence (no localStorage)
const db = new Persistence<FinancialRecord>('standalone_records', [], { useStorage: false });

let isInitialized = false;
let realtimeSubscription: any = null;

export interface StandaloneRecordsPageOptions {
  limit: number;
  beforeDate?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Converte registro do Supabase (snake_case) para o formato do app (camelCase)
 */
const fromSupabase = (record: any): FinancialRecord => ({
  id: record.id,
  description: record.description,
  entityName: record.entity_name,
  driverName: record.driver_name,
  category: record.category,
  dueDate: record.due_date,
  issueDate: record.issue_date,
  settlementDate: record.settlement_date,
  originalValue: parseFloat(record.original_value),
  paidValue: parseFloat(record.paid_value || 0),
  discountValue: parseFloat(record.discount_value || 0),
  status: record.status,
  subType: record.sub_type,
  bankAccount: record.bank_account,
  notes: record.notes,
  assetId: record.asset_id,
  isAssetReceipt: record.is_asset_receipt,
  assetName: record.asset_name,
  weightSc: record.weight_sc ? parseFloat(record.weight_sc) : undefined,
  weightKg: record.weight_kg ? parseFloat(record.weight_kg) : undefined,
  unitPriceTon: record.unit_price_ton ? parseFloat(record.unit_price_ton) : undefined,
  unitPriceSc: record.unit_price_sc ? parseFloat(record.unit_price_sc) : undefined,
  loadCount: record.load_count,
  totalTon: record.total_ton ? parseFloat(record.total_ton) : undefined,
  totalSc: record.total_sc ? parseFloat(record.total_sc) : undefined,
});

/**
 * Converte registro do app (camelCase) para o formato do Supabase (snake_case)
 */
const toSupabase = (record: FinancialRecord): any => ({
  id: record.id,
  description: record.description,
  entity_name: record.entityName,
  driver_name: record.driverName,
  category: record.category,
  due_date: record.dueDate,
  issue_date: record.issueDate,
  settlement_date: record.settlementDate,
  original_value: record.originalValue,
  paid_value: record.paidValue || 0,
  discount_value: record.discountValue || 0,
  status: record.status,
  sub_type: record.subType,
  bank_account: record.bankAccount,
  notes: record.notes,
  asset_id: record.assetId,
  is_asset_receipt: record.isAssetReceipt,
  asset_name: record.assetName,
  weight_sc: record.weightSc,
  weight_kg: record.weightKg,
  unit_price_ton: record.unitPriceTon,
  unit_price_sc: record.unitPriceSc,
  load_count: record.loadCount,
  total_ton: record.totalTon,
  total_sc: record.totalSc,
});

const STANDALONE_SELECT_FIELDS = [
  'id',
  'description',
  'entity_name',
  'driver_name',
  'category',
  'due_date',
  'issue_date',
  'settlement_date',
  'original_value',
  'paid_value',
  'discount_value',
  'status',
  'sub_type',
  'bank_account',
  'notes',
  'asset_id',
  'is_asset_receipt',
  'asset_name',
  'weight_sc',
  'weight_kg',
  'unit_price_ton',
  'unit_price_sc',
  'load_count',
  'total_ton',
  'total_sc'
].join(',');

const fetchPage = async (options: StandaloneRecordsPageOptions): Promise<FinancialRecord[]> => {
  try {
    const { limit, beforeDate, startDate, endDate } = options;
    const user = authService.getCurrentUser();
    const companyId = user?.companyId;

    let query = supabase
      .from('standalone_records')
      .select(STANDALONE_SELECT_FIELDS)
      .eq('company_id', companyId)
      .order('issue_date', { ascending: false })
      .limit(limit);

    if (beforeDate) query = query.lte('issue_date', beforeDate);
    if (startDate) query = query.gte('issue_date', startDate);
    if (endDate) query = query.lte('issue_date', endDate);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(fromSupabase);
  } catch (error) {
    console.error('❌ [StandaloneRecordsService] Erro ao paginar:', error);
    return [];
  }
};

/**
 * Carrega todos os registros do Supabase
 */
const loadFromSupabase = async (): Promise<void> => {
  try {
    const user = authService.getCurrentUser();
    const companyId = user?.companyId;

    const { data, error } = await supabase
      .from('standalone_records')
      .select('*')
      .eq('company_id', companyId)
      .order('issue_date', { ascending: false });

    if (error) throw error;

    if (data) {
      const records = data.map(fromSupabase);
      db.clear();
      records.forEach(record => db.add(record));
      console.log(`✅ [StandaloneRecordsService] Carregados ${records.length} registros do Supabase`);
    }
  } catch (error) {
    console.error('❌ [StandaloneRecordsService] Erro ao carregar do Supabase:', error);
  }
};

/**
 * Configura subscription realtime
 */
const setupRealtimeSubscription = (): void => {
  if (realtimeSubscription) {
    console.log('⚠️ [StandaloneRecordsService] Subscription já existe');
    return;
  }

  realtimeSubscription = supabase
    .channel('standalone_records_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'standalone_records' },
      (payload) => {
        console.log('🔄 [StandaloneRecordsService] Mudança detectada:', payload.eventType);

        // Recarregar dados do Supabase
        loadFromSupabase();

        // Invalidar caches
        invalidateFinancialCache();
        invalidateDashboardCache();
      }
    )
    .subscribe();

  console.log('✅ [StandaloneRecordsService] Realtime subscription ativa');
};

/**
 * Inicializa o serviço
 */
const initialize = async (): Promise<void> => {
  if (isInitialized) return;

  await loadFromSupabase();
  setupRealtimeSubscription();
  isInitialized = true;
};

export const standaloneRecordsService = {
  /**
   * Inicializa o serviço (deve ser chamado no app init)
   */
  initialize,

  /**
   * Retorna todos os registros
   */
  getAll: (): FinancialRecord[] => db.getAll(),

  fetchPage,

  /**
   * Retorna um registro por ID
   */
  getById: (id: string): FinancialRecord | undefined => db.getById(id),

  /**
   * Adiciona um novo registro
   */
  add: async (record: FinancialRecord): Promise<void> => {
    try {
      const supabaseRecord = toSupabase(record);

      const { error } = await supabase
        .from('standalone_records')
        .insert([supabaseRecord]);

      if (error) throw error;

      // Adicionar em memória
      db.add(record);

      // Invalidar caches
      invalidateFinancialCache();
      invalidateDashboardCache();

      // Log
      const user = authService.getCurrentUser();
      logService.addLog({
        userId: user?.id || 'system',
        userName: user?.name || 'Sistema',
        action: 'create',
        module: 'Financeiro',
        description: `Despesa administrativa adicionada: ${record.description}`,
        entityId: record.id
      });

      console.log('✅ [StandaloneRecordsService] Registro adicionado:', record.id);
    } catch (error) {
      console.error('❌ [StandaloneRecordsService] Erro ao adicionar:', error);
      throw error;
    }
  },

  /**
   * Atualiza um registro existente
   */
  update: async (record: FinancialRecord): Promise<void> => {
    try {
      const supabaseRecord = toSupabase(record);

      const { error } = await supabase
        .from('standalone_records')
        .update(supabaseRecord)
        .eq('id', record.id);

      if (error) throw error;

      // Atualizar em memória
      db.update(record);

      // Invalidar caches
      invalidateFinancialCache();
      invalidateDashboardCache();

      // Log
      const user = authService.getCurrentUser();
      logService.addLog({
        userId: user?.id || 'system',
        userName: user?.name || 'Sistema',
        action: 'update',
        module: 'Financeiro',
        description: `Despesa administrativa atualizada: ${record.description} - Status: ${record.status}`,
        entityId: record.id
      });

      console.log('✅ [StandaloneRecordsService] Registro atualizado:', record.id);
    } catch (error) {
      console.error('❌ [StandaloneRecordsService] Erro ao atualizar:', error);
      throw error;
    }
  },

  /**
   * Exclui um registro
   */
  delete: async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('standalone_records')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Remover da memória
      db.delete(id);

      // Invalidar caches
      invalidateFinancialCache();
      invalidateDashboardCache();

      // Log
      const user = authService.getCurrentUser();
      logService.addLog({
        userId: user?.id || 'system',
        userName: user?.name || 'Sistema',
        action: 'delete',
        module: 'Financeiro',
        description: `Despesa administrativa excluída: ${id}`,
        entityId: id
      });

      console.log('✅ [StandaloneRecordsService] Registro excluído:', id);
    } catch (error) {
      console.error('❌ [StandaloneRecordsService] Erro ao excluir:', error);
      throw error;
    }
  },

  /**
   * Importa múltiplos registros (bulk insert)
   */
  importData: async (records: FinancialRecord[]): Promise<void> => {
    try {
      const supabaseRecords = records.map(toSupabase);

      const { error } = await supabase
        .from('standalone_records')
        .insert(supabaseRecords);

      if (error) throw error;

      // Adicionar em memória
      records.forEach(record => db.add(record));

      // Invalidar caches
      invalidateFinancialCache();
      invalidateDashboardCache();

      // Log
      const user = authService.getCurrentUser();
      logService.addLog({
        userId: user?.id || 'system',
        userName: user?.name || 'Sistema',
        action: 'create',
        module: 'Financeiro',
        description: `${records.length} despesas administrativas importadas`,
        entityId: 'bulk'
      });

      console.log(`✅ [StandaloneRecordsService] ${records.length} registros importados`);
    } catch (error) {
      console.error('❌ [StandaloneRecordsService] Erro ao importar:', error);
      throw error;
    }
  },

  /**
   * Subscreve a mudanças (para componentes React)
   */
  subscribe: (callback: (records: FinancialRecord[]) => void) => {
    return db.subscribe(callback);
  },

  /**
   * Cleanup: remove subscription realtime
   */
  cleanup: () => {
    if (realtimeSubscription) {
      supabase.removeChannel(realtimeSubscription);
      realtimeSubscription = null;
      console.log('✅ [StandaloneRecordsService] Realtime subscription removida');
    }
  },
};

// ❌ NÃO inicializar automaticamente - aguardar autenticação via supabaseInitService
// void standaloneRecordsService.initialize();
