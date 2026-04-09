import { supabase } from '../supabase';
import { isSqlCanonicalOpsEnabled } from '../sqlCanonicalOps';
import { shouldSkipLegacyTableOps } from '../realtimeTableAvailability';
import { mapAuditLogFromDb, mapUserSessionFromDb, mapLoginHistoryFromDb } from '../auditServiceHelpers';
import { auditLogsDb, userSessionsDb, loginHistoryDb } from './store';

let auditChannel: any = null;
let sessionsChannel: any = null;
let loginChannel: any = null;
let _realtimeStarted = false;
let _loginHistoryUnavailable = shouldSkipLegacyTableOps('login_history');

export const startRealtimeAuditLogs = () => {
  if (isSqlCanonicalOpsEnabled() || auditChannel) return;

  auditChannel = supabase.channel('audit_logs_realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, (payload) => {
      auditLogsDb.add(mapAuditLogFromDb(payload.new));
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'audit_logs' }, (payload) => {
      auditLogsDb.update(mapAuditLogFromDb(payload.new));
    })
    .subscribe();
};

export const startRealtimeUserSessions = () => {
  if (isSqlCanonicalOpsEnabled() || sessionsChannel) return;

  sessionsChannel = supabase.channel('user_sessions_realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_sessions' }, (payload) => {
      userSessionsDb.add(mapUserSessionFromDb(payload.new));
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_sessions' }, (payload) => {
      userSessionsDb.update(mapUserSessionFromDb(payload.new));
    })
    .subscribe();
};

export const startRealtimeLoginHistory = () => {
  if (_loginHistoryUnavailable || loginChannel) return;

  loginChannel = supabase.channel('login_history_realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'login_history' }, (payload) => {
      loginHistoryDb.add(mapLoginHistoryFromDb(payload.new));
    })
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') _loginHistoryUnavailable = true;
    });
};

export const startAllRealtime = () => {
  if (!_realtimeStarted) {
    // EGRESS: Canais de auditoria desativados — logs são consultados sob demanda,
    // não precisam de push em tempo real para a UI operacional.
    // startRealtimeAuditLogs();
    // startRealtimeUserSessions();
    // startRealtimeLoginHistory();
    _realtimeStarted = true;
  }
};

export const stopAllRealtime = () => {
  if (auditChannel) { supabase.removeChannel(auditChannel); auditChannel = null; }
  if (sessionsChannel) { supabase.removeChannel(sessionsChannel); sessionsChannel = null; }
  if (loginChannel) { supabase.removeChannel(loginChannel); loginChannel = null; }
  _realtimeStarted = false;
};
