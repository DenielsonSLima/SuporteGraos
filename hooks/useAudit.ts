import { useCallback } from 'react';
import { auditService } from '../services/auditService';
import type { AuditLog, LoginHistory, UserSession } from '../services/auditService';

export type { AuditLog, LoginHistory, UserSession };

interface AuditLogsPageParams {
  limit: number;
  cursor?: string;
  module?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

interface SessionsPageParams {
  limit: number;
  cursor?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export function useAudit() {
  const fetchAuditLogsPage = useCallback((params: AuditLogsPageParams) => {
    return auditService.fetchAuditLogsPage(params);
  }, []);

  const fetchUserSessionsPage = useCallback((params: SessionsPageParams) => {
    return auditService.fetchUserSessionsPage(params);
  }, []);

  const fetchLoginHistoryPage = useCallback((params: SessionsPageParams) => {
    return auditService.fetchLoginHistoryPage(params);
  }, []);

  const fetchActiveSessionsCount = useCallback((params?: { minutes?: number }) => {
    return auditService.fetchActiveSessionsCount(params);
  }, []);

  const fetchFailedLoginsLast30 = useCallback(() => {
    return auditService.fetchFailedLoginsLast30();
  }, []);

  const fetchRecentLoginsCount = useCallback((limit: number) => {
    return auditService.fetchRecentLoginsCount(limit);
  }, []);

  return {
    fetchAuditLogsPage,
    fetchUserSessionsPage,
    fetchLoginHistoryPage,
    fetchActiveSessionsCount,
    fetchFailedLoginsLast30,
    fetchRecentLoginsCount,
  };
}
