
import { authService } from './authService';
import type { AuditLog, UserSession, LoginHistory } from './auditService';

// ============================================================================
// HELPERS
// ============================================================================

export const isValidUuid = (value?: string) => !!value && /^[0-9a-fA-F-]{36}$/.test(value);

export const getCurrentUser = () => {
  const user = authService.getCurrentUser();
  return {
    userId: isValidUuid(user?.id) ? user!.id : null,
    userName: user?.name || 'Sistema',
    userEmail: user?.email || 'system@system.com'
  };
};

export const getClientInfo = () => {
  if (typeof window === 'undefined') return {};
  return {
    ipAddress: 'localhost',
    userAgent: navigator.userAgent,
    browserInfo: getBrowserInfo(),
    deviceInfo: getDeviceInfo()
  };
};

export const getBrowserInfo = (): string => {
  if (typeof window === 'undefined') return '';
  const ua = navigator.userAgent;
  let browserName = 'Unknown';

  if (ua.indexOf('Chrome') > -1) browserName = 'Chrome';
  else if (ua.indexOf('Safari') > -1) browserName = 'Safari';
  else if (ua.indexOf('Firefox') > -1) browserName = 'Firefox';
  else if (ua.indexOf('Edge') > -1) browserName = 'Edge';

  return browserName;
};

export const getDeviceInfo = (): string => {
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

export const mapAuditLogFromDb = (record: any): AuditLog => ({
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

export const mapAuditLogToDb = (log: AuditLog) => ({
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

export const mapUserSessionFromDb = (record: any): UserSession => ({
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

export const mapUserSessionToDb = (session: UserSession) => ({
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

export const mapLoginHistoryFromDb = (record: any): LoginHistory => ({
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

export const mapLoginHistoryToDb = (login: LoginHistory) => ({
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

// ============================================================================
// CONSTANTES
// ============================================================================

export const MAX_ACTIVE_SESSIONS_PER_USER = 4;

export const AUDIT_LOG_FIELDS = 'id,user_id,user_name,user_email,action,module,description,entity_type,entity_id,ip_address,user_agent,metadata,company_id,created_at';
export const USER_SESSION_FIELDS = 'id,user_id,user_name,user_email,session_start,session_end,duration_minutes,ip_address,user_agent,browser_info,device_info,status,company_id,created_at,updated_at';
export const LOGIN_HISTORY_FIELDS = 'id,user_email,user_name,user_id,login_type,failure_reason,ip_address,user_agent,browser_info,device_info,location,two_factor_used,session_id,company_id,created_at';

export const buildDateRangeFilters = (query: any, startDate?: string, endDate?: string) => {
  if (startDate) query = query.gte('created_at', `${startDate}T00:00:00.000Z`);
  if (endDate) query = query.lte('created_at', `${endDate}T23:59:59.999Z`);
  return query;
};

export const buildSearchOr = (fields: string[], term: string) => {
  const sanitized = term.replace(/%/g, '\\%');
  return fields.map((field) => `${field}.ilike.%${sanitized}%`).join(',');
};
