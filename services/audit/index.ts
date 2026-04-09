import { auditLogsDb, userSessionsDb, loginHistoryDb } from './store';
import {
  fetchAuditLogsPage,
  fetchUserSessionsPage,
  fetchLoginHistoryPage,
  fetchActiveSessionsCount,
  fetchFailedLoginsLast30,
  fetchRecentLoginsCount
} from './loader';
import {
  logAction,
  createSession,
  closeSession,
  recordLogin,
  heartbeatSession,
  closeStaleSessions
} from './actions';
import { startAllRealtime, stopAllRealtime } from './realtime';
import type { AuditLog, UserSession, LoginHistory } from './types';

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
  logAction,

  // === USER SESSIONS ===
  getUserSessions: () => userSessionsDb.getAll().sort((a, b) =>
    new Date(b.sessionStart).getTime() - new Date(a.sessionStart).getTime()
  ),
  subscribeUserSessions: (callback: (sessions: UserSession[]) => void) => {
    startAllRealtime();
    return userSessionsDb.subscribe(callback);
  },
  createSession,
  closeSession,

  // === LOGIN HISTORY ===
  getLoginHistory: () => loginHistoryDb.getAll().sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ),
  subscribeLoginHistory: (callback: (logins: LoginHistory[]) => void) => {
    startAllRealtime();
    return loginHistoryDb.subscribe(callback);
  },
  recordLogin,

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
