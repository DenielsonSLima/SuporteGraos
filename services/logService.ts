import { Persistence } from './persistence';
import { supabase } from './supabase';
import { waitForInit } from './supabaseInitService';

export type LogAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'approve' | 'cancel' | 'export';

export interface LogEntry {
  id: string;
  userId: string;
  userName: string;
  action: LogAction;
  module: string;
  entityId?: string;
  description: string;
  timestamp: string;
  metadata?: any;
  companyId?: string;
}

// Dados iniciais zerados conforme solicitado
const INITIAL_LOGS: LogEntry[] = [];
const isValidUuid = (value?: string) => !!value && /^[0-9a-fA-F-]{36}$/.test(value);

const db = new Persistence<LogEntry>('system_logs', INITIAL_LOGS, { useStorage: false });
let logChannel: ReturnType<typeof supabase.channel> | null = null;
let _realtimeStarted = false;

// ============================================================================
// MAPEAMENTO SUPABASE <-> FRONTEND
// ============================================================================

const mapLogFromDb = (record: any): LogEntry => ({
  id: record.id,
  userId: record.user_id || 'system',
  userName: record.user_name || 'Sistema',
  action: record.action,
  module: record.module,
  entityId: record.entity_id,
  description: record.description,
  timestamp: record.created_at,
  metadata: record.metadata
});

const mapLogToDb = (log: LogEntry) => ({
  id: log.id,
  user_id: isValidUuid(log.userId) ? log.userId : null,
  user_name: log.userName,
  action: log.action,
  module: log.module,
  entity_id: log.entityId,
  description: log.description,
  metadata: log.metadata,
  created_at: log.timestamp
});

// ============================================================================
// PERSIST OPERATIONS
// ============================================================================

const persistLog = async (log: LogEntry) => {
  try {
    await waitForInit();
    const payload = mapLogToDb(log);
    const { error } = await supabase.from('audit_logs').insert(payload);
    if (error && error.code !== 'PGRST205' && error.code !== 'PGRST25') {
      console.error('❌ Erro ao salvar log:', error);
    }
  } catch (err) {
  }
};

// ============================================================================
// LOAD FROM SUPABASE
// ============================================================================

const loadFromSupabase = async () => {
  try {
    await waitForInit();
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      if (error.code !== 'PGRST25') {
      }
      return;
    }

    const mapped = data.map(mapLogFromDb);
    db.setAll(mapped);
  } catch (err) {
  }
};

// ============================================================================
// REALTIME SUBSCRIPTIONS
// ============================================================================

const startRealtime = () => {
  if (!logChannel && !_realtimeStarted) {
    logChannel = supabase.channel('audit_logs_realtime_logs');

    logChannel
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_logs' },
        (payload: any) => {
          const log = mapLogFromDb(payload.new);
          db.add(log);
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
        }
      });

    _realtimeStarted = true;
  }
};

const stopRealtime = () => {
  if (logChannel) {
    supabase.removeChannel(logChannel);
    logChannel = null;
    _realtimeStarted = false;
  }
};

export const logService = {
  getAll: () => {
    return db.getAll().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  subscribe: (callback: (logs: LogEntry[]) => void) => {
    startRealtime();
    return db.subscribe(callback);
  },

  addLog: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    const newLog: LogEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    };
    db.add(newLog);
    void persistLog(newLog);
  },

  // Filtro avançado
  getFiltered: (filters: {
    search?: string;
    startDate?: string;
    endDate?: string;
    module?: string
  }) => {
    let logs = logService.getAll();

    if (filters.search) {
      const term = filters.search.toLowerCase();
      logs = logs.filter(l =>
        l.description.toLowerCase().includes(term) ||
        l.userName.toLowerCase().includes(term) ||
        l.action.toLowerCase().includes(term)
      );
    }

    if (filters.module && filters.module !== 'all') {
      logs = logs.filter(l => l.module === filters.module);
    }

    if (filters.startDate) {
      logs = logs.filter(l => l.timestamp >= filters.startDate!);
    }

    if (filters.endDate) {
      // Ajuste para incluir o final do dia na data final
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      logs = logs.filter(l => new Date(l.timestamp) <= end);
    }

    return logs;
  },

  importData: (data: LogEntry[]) => db.setAll(data),

  startRealtime,
  stopRealtime
};

// ❌ NÃO inicializar automaticamente - aguardar autenticação via supabaseInitService
// void loadFromSupabase();
