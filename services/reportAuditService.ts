import { auditService } from './auditService';
import { supabase } from './supabase';
import { waitForInit } from './supabaseInitService';
import { Persistence } from './persistence';

export interface ReportAccessLog {
  id: string;
  userId: string;
  reportId: string;
  reportTitle: string;
  filters: any;
  recordsCount: number;
  exportedToPdf: boolean;
  accessTime: string;
}

const reportLogsDb = new Persistence<ReportAccessLog>('report_access_logs', []);
let reportChannel: ReturnType<typeof supabase.channel> | null = null;
let _realtimeStarted = false;

// ============================================================================
// MAPEAMENTO SUPABASE <-> FRONTEND
// ============================================================================

const mapReportLogFromDb = (record: any): ReportAccessLog => ({
  id: record.id,
  userId: record.user_id,
  reportId: record.report_id,
  reportTitle: record.report_title,
  filters: record.filters,
  recordsCount: record.records_count,
  exportedToPdf: record.exported_to_pdf,
  accessTime: record.access_time
});

const mapReportLogToDb = (log: ReportAccessLog) => ({
  id: log.id,
  user_id: log.userId,
  report_id: log.reportId,
  report_title: log.reportTitle,
  filters: log.filters,
  records_count: log.recordsCount,
  exported_to_pdf: log.exportedToPdf,
  access_time: log.accessTime
});

// ============================================================================
// PERSIST OPERATIONS
// ============================================================================

const persistReportLog = async (log: ReportAccessLog) => {
  try {
    await waitForInit();
    const payload = mapReportLogToDb(log);
    const { error } = await supabase.from('report_access_logs').insert(payload);
    if (error) console.error('❌ Erro ao salvar report log:', error);
  } catch (err) {
    console.error('❌ Erro inesperado ao salvar report log:', err);
  }
};

// ============================================================================
// LOAD FROM SUPABASE
// ============================================================================

const loadFromSupabase = async () => {
  try {
    await waitForInit();
    const { data, error } = await supabase
      .from('report_access_logs')
      .select('*')
      .order('access_time', { ascending: false })
      .limit(5000);
    
    if (error) {
      if (error.code !== 'PGRST25') {
        console.warn('⚠️ Erro ao carregar report logs:', error);
      }
      return;
    }
    
    const mapped = data.map(mapReportLogFromDb);
    reportLogsDb.setAll(mapped);
  } catch (err) {
    console.warn('⚠️ ReportAuditService: Usando fallback:', err);
  }
};

// ============================================================================
// REALTIME SUBSCRIPTIONS
// ============================================================================

const startRealtime = () => {
  if (!reportChannel && !_realtimeStarted) {
    reportChannel = supabase.channel('report_logs_realtime');
    
    reportChannel
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'report_access_logs' },
        (payload: any) => {
          const log = mapReportLogFromDb(payload.new);
          reportLogsDb.add(log);
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('❌ Erro no canal report_access_logs realtime');
        }
      });

    _realtimeStarted = true;
  }
};

// ============================================================================
// EXPORT SERVICE
// ============================================================================

export const reportAuditService = {
  // Registrar acesso ao relatório
  logReportAccess: async (reportId: string, reportTitle: string, filters: any, recordsCount: number) => {
    const user = authService.getCurrentUser();
    
    const log: ReportAccessLog = {
      id: crypto.randomUUID(),
      userId: user?.id || 'system',
      reportId,
      reportTitle,
      filters,
      recordsCount,
      exportedToPdf: false,
      accessTime: new Date().toISOString()
    };
    
    reportLogsDb.add(log);
    void persistReportLog(log);
    
    // Registrar na auditoria geral
    void auditService.logAction('export', 'Relatórios', `Acessou relatório: ${reportTitle} (${recordsCount} registros)`);
  },

  // Registrar exportação de PDF
  logPdfExport: async (reportId: string, reportTitle: string, recordsCount: number) => {
    const user = authService.getCurrentUser();
    
    const log: ReportAccessLog = {
      id: crypto.randomUUID(),
      userId: user?.id || 'system',
      reportId,
      reportTitle,
      filters: {},
      recordsCount,
      exportedToPdf: true,
      accessTime: new Date().toISOString()
    };
    
    reportLogsDb.add(log);
    void persistReportLog(log);
    
    // Registrar na auditoria
    void auditService.logAction('export', 'Relatórios', `Exportou PDF: ${reportTitle} (${recordsCount} registros)`);
  },

  // Get all access logs
  getAccessLogs: () => reportLogsDb.getAll().sort((a, b) => 
    new Date(b.accessTime).getTime() - new Date(a.accessTime).getTime()
  ),

  // Get logs for specific report
  getReportLogs: (reportId: string) => {
    return reportLogsDb.getAll()
      .filter(log => log.reportId === reportId)
      .sort((a, b) => new Date(b.accessTime).getTime() - new Date(a.accessTime).getTime());
  },

  // Get logs by user
  getUserLogs: (userId: string) => {
    return reportLogsDb.getAll()
      .filter(log => log.userId === userId)
      .sort((a, b) => new Date(b.accessTime).getTime() - new Date(a.accessTime).getTime());
  },

  // Subscribe to changes
  subscribe: (callback: (logs: ReportAccessLog[]) => void) => {
    startRealtime();
    return reportLogsDb.subscribe(callback);
  },

  // Get statistics
  getStats: () => {
    const logs = reportLogsDb.getAll();
    const pdfExports = logs.filter(l => l.exportedToPdf).length;
    const totalAccess = logs.length;
    const uniqueReports = new Set(logs.map(l => l.reportId)).size;
    const uniqueUsers = new Set(logs.map(l => l.userId)).size;
    
    return {
      totalAccess,
      pdfExports,
      uniqueReports,
      uniqueUsers,
      mostAccessedReport: getMostAccessedReport(logs),
      topUsers: getTopUsers(logs)
    };
  },

  startRealtime
};

// ============================================================================
// HELPERS
// ============================================================================

const getMostAccessedReport = (logs: ReportAccessLog[]) => {
  const counts = new Map<string, number>();
  logs.forEach(log => {
    counts.set(log.reportTitle, (counts.get(log.reportTitle) || 0) + 1);
  });
  
  let maxReport = '';
  let maxCount = 0;
  counts.forEach((count, report) => {
    if (count > maxCount) {
      maxCount = count;
      maxReport = report;
    }
  });
  
  return { report: maxReport, count: maxCount };
};

const getTopUsers = (logs: ReportAccessLog[]) => {
  const counts = new Map<string, number>();
  logs.forEach(log => {
    counts.set(log.userId, (counts.get(log.userId) || 0) + 1);
  });
  
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([userId, count]) => ({ userId, count }));
};

// ❌ NÃO inicializar automaticamente - aguardar autenticação via supabaseInitService
// void loadFromSupabase();

// Import at the bottom to avoid circular dependency
import { authService } from './authService';
