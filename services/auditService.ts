import { supabase } from './supabase';

import { waitForInit } from './supabaseInitService';
import { Persistence } from './persistence';
import { isSqlCanonicalOpsEnabled, sqlCanonicalOpsLog } from './sqlCanonicalOps';
import { shouldSkipLegacyTableOps } from './realtimeTableAvailability';
import {
  isValidUuid, getCurrentUser, getClientInfo,
  mapAuditLogFromDb, mapAuditLogToDb,
  mapUserSessionFromDb, mapUserSessionToDb,
  mapLoginHistoryFromDb, mapLoginHistoryToDb,
  MAX_ACTIVE_SESSIONS_PER_USER,
  AUDIT_LOG_FIELDS, USER_SESSION_FIELDS, LOGIN_HISTORY_FIELDS,
  buildDateRangeFilters, buildSearchOr
} from './auditServiceHelpers';

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'approve' | 'cancel' | 'export' | 'import';
  module: string;
  description: string;
  entityType?: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
  companyId?: string;
  createdAt: string;
}

export interface UserSession {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  sessionStart: string;
  sessionEnd?: string;
  durationMinutes?: number;
  ipAddress?: string;
  userAgent?: string;
  browserInfo?: string;
  deviceInfo?: string;
  status: 'active' | 'closed' | 'timeout';
  companyId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginHistory {
  id: string;
  userEmail: string;
  userName?: string;
  userId?: string;
  loginType: 'success' | 'failed' | 'timeout' | 'locked';
  failureReason?: string;
  ipAddress?: string;
  userAgent?: string;
  browserInfo?: string;
  deviceInfo?: string;
  location?: string;
  twoFactorUsed?: boolean;
  sessionId?: string;
  companyId?: string;
  createdAt: string;
}

// ============================================================================
// LOCAL DATABASES (memoria + Supabase, sem localStorage)
// ============================================================================

const auditLogsDb = new Persistence<AuditLog>('audit_logs', [], { useStorage: false });
const userSessionsDb = new Persistence<UserSession>('user_sessions', [], { useStorage: false });
const loginHistoryDb = new Persistence<LoginHistory>('login_history', [], { useStorage: false });

let auditChannel: ReturnType<typeof supabase.channel> | null = null;
let sessionsChannel: ReturnType<typeof supabase.channel> | null = null;
let loginChannel: ReturnType<typeof supabase.channel> | null = null;

let _realtimeStarted = false;
let _loginHistoryUnavailable = shouldSkipLegacyTableOps('login_history');

const isMissingRelationError = (error: any) => {
  const code = String(error?.code || '');
  const status = Number(error?.status || error?.statusCode || 0);
  const message = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();

  return (
    code === 'PGRST205'
    || code === '42P01'
    || status === 404
    || message.includes('could not find the table')
    || details.includes('could not find the table')
  );
};

// ============================================================================
// PERSIST OPERATIONS
// ============================================================================

const persistAuditLog = async (log: AuditLog) => {
  if (isSqlCanonicalOpsEnabled()) {
    return;
  }

  try {
    await waitForInit();
    const payload = mapAuditLogToDb(log);
    const { error } = await supabase.from('audit_logs').insert(payload);
    if (error && error.code !== 'PGRST205' && error.code !== 'PGRST25') {
      console.error('❌ Erro ao salvar audit log:', error);
    }
  } catch (err) {
    console.warn('[auditService] persistAuditLog:', err);
  }
};

const persistUserSession = async (session: UserSession) => {
  if (isSqlCanonicalOpsEnabled()) {
    return;
  }

  try {
    await waitForInit();
    const payload = mapUserSessionToDb(session);
    const { error } = await supabase.from('user_sessions').upsert(payload);
    if (error) console.error('❌ Erro ao salvar sessão:', error);
  } catch (err) {
    console.warn('[auditService] persistUserSession:', err);
  }
};

const persistLoginHistory = async (login: LoginHistory) => {
  if (_loginHistoryUnavailable) {
    return;
  }

  try {
    await waitForInit();
    const payload = mapLoginHistoryToDb(login);
    const { error } = await supabase.from('login_history').insert(payload);
    if (error) {
      if (isMissingRelationError(error)) {
        _loginHistoryUnavailable = true;
        return;
      }
      console.error('❌ Erro ao salvar login history:', error);
    }
  } catch (err) {
    console.warn('[auditService] persistLoginHistory:', err);
  }
};

const enforceActiveSessionLimit = async (userId?: string | null) => {
  if (isSqlCanonicalOpsEnabled()) return;
  if (!userId) return;
  try {
    await waitForInit();
    const { data, error } = await supabase
      .from('user_sessions')
      .select('id,user_id,user_name,user_email,session_start,session_end,duration_minutes,ip_address,user_agent,browser_info,device_info,status,company_id,created_at,updated_at')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('session_start', { ascending: true });

    if (error) {
      return;
    }

    const sessions = (data || []).map(mapUserSessionFromDb);
    if (sessions.length < MAX_ACTIVE_SESSIONS_PER_USER) return;

    const nowIso = new Date().toISOString();
    const toClose = sessions.slice(0, sessions.length - (MAX_ACTIVE_SESSIONS_PER_USER - 1));

    toClose.forEach((session) => {
      const updated: UserSession = {
        ...session,
        sessionEnd: nowIso,
        status: 'closed',
        updatedAt: nowIso
      };
      const existing = userSessionsDb.getById(updated.id);
      if (existing) userSessionsDb.update(updated);
      else userSessionsDb.add(updated);
      void persistUserSession(updated);
    });
  } catch (err) {
    console.warn('[auditService] enforceActiveSessionLimit:', err);
  }
};

// ============================================================================
// FETCH PAGINADO (Egress baixo)
// ============================================================================

const fetchAuditLogsPage = async (options: {
  limit: number;
  cursor?: string;
  module?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}) => {
  if (isSqlCanonicalOpsEnabled()) {
    return {
      items: [],
      nextCursor: undefined,
      hasMore: false
    };
  }

  await waitForInit();
  let query = supabase
    .from('audit_logs')
    .select(AUDIT_LOG_FIELDS)
    .order('created_at', { ascending: false })
    .limit(options.limit);

  if (options.cursor) query = query.lt('created_at', options.cursor);
  if (options.module && options.module !== 'all') query = query.eq('module', options.module);
  if (options.search) query = query.or(buildSearchOr(['description', 'user_name', 'user_email'], options.search));
  query = buildDateRangeFilters(query, options.startDate, options.endDate);

  const { data, error } = await query;
  if (error) throw error;
  const items = (data || []).map(mapAuditLogFromDb);
  const nextCursor = items.length > 0 ? items[items.length - 1].createdAt : undefined;

  return {
    items,
    nextCursor,
    hasMore: items.length === options.limit
  };
};

const fetchUserSessionsPage = async (options: {
  limit: number;
  cursor?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}) => {
  if (isSqlCanonicalOpsEnabled()) {
    return {
      items: [],
      nextCursor: undefined,
      hasMore: false
    };
  }

  await waitForInit();
  let query = supabase
    .from('user_sessions')
    .select(USER_SESSION_FIELDS)
    .order('session_start', { ascending: false })
    .limit(options.limit);

  if (options.cursor) query = query.lt('session_start', options.cursor);
  if (options.search) query = query.or(buildSearchOr(['user_name', 'user_email'], options.search));
  if (options.startDate) query = query.gte('session_start', `${options.startDate}T00:00:00.000Z`);
  if (options.endDate) query = query.lte('session_start', `${options.endDate}T23:59:59.999Z`);

  const { data, error } = await query;
  if (error) throw error;
  const items = (data || []).map(mapUserSessionFromDb);
  const nextCursor = items.length > 0 ? items[items.length - 1].sessionStart : undefined;

  return {
    items,
    nextCursor,
    hasMore: items.length === options.limit
  };
};

const fetchLoginHistoryPage = async (options: {
  limit: number;
  cursor?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}) => {
  if (_loginHistoryUnavailable) {
    return {
      items: [],
      nextCursor: undefined,
      hasMore: false
    };
  }

  await waitForInit();
  let query = supabase
    .from('login_history')
    .select(LOGIN_HISTORY_FIELDS)
    .order('created_at', { ascending: false })
    .limit(options.limit);

  if (options.cursor) query = query.lt('created_at', options.cursor);
  if (options.search) query = query.or(buildSearchOr(['user_email', 'user_name'], options.search));
  query = buildDateRangeFilters(query, options.startDate, options.endDate);

  const { data, error } = await query;
  if (error) {
    if (isMissingRelationError(error)) {
      _loginHistoryUnavailable = true;
      return {
        items: [],
        nextCursor: undefined,
        hasMore: false
      };
    }
    throw error;
  }
  const items = (data || []).map(mapLoginHistoryFromDb);
  const nextCursor = items.length > 0 ? items[items.length - 1].createdAt : undefined;

  return {
    items,
    nextCursor,
    hasMore: items.length === options.limit
  };
};

const fetchActiveSessionsCount = async (options?: { minutes?: number }) => {
  if (isSqlCanonicalOpsEnabled()) return 0;
  const minutes = options?.minutes ?? 60;
  const thresholdIso = new Date(Date.now() - minutes * 60 * 1000).toISOString();
  await waitForInit();
  const { count, error } = await supabase
    .from('user_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
    .gte('updated_at', thresholdIso);

  if (error) throw error;
  return count || 0;
};

const closeStaleSessions = async (minutes: number) => {
  if (isSqlCanonicalOpsEnabled()) return;
  await waitForInit();
  const thresholdIso = new Date(Date.now() - minutes * 60 * 1000).toISOString();
  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from('user_sessions')
    .update({ status: 'timeout', session_end: nowIso, updated_at: nowIso })
    .eq('status', 'active')
    .lt('updated_at', thresholdIso);

  if (error) throw error;
};

const heartbeatSession = async (sessionId: string) => {
  if (isSqlCanonicalOpsEnabled()) return;
  await waitForInit();
  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from('user_sessions')
    .update({ updated_at: nowIso })
    .eq('id', sessionId);

  if (error) throw error;
};

const fetchFailedLoginsLast30 = async () => {
  if (_loginHistoryUnavailable) {
    return {
      failed: 0,
      total: 0
    };
  }

  await waitForInit();
  const { data, error } = await supabase
    .from('login_history')
    .select('login_type')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    if (isMissingRelationError(error)) {
      _loginHistoryUnavailable = true;
      return {
        failed: 0,
        total: 0
      };
    }
    throw error;
  }
  const failed = (data || []).filter((item) => item.login_type === 'failed').length;
  return {
    failed,
    total: (data || []).length
  };
};

const fetchRecentLoginsCount = async (limit: number) => {
  if (_loginHistoryUnavailable) {
    return 0;
  }

  await waitForInit();
  const { data, error } = await supabase
    .from('login_history')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingRelationError(error)) {
      _loginHistoryUnavailable = true;
      return 0;
    }
    throw error;
  }
  return (data || []).length;
};

// ============================================================================
// REALTIME SUBSCRIPTIONS
// ============================================================================

const startRealtimeAuditLogs = () => {
  if (isSqlCanonicalOpsEnabled()) {
    return;
  }

  if (!auditChannel) {
    auditChannel = supabase.channel('audit_logs_realtime');

    auditChannel
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_logs' },
        (payload: any) => {
          const log = mapAuditLogFromDb(payload.new);
          auditLogsDb.add(log);
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'audit_logs' },
        (payload: any) => {
          const log = mapAuditLogFromDb(payload.new);
          auditLogsDb.update(log);
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
        }
      });
  }
};

const startRealtimeUserSessions = () => {
  if (isSqlCanonicalOpsEnabled()) {
    sqlCanonicalOpsLog('auditService.startRealtimeUserSessions ignorado (modo canônico)');
    return;
  }

  if (!sessionsChannel) {
    sessionsChannel = supabase.channel('user_sessions_realtime');

    sessionsChannel
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_sessions' },
        (payload: any) => {
          const session = mapUserSessionFromDb(payload.new);
          userSessionsDb.add(session);
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_sessions' },
        (payload: any) => {
          const session = mapUserSessionFromDb(payload.new);
          userSessionsDb.update(session);
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
        }
      });
  }
};

const startRealtimeLoginHistory = () => {
  if (_loginHistoryUnavailable) {
    return;
  }

  if (!loginChannel) {
    loginChannel = supabase.channel('login_history_realtime');

    loginChannel
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'login_history' },
        (payload: any) => {
          const login = mapLoginHistoryFromDb(payload.new);
          loginHistoryDb.add(login);
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          _loginHistoryUnavailable = true;
        }
      });
  }
};

const startAllRealtime = () => {
  if (!_realtimeStarted) {
    startRealtimeAuditLogs();
    startRealtimeUserSessions();
    startRealtimeLoginHistory();
    _realtimeStarted = true;
  }
};

const stopAllRealtime = () => {
  if (auditChannel) {
    supabase.removeChannel(auditChannel);
    auditChannel = null;
  }
  if (sessionsChannel) {
    supabase.removeChannel(sessionsChannel);
    sessionsChannel = null;
  }
  if (loginChannel) {
    supabase.removeChannel(loginChannel);
    loginChannel = null;
  }
  _realtimeStarted = false;
};

// ============================================================================
// EXPORT SERVICE
// ============================================================================

export const auditService = {
  fetchAuditLogsPage,
  fetchUserSessionsPage,
  fetchLoginHistoryPage,
  fetchActiveSessionsCount,
  fetchFailedLoginsLast30,
  fetchRecentLoginsCount,
  closeStaleSessions,
  heartbeatSession,
  // === AUDIT LOGS ===
  getAuditLogs: () => auditLogsDb.getAll().sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ),

  subscribeAuditLogs: (callback: (logs: AuditLog[]) => void) => {
    startAllRealtime();
    return auditLogsDb.subscribe(callback);
  },

  logAction: async (action: AuditLog['action'], module: string, description: string, options?: {
    entityType?: string;
    entityId?: string;
    metadata?: any;
  }) => {
    const { userId, userName, userEmail } = getCurrentUser();
    const clientInfo = getClientInfo();

    const log: AuditLog = {
      id: crypto.randomUUID(),
      userId,
      userName,
      userEmail,
      action,
      module,
      description,
      entityType: options?.entityType,
      entityId: options?.entityId,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      metadata: options?.metadata,
      companyId: (await import('./authService')).authService.getCurrentUser()?.companyId,

      createdAt: new Date().toISOString()
    };

    auditLogsDb.add(log);
    void persistAuditLog(log);
  },

  // === USER SESSIONS ===
  getUserSessions: () => userSessionsDb.getAll().sort((a, b) =>
    new Date(b.sessionStart).getTime() - new Date(a.sessionStart).getTime()
  ),

  subscribeUserSessions: (callback: (sessions: UserSession[]) => void) => {
    startAllRealtime();
    return userSessionsDb.subscribe(callback);
  },

  createSession: async (): Promise<UserSession> => {
    const { userId, userName, userEmail } = getCurrentUser();
    const clientInfo = getClientInfo();

    await enforceActiveSessionLimit(userId);

    const session: UserSession = {
      id: crypto.randomUUID(),
      userId,
      userName,
      userEmail,
      sessionStart: new Date().toISOString(),
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      browserInfo: clientInfo.browserInfo,
      deviceInfo: clientInfo.deviceInfo,
      status: 'active',
      companyId: (await import('./authService')).authService.getCurrentUser()?.companyId,

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    userSessionsDb.add(session);
    void persistUserSession(session);

    return session;
  },

  closeSession: async (sessionId: string) => {
    const session = userSessionsDb.getById(sessionId);
    if (session) {
      const updated: UserSession = {
        ...session,
        sessionEnd: new Date().toISOString(),
        status: 'closed',
        updatedAt: new Date().toISOString()
      };
      userSessionsDb.update(updated);
      void persistUserSession(updated);
    }
  },

  // === LOGIN HISTORY ===
  getLoginHistory: () => loginHistoryDb.getAll().sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ),

  subscribeLoginHistory: (callback: (logins: LoginHistory[]) => void) => {
    startAllRealtime();
    return loginHistoryDb.subscribe(callback);
  },

  recordLogin: async (userEmail: string, success: boolean, failureReason?: string): Promise<LoginHistory> => {
    const clientInfo = getClientInfo();

    const login: LoginHistory = {
      id: crypto.randomUUID(),
      userEmail,
      userName: (await import('./authService')).authService.getCurrentUser()?.name || 'Desconhecido',
      userId: (await import('./authService')).authService.getCurrentUser()?.id,

      loginType: success ? 'success' : 'failed',
      failureReason,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      browserInfo: clientInfo.browserInfo,
      deviceInfo: clientInfo.deviceInfo,
      companyId: (await import('./authService')).authService.getCurrentUser()?.companyId,

      createdAt: new Date().toISOString()
    };

    loginHistoryDb.add(login);
    void persistLoginHistory(login);

    return login;
  },

  // === UTILS ===
  startRealtime: startAllRealtime,
  stopRealtime: stopAllRealtime,

  getStats: () => ({
    totalAuditLogs: auditLogsDb.getAll().length,
    activeSessions: userSessionsDb.getAll().filter(s => s.status === 'active').length,
    totalLogins: loginHistoryDb.getAll().length,
    failedLogins: loginHistoryDb.getAll().filter(l => l.loginType === 'failed').length
  })
};
