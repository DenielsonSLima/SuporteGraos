import { supabase } from '../supabase';
import { waitForInit } from '../supabaseInitService';
import { isSqlCanonicalOpsEnabled } from '../sqlCanonicalOps';
import {
  isValidUuid,
  getCurrentUser,
  getClientInfo,
  mapAuditLogToDb,
  mapUserSessionToDb,
  mapUserSessionFromDb,
  mapLoginHistoryToDb,
  MAX_ACTIVE_SESSIONS_PER_USER
} from '../auditServiceHelpers';
import { auditLogsDb, userSessionsDb, loginHistoryDb } from './store';
import type { AuditLog, UserSession, LoginHistory } from './types';

const persistAuditLog = async (log: AuditLog) => {
  if (isSqlCanonicalOpsEnabled()) return;
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
  if (isSqlCanonicalOpsEnabled()) return;
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
  try {
    await waitForInit();
    const payload = mapLoginHistoryToDb(login);
    const { error } = await supabase.from('login_history').insert(payload);
    if (error) console.error('❌ Erro ao salvar login history:', error);
  } catch (err) {
    console.warn('[auditService] persistLoginHistory:', err);
  }
};

const enforceActiveSessionLimit = async (userId?: string | null) => {
  if (isSqlCanonicalOpsEnabled() || !userId) return;
  try {
    await waitForInit();
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('session_start', { ascending: true });

    if (error) return;

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
      userSessionsDb.update(updated);
      void persistUserSession(updated);
    });
  } catch (err) {
    console.warn('[auditService] enforceActiveSessionLimit:', err);
  }
};

export const logAction = async (action: AuditLog['action'], module: string, description: string, options?: {
  entityType?: string;
  entityId?: string;
  metadata?: any;
}) => {
  const { userId, userName, userEmail } = getCurrentUser();
  const clientInfo = getClientInfo();

  const log: AuditLog = {
    id: crypto.randomUUID(),
    userId: userId || 'system',
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
    createdAt: new Date().toISOString()
  };

  auditLogsDb.add(log);
  void persistAuditLog(log);
};

export const createSession = async (companyId?: string): Promise<UserSession> => {
  const { userId, userName, userEmail } = getCurrentUser();
  const clientInfo = getClientInfo();

  await enforceActiveSessionLimit(userId);

  const session: UserSession = {
    id: crypto.randomUUID(),
    userId: userId || '',
    userName,
    userEmail,
    sessionStart: new Date().toISOString(),
    ipAddress: clientInfo.ipAddress,
    userAgent: clientInfo.userAgent,
    browserInfo: clientInfo.browserInfo,
    deviceInfo: clientInfo.deviceInfo,
    status: 'active',
    companyId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  userSessionsDb.add(session);
  void persistUserSession(session);
  return session;
};

export const closeSession = async (sessionId: string) => {
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
};

export const recordLogin = async (userEmail: string, success: boolean, failureReason?: string): Promise<LoginHistory> => {
  const clientInfo = getClientInfo();
  const { userName, userId } = getCurrentUser();

  const login: LoginHistory = {
    id: crypto.randomUUID(),
    userEmail,
    userName,
    userId: userId || undefined,
    loginType: success ? 'success' : 'failed',
    failureReason,
    ipAddress: clientInfo.ipAddress,
    userAgent: clientInfo.userAgent,
    browserInfo: clientInfo.browserInfo,
    deviceInfo: clientInfo.deviceInfo,
    createdAt: new Date().toISOString()
  };

  loginHistoryDb.add(login);
  void persistLoginHistory(login);
  return login;
};

export const heartbeatSession = async (sessionId: string) => {
  if (isSqlCanonicalOpsEnabled()) return;
  await waitForInit();
  const nowIso = new Date().toISOString();
  await supabase.from('user_sessions').update({ updated_at: nowIso }).eq('id', sessionId);
};

export const closeStaleSessions = async (minutes: number) => {
  if (isSqlCanonicalOpsEnabled()) return;
  await waitForInit();
  const thresholdIso = new Date(Date.now() - minutes * 60 * 1000).toISOString();
  const nowIso = new Date().toISOString();

  await supabase
    .from('user_sessions')
    .update({ status: 'timeout', session_end: nowIso, updated_at: nowIso })
    .eq('status', 'active')
    .lt('updated_at', thresholdIso);
};
