import { supabase } from './supabase';
import { authService } from './authService';
import { waitForInit } from './supabaseInitService';
import { Persistence } from './persistence';

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

// ============================================================================
// HELPERS
// ============================================================================

const isValidUuid = (value?: string) => !!value && /^[0-9a-fA-F-]{36}$/.test(value);

const getCurrentUser = () => {
  const user = authService.getCurrentUser();
  return {
    userId: isValidUuid(user?.id) ? user!.id : null,
    userName: user?.name || 'Sistema',
    userEmail: user?.email || 'system@system.com'
  };
};

const getClientInfo = () => {
  if (typeof window === 'undefined') return {};
  return {
    ipAddress: 'localhost',
    userAgent: navigator.userAgent,
    browserInfo: getBrowserInfo(),
    deviceInfo: getDeviceInfo()
  };
};

const getBrowserInfo = (): string => {
  if (typeof window === 'undefined') return '';
  const ua = navigator.userAgent;
  let browserName = 'Unknown';

  if (ua.indexOf('Chrome') > -1) browserName = 'Chrome';
  else if (ua.indexOf('Safari') > -1) browserName = 'Safari';
  else if (ua.indexOf('Firefox') > -1) browserName = 'Firefox';
  else if (ua.indexOf('Edge') > -1) browserName = 'Edge';

  return browserName;
};

const getDeviceInfo = (): string => {
  if (typeof window === 'undefined') return '';
  const ua = navigator.userAgent.toLowerCase();

  if (/mobile|android|iphone|ipad|tablet/.test(ua)) return 'Mobile';
  if (/mac|macintosh/.test(ua)) return 'macOS';
  if (/windows|win32/.test(ua)) return 'Windows';
  if (/linux/.test(ua)) return 'Linux';

  return 'Unknown';
};

// ============================================================================
// MAPEAMENTO SUPABASE <-> FRONTEND
// ============================================================================

const mapAuditLogFromDb = (record: any): AuditLog => ({
  id: record.id,
  userId: record.user_id || 'system',
  userName: record.user_name || 'Sistema',
  userEmail: record.user_email || 'system@system.com',
  action: record.action,
  module: record.module,
  description: record.description,
  entityType: record.entity_type,
  entityId: record.entity_id,
  ipAddress: record.ip_address,
  userAgent: record.user_agent,
  metadata: record.metadata,
  companyId: record.company_id,
  createdAt: record.created_at
});

const mapAuditLogToDb = (log: AuditLog) => ({
  id: log.id,
  user_id: isValidUuid(log.userId) ? log.userId : null,
  user_name: log.userName,
  user_email: log.userEmail,
  action: log.action,
  module: log.module,
  description: log.description,
  entity_type: log.entityType,
  entity_id: log.entityId,
  ip_address: log.ipAddress,
  user_agent: log.userAgent,
  metadata: log.metadata,
  company_id: log.companyId,
  created_at: log.createdAt
});

const mapUserSessionFromDb = (record: any): UserSession => ({
  id: record.id,
  userId: record.user_id,
  userName: record.user_name,
  userEmail: record.user_email,
  sessionStart: record.session_start,
  sessionEnd: record.session_end,
  durationMinutes: record.duration_minutes,
  ipAddress: record.ip_address,
  userAgent: record.user_agent,
  browserInfo: record.browser_info,
  deviceInfo: record.device_info,
  status: record.status,
  companyId: record.company_id,
  createdAt: record.created_at,
  updatedAt: record.updated_at
});

const mapUserSessionToDb = (session: UserSession) => ({
  id: session.id,
  user_id: isValidUuid(session.userId) ? session.userId : null,
  user_name: session.userName,
  user_email: session.userEmail,
  session_start: session.sessionStart,
  session_end: session.sessionEnd,
  duration_minutes: session.durationMinutes,
  ip_address: session.ipAddress,
  user_agent: session.userAgent,
  browser_info: session.browserInfo,
  device_info: session.deviceInfo,
  status: session.status,
  company_id: session.companyId,
  created_at: session.createdAt,
  updated_at: session.updatedAt
});

const mapLoginHistoryFromDb = (record: any): LoginHistory => ({
  id: record.id,
  userEmail: record.user_email,
  userName: record.user_name,
  userId: record.user_id,
  loginType: record.login_type,
  failureReason: record.failure_reason,
  ipAddress: record.ip_address,
  userAgent: record.user_agent,
  browserInfo: record.browser_info,
  deviceInfo: record.device_info,
  location: record.location,
  twoFactorUsed: record.two_factor_used,
  sessionId: record.session_id,
  companyId: record.company_id,
  createdAt: record.created_at
});

const mapLoginHistoryToDb = (login: LoginHistory) => ({
  id: login.id,
  user_email: login.userEmail,
  user_name: login.userName,
  user_id: isValidUuid(login.userId) ? login.userId : null,
  login_type: login.loginType,
  failure_reason: login.failureReason,
  ip_address: login.ipAddress,
  user_agent: login.userAgent,
  browser_info: login.browserInfo,
  device_info: login.deviceInfo,
  location: login.location,
  two_factor_used: login.twoFactorUsed,
  session_id: login.sessionId,
  company_id: login.companyId,
  created_at: login.createdAt
});

const MAX_ACTIVE_SESSIONS_PER_USER = 4;

const AUDIT_LOG_FIELDS = 'id,user_id,user_name,user_email,action,module,description,entity_type,entity_id,ip_address,user_agent,metadata,company_id,created_at';
const USER_SESSION_FIELDS = 'id,user_id,user_name,user_email,session_start,session_end,duration_minutes,ip_address,user_agent,browser_info,device_info,status,company_id,created_at,updated_at';
const LOGIN_HISTORY_FIELDS = 'id,user_email,user_name,user_id,login_type,failure_reason,ip_address,user_agent,browser_info,device_info,location,two_factor_used,session_id,company_id,created_at';

const buildDateRangeFilters = (query: any, startDate?: string, endDate?: string) => {
  if (startDate) query = query.gte('created_at', `${startDate}T00:00:00.000Z`);
  if (endDate) query = query.lte('created_at', `${endDate}T23:59:59.999Z`);
  return query;
};

const buildSearchOr = (fields: string[], term: string) => {
  const sanitized = term.replace(/%/g, '\\%');
  return fields.map((field) => `${field}.ilike.%${sanitized}%`).join(',');
};

// ============================================================================
// PERSIST OPERATIONS
// ============================================================================

const persistAuditLog = async (log: AuditLog) => {
  try {
    await waitForInit();
    const payload = mapAuditLogToDb(log);
    const { error } = await supabase.from('audit_logs').insert(payload);
    if (error) console.error('❌ Erro ao salvar audit log:', error);
  } catch (err) {
    console.error('❌ Erro inesperado ao salvar audit log:', err);
  }
};

const persistUserSession = async (session: UserSession) => {
  try {
    await waitForInit();
    const payload = mapUserSessionToDb(session);
    const { error } = await supabase.from('user_sessions').upsert(payload);
    if (error) console.error('❌ Erro ao salvar sessão:', error);
  } catch (err) {
    console.error('❌ Erro inesperado ao salvar sessão:', err);
  }
};

const persistLoginHistory = async (login: LoginHistory) => {
  try {
    await waitForInit();
    const payload = mapLoginHistoryToDb(login);
    const { error } = await supabase.from('login_history').insert(payload);
    if (error) console.error('❌ Erro ao salvar login history:', error);
  } catch (err) {
    console.error('❌ Erro inesperado ao salvar login history:', err);
  }
};

const enforceActiveSessionLimit = async (userId?: string | null) => {
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
      console.error('❌ Erro ao carregar sessões ativas:', error);
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
    console.error('❌ Erro ao aplicar limite de sessões:', err);
  }
};

// ============================================================================
// LOAD FROM SUPABASE
// ============================================================================

const loadAuditLogsFromSupabase = async () => {
  try {
    await waitForInit();
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      if (error.code !== 'PGRST25') {
        console.warn('⚠️ Erro ao carregar audit logs:', error);
      }
      return;
    }

    const mapped = data.map(mapAuditLogFromDb);
    auditLogsDb.setAll(mapped);
  } catch (err) {
    console.warn('⚠️ AuditService: Usando fallback para audit logs:', err);
  }
};

const loadUserSessionsFromSupabase = async () => {
  try {
    await waitForInit();
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .order('session_start', { ascending: false })
      .limit(500);

    if (error) {
      if (error.code !== 'PGRST25') {
        console.warn('⚠️ Erro ao carregar sessões:', error);
      }
      return;
    }

    const mapped = data.map(mapUserSessionFromDb);
    userSessionsDb.setAll(mapped);
  } catch (err) {
    console.warn('⚠️ AuditService: Usando fallback para sessões:', err);
  }
};

const loadLoginHistoryFromSupabase = async () => {
  try {
    await waitForInit();
    const { data, error } = await supabase
      .from('login_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      if (error.code !== 'PGRST25') {
        console.warn('⚠️ Erro ao carregar login history:', error);
      }
      return;
    }

    const mapped = data.map(mapLoginHistoryFromDb);
    loginHistoryDb.setAll(mapped);
  } catch (err) {
    console.warn('⚠️ AuditService: Usando fallback para login history:', err);
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
  if (error) throw error;
  const items = (data || []).map(mapLoginHistoryFromDb);
  const nextCursor = items.length > 0 ? items[items.length - 1].createdAt : undefined;

  return {
    items,
    nextCursor,
    hasMore: items.length === options.limit
  };
};

const fetchActiveSessionsCount = async (options?: { minutes?: number }) => {
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
  await waitForInit();
  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from('user_sessions')
    .update({ updated_at: nowIso })
    .eq('id', sessionId);

  if (error) throw error;
};

const fetchFailedLoginsLast30 = async () => {
  await waitForInit();
  const { data, error } = await supabase
    .from('login_history')
    .select('login_type')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) throw error;
  const failed = (data || []).filter((item) => item.login_type === 'failed').length;
  return {
    failed,
    total: (data || []).length
  };
};

const fetchRecentLoginsCount = async (limit: number) => {
  await waitForInit();
  const { data, error } = await supabase
    .from('login_history')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []).length;
};

// ============================================================================
// REALTIME SUBSCRIPTIONS
// ============================================================================

const startRealtimeAuditLogs = () => {
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
          console.error('❌ Erro no canal audit_logs realtime');
        }
      });
  }
};

const startRealtimeUserSessions = () => {
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
          console.error('❌ Erro no canal user_sessions realtime');
        }
      });
  }
};

const startRealtimeLoginHistory = () => {
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
          console.error('❌ Erro no canal login_history realtime');
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

// ============================================================================
// INITIALIZATION
// ============================================================================

// ❌ NÃO inicializar automaticamente - aguardar autenticação via supabaseInitService
// void Promise.all([
//   loadAuditLogsFromSupabase(),
//   loadUserSessionsFromSupabase(),
//   loadLoginHistoryFromSupabase()
// ]);

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
      companyId: authService.getCurrentUser()?.companyId,
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
      companyId: authService.getCurrentUser()?.companyId,
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
      userName: authService.getCurrentUser()?.name || 'Desconhecido',
      userId: authService.getCurrentUser()?.id,
      loginType: success ? 'success' : 'failed',
      failureReason,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      browserInfo: clientInfo.browserInfo,
      deviceInfo: clientInfo.deviceInfo,
      companyId: authService.getCurrentUser()?.companyId,
      createdAt: new Date().toISOString()
    };

    loginHistoryDb.add(login);
    void persistLoginHistory(login);

    return login;
  },

  // === UTILS ===
  startRealtime: startAllRealtime,

  getStats: () => ({
    totalAuditLogs: auditLogsDb.getAll().length,
    activeSessions: userSessionsDb.getAll().filter(s => s.status === 'active').length,
    totalLogins: loginHistoryDb.getAll().length,
    failedLogins: loginHistoryDb.getAll().filter(l => l.loginType === 'failed').length
  })
};
