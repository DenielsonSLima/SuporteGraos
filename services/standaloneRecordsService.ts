/**
 * ============================================================================
 * STANDALONE RECORDS SERVICE — Despesas Administrativas (admin_expenses)
 * ============================================================================
 * 
 * MODULARIZADO:
 *   standalone/standaloneMapper.ts → Mapeamento FinancialRecord ↔ Supabase
 */

import { supabase } from './supabase';
import { Persistence } from './persistence';
import { FinancialRecord, FinancialStatus } from '../modules/Financial/types';
import { StandaloneRecord as StandaloneRecordDB } from '../types/database';
import { invalidateFinancialCache } from './financialCache';
import { invalidateDashboardCache } from './dashboardCache';
import { RealtimeChannel } from '@supabase/supabase-js';
import { logService } from './logService';

// Módulo de mapeamento extraído
import { fromSupabase, toSupabase, STANDALONE_SELECT_FIELDS } from './standalone/standaloneMapper';

// Re-export para manter compatibilidade de imports externos
export { fromSupabase, toSupabase, STANDALONE_SELECT_FIELDS };

// In-memory persistence (no localStorage)
const db = new Persistence<FinancialRecord>('admin_expenses', [], { useStorage: false });

let isInitialized = false;
let realtimeSubscription: RealtimeChannel | null = null;

export interface StandaloneRecordsPageOptions {
  limit: number;
  beforeDate?: string;
  startDate?: string;
  endDate?: string;
}

const fetchPage = async (options: StandaloneRecordsPageOptions): Promise<FinancialRecord[]> => {
  try {
    const { limit, beforeDate, startDate, endDate } = options;
    const { authService } = await import('./authService');
    const user = authService.getCurrentUser();
    const companyId = user?.companyId;

    if (!companyId) {
      return [];
    }

    let query = supabase
      .from('admin_expenses')
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
    return [];
  }
};

/**
 * Carrega todos os registros do Supabase
 */
const loadFromSupabase = async (): Promise<FinancialRecord[]> => {
  try {
    const { authService } = await import('./authService');
    const user = authService.getCurrentUser();
    const companyId = user?.companyId;

    if (!companyId) {
      return [];
    }

    const { data, error } = await supabase
      .from('admin_expenses')
      .select('*')
      .eq('company_id', companyId)
      .order('issue_date', { ascending: false });

    if (error) throw error;

    const records = (data || []).map(fromSupabase);
    db.clear();
    records.forEach(record => db.add(record));
    
    return records;
  } catch (error) {
    return [];
  }
};

/**
 * Configura subscription realtime
 */
const setupRealtimeSubscription = (): void => {
  if (realtimeSubscription) {
    return;
  }

  realtimeSubscription = supabase
    .channel('admin_expenses_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'admin_expenses' },
      (payload) => {

        // ✅ Atualização GRANULAR — não apaga toda a memória
        // Evita o bug onde um INSERT em memória some ao recarregar do Supabase
        if (payload.eventType === 'INSERT' && payload.new) {
          const record = fromSupabase(payload.new);
          const existing = db.getById(record.id);
          if (!existing) db.add(record);
          else db.update(record); // garante sincronização se divergir
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          const record = fromSupabase(payload.new);
          const existing = db.getById(record.id);
          if (existing) db.update(record);
          else db.add(record);
        } else if (payload.eventType === 'DELETE' && payload.old) {
          db.delete((payload.old as any).id);
        }

        // Invalidar caches
        invalidateFinancialCache();
        invalidateDashboardCache();
      }
    )
    .subscribe();

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

  loadFromSupabase,
  getAll: () => {
    return db.getAll();
  },
  fetchPage,

  /**
   * Retorna um registro por ID
   */
  getById: (id: string): FinancialRecord | undefined => {
    return db.getById(id);
  },

  /**
   * Adiciona um novo registro
   */
  add: async (record: FinancialRecord): Promise<void> => {
    try {
      const { authService } = await import('./authService');
      const user = authService.getCurrentUser();
      const supabaseRecord = toSupabase(record);

      // ✅ Adicionar em memória PRIMEIRO (optimistic update)
      // Garante que o saldo bancário é atualizado imediatamente
      db.add(record);
      invalidateFinancialCache();
      invalidateDashboardCache();

      const { error } = await supabase
        .from('admin_expenses')
        .insert([supabaseRecord]);

      if (error) {
        // ✅ ROLLBACK: se o INSERT falhou, remove da memória para evitar
        // inconsistência após reload (o registro não estaria no Supabase).
        db.delete(record.id);
        invalidateFinancialCache();
        invalidateDashboardCache();
        throw error; // propaga para o caller tratar (ex: mostrar erro ao usuário)
      }

      // ✅ SINGLE LEDGER: Criar a entrada financeira
      try {
        const companyId = user?.companyId;
        if (companyId) {
          // If it's a receipt (like an asset sale), the type should be 'receivable'
          const entryType = record.subType === 'receipt' ? 'receivable' : 'expense';

          await supabase.from('financial_entries').insert({
            company_id: companyId,
            type: entryType,
            origin_type: 'standalone_expense',
            origin_id: record.id,
            total_amount: record.originalValue,
            due_date: record.dueDate,
            status: 'open',
            paid_amount: 0,
            remaining_amount: record.originalValue,
            created_date: new Date().toISOString().split('T')[0]
          });
        }
      } catch (err) {
        console.error('[standaloneRecordsService] add financial_entries insert:', err);
      }

      // Log
      logService.addLog({
        userId: user?.id || 'system',
        userName: user?.name || 'Sistema',
        action: 'create',
        module: 'Financeiro',
        description: `Despesa administrativa adicionada: ${record.description}`,
        entityId: record.id
      });

    } catch (error) {
      throw error; // ✅ Re-lança para o registerFinancialRecords propagar ao UI
    }
  },

  /**
   * Atualiza um registro existente
   */
  update: async (record: FinancialRecord): Promise<void> => {
    try {
      const { authService } = await import('./authService');
      const user = authService.getCurrentUser();
      const supabaseRecord = toSupabase(record);

      const { error } = await supabase
        .from('admin_expenses')
        .update(supabaseRecord)
        .eq('id', record.id);

      if (error) throw error;

      // ✅ SINGLE LEDGER: Atualizar a entrada financeira
      try {
        await supabase.from('financial_entries').update({
          total_amount: record.originalValue,
          due_date: record.dueDate
        }).eq('origin_id', record.id).eq('origin_type', 'standalone_expense');
      } catch (err) {
        console.error('[standaloneRecordsService] update financial_entries:', err);
      }

      // Atualizar em memória
      db.update(record);

      // Invalidar caches
      invalidateFinancialCache();
      invalidateDashboardCache();

      // Log
      logService.addLog({
        userId: user?.id || 'system',
        userName: user?.name || 'Sistema',
        action: 'update',
        module: 'Financeiro',
        description: `Despesa administrativa atualizada: ${record.description} - Status: ${record.status}`,
        entityId: record.id
      });

    } catch (error) {
      throw error;
    }
  },

  /**
   * Exclui um registro
   */
  delete: async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('admin_expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // ✅ SINGLE LEDGER: Marcar entrada como estornada (imutabilidade do ledger)
      try {
        await supabase.from('financial_entries')
          .update({ status: 'reversed', description: `[ESTORNO] ${id}` })
          .eq('origin_id', id)
          .eq('origin_type', 'standalone_expense');
      } catch (err) {
        console.error('[standaloneRecordsService] reverse financial_entries:', err);
      }

      // Remover da memória
      db.delete(id);

      // Invalidar caches
      invalidateFinancialCache();
      invalidateDashboardCache();

      // Log
      const { authService } = await import('./authService');
      const user = authService.getCurrentUser();
      logService.addLog({
        userId: user?.id || 'system',
        userName: user?.name || 'Sistema',
        action: 'delete',
        module: 'Financeiro',
        description: `Despesa administrativa excluída: ${id}`,
        entityId: id
      });

    } catch (error) {
      throw error;
    }
  },

  /**
   * Importa múltiplos registros (bulk insert/upsert)
   */
  importData: async (records: FinancialRecord[]): Promise<void> => {
    try {
      if (!records || records.length === 0) return;

      const { authService } = await import('./authService');
      const user = authService.getCurrentUser();
      const supabaseRecords = records.map(toSupabase);

      const { error } = await supabase
        .from('admin_expenses')
        .upsert(supabaseRecords, { onConflict: 'id' });

      if (error) throw error;

      // Adicionar em memória
      records.forEach(record => db.add(record));

      // Invalidar caches
      invalidateFinancialCache();
      invalidateDashboardCache();

      // Log
      logService.addLog({
        userId: user?.id || 'system',
        userName: user?.name || 'Sistema',
        action: 'create',
        module: 'Financeiro',
        description: `${records.length} despesas administrativas importadas`,
        entityId: 'bulk'
      });

    } catch (error) {
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
    }
  },

  /**
   * Exclui registros por referência [REF:xxx] ou [ORIGIN:xxx]
   */
  deleteByRef: async (refId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('admin_expenses')
        .delete()
        .or(`notes.ilike.%[REF:${refId}]%,notes.ilike.%[ORIGIN:${refId}]%`);

      if (error) throw error;

      // A atualização da memória (db) virá via realtime
    } catch (error) {
      throw error;
    }
  }
};
