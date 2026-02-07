/**
 * 📸 snapshotService - Gestão de Snapshots Manuais
 * 
 * Responsável por:
 * - Criar snapshot manual (congelar mês para auditoria)
 * - Listar snapshots salvos
 * - Deletar snapshots
 * - Sincronizar com Supabase
 */

import { Persistence } from '../../../../services/persistence';
import { supabase } from '../../../../services/supabase';
import { MonthlySnapshot } from './types';
import { calculateMonthlyReport } from './historyService';

/**
 * Persistence local (sem storage para ser em memória)
 */
const snapshotsDb = new Persistence<MonthlySnapshot>('cashier_monthly_snapshots', [], { 
  useStorage: false 
});

let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

// ============================================================================
// MAPEAMENTO
// ============================================================================

const mapToDb = (snapshot: MonthlySnapshot) => ({
  id: snapshot.id,
  month_key: snapshot.monthKey,
  closed_date: snapshot.closedDate,
  closed_by: snapshot.closedBy,
  report: JSON.stringify(snapshot.report),
  notes: snapshot.notes || null,
  created_at: snapshot.createdAt,
  updated_at: snapshot.updatedAt
});

const mapFromDb = (row: any): MonthlySnapshot => ({
  id: row.id,
  monthKey: row.month_key,
  closedDate: row.closed_date,
  closedBy: row.closed_by,
  report: typeof row.report === 'string' ? JSON.parse(row.report) : row.report,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

// ============================================================================
// CARREGAMENTO INICIAL
// ============================================================================

const loadFromSupabase = async (): Promise<MonthlySnapshot[]> => {
  try {
    const { data, error } = await supabase
      .from('cashier_monthly_snapshots')
      .select('*')
      .order('closed_date', { ascending: false });

    if (error) {
      console.warn('⚠️ Erro ao acessar tabela cashier_monthly_snapshots:', {
        code: (error as any)?.code,
        message: error.message,
        details: (error as any)?.details
      });
      throw error;
    }
    
    const mapped = (data || []).map(mapFromDb);
    snapshotsDb.setAll(mapped);
    console.log(`✅ ${mapped.length} snapshots de caixa carregados`);
    
    return mapped;
  } catch (err) {
    const code = (err as { code?: string } | null)?.code;
    const errorMsg = (err as any)?.message || String(err);
    
    if (code === 'PGRST205' || errorMsg.includes('404')) {
      console.warn('⚠️ Tabela public.cashier_monthly_snapshots não encontrada ou sem permissão RLS. Snapshots desativados.');
      return [];
    }
    console.error('❌ Erro ao carregar snapshots:', err);
    return [];
  }
};

// ============================================================================
// REALTIME
// ============================================================================

const startRealtime = () => {
  if (realtimeChannel) return;

  try {
    realtimeChannel = supabase
      .channel('realtime:cashier_monthly_snapshots')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'cashier_monthly_snapshots' }, 
        (payload) => {
          const rec = payload.new || payload.old;
          if (!rec) return;

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const mapped = mapFromDb(rec);
            const existing = snapshotsDb.getById(mapped.id);
            if (existing) snapshotsDb.update(mapped);
            else snapshotsDb.add(mapped);
          } else if (payload.eventType === 'DELETE') {
            snapshotsDb.delete(rec.id);
          }
        }
      )
      .subscribe();
  } catch (err) {
    console.error('⚠️ Erro ao iniciar realtime de snapshots:', err);
  }
};

// ============================================================================
// PERSISTÊNCIA
// ============================================================================

const persistUpsert = async (snapshot: MonthlySnapshot) => {
  try {
    const payload = mapToDb(snapshot);
    const { error } = await supabase
      .from('cashier_monthly_snapshots')
      .upsert(payload)
      .select();

    if (error) {
      console.error('❌ Erro ao salvar snapshot:', error);
      return;
    }
    
    console.log(`✅ Snapshot ${snapshot.monthKey} salvo`);
  } catch (err) {
    console.error('❌ Erro inesperado ao salvar snapshot:', err);
  }
};

const persistDelete = async (id: string) => {
  try {
    const { error } = await supabase
      .from('cashier_monthly_snapshots')
      .delete()
      .eq('id', id);

    if (error) console.error('❌ Erro ao deletar snapshot:', error);
  } catch (err) {
    console.error('❌ Erro inesperado ao deletar snapshot:', err);
  }
};

// ❌ NÃO inicializar automaticamente - aguardar autenticação via supabaseInitService
// void loadFromSupabase();
// startRealtime();

// ============================================================================
// SERVICE
// ============================================================================

export const snapshotService = {
  /**
   * Lista todos os snapshots
   */
  getAll: (): MonthlySnapshot[] => {
    return snapshotsDb.getAll().sort((a, b) => 
      new Date(b.closedDate).getTime() - new Date(a.closedDate).getTime()
    );
  },

  /**
   * Obtém snapshot por ID
   */
  getById: (id: string): MonthlySnapshot | undefined => {
    return snapshotsDb.getById(id);
  },

  /**
   * Obtém snapshot de um mês específico (se existir)
   * @param year Ex: 2026
   * @param month Ex: 1 (janeiro)
   */
  getByMonth: (year: number, month: number): MonthlySnapshot | undefined => {
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    return snapshotsDb.getAll().find(s => s.monthKey === monthKey);
  },

  /**
   * Cria novo snapshot (congela o mês para auditoria)
   * @param year 2026
   * @param month 1-12
   * @param closedBy Email/nome do usuário
   * @param notes Notas opcionais
   */
  createSnapshot: (year: number, month: number, closedBy: string, notes?: string): MonthlySnapshot => {
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    
    // Verifica se já existe snapshot deste mês
    const existing = snapshotService.getByMonth(year, month);
    if (existing) {
      console.warn(`⚠️ Snapshot de ${monthKey} já existe`);
      return existing;
    }

    // Calcula o relatório do mês
    const report = calculateMonthlyReport(year, month);
    (report as any).isSnapshot = true;
    (report as any).snapshotClosedDate = new Date().toISOString();
    (report as any).snapshotClosedBy = closedBy;

    // Cria snapshot congelado
    const snapshot: MonthlySnapshot = {
      id: `snap-${monthKey}`,
      monthKey,
      closedDate: new Date().toISOString(),
      closedBy,
      report,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Salva localmente
    snapshotsDb.add(snapshot);
    
    // Sincroniza com Supabase
    void persistUpsert(snapshot);

    console.log(`✅ Snapshot criado: ${monthKey}`);
    return snapshot;
  },

  /**
   * Atualiza notas de um snapshot
   */
  updateSnapshot: (id: string, notes: string): MonthlySnapshot | null => {
    const snapshot = snapshotsDb.getById(id);
    if (!snapshot) return null;

    snapshot.notes = notes;
    snapshot.updatedAt = new Date().toISOString();

    snapshotsDb.update(snapshot);
    void persistUpsert(snapshot);

    return snapshot;
  },

  /**
   * Deleta um snapshot
   */
  deleteSnapshot: (id: string): boolean => {
    const snapshot = snapshotsDb.getById(id);
    if (!snapshot) return false;

    snapshotsDb.delete(id);
    void persistDelete(id);

    console.log(`✅ Snapshot deletado: ${snapshot.monthKey}`);
    return true;
  },

  /**
   * Subscreve mudanças em snapshots
   */
  subscribe: (callback: (snapshots: MonthlySnapshot[]) => void) => {
    return snapshotsDb.subscribe(callback);
  }
};
