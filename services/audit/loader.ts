import { supabase } from '../supabase';
import { waitForInit } from '../supabaseInitService';
import { isSqlCanonicalOpsEnabled } from '../sqlCanonicalOps';
import { shouldSkipLegacyTableOps } from '../realtimeTableAvailability';
import {
  mapAuditLogFromDb,
  mapUserSessionFromDb,
  mapLoginHistoryFromDb,
  AUDIT_LOG_FIELDS,
  USER_SESSION_FIELDS,
  LOGIN_HISTORY_FIELDS,
  buildDateRangeFilters,
  buildSearchOr
} from '../auditServiceHelpers';

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

export const fetchAuditLogsPage = async (options: {
  limit: number;
  cursor?: string;
  module?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}) => {
  if (isSqlCanonicalOpsEnabled()) {
    return { items: [], nextCursor: undefined, hasMore: false };
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

export const fetchUserSessionsPage = async (options: {
  limit: number;
  cursor?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}) => {
  if (isSqlCanonicalOpsEnabled()) {
    return { items: [], nextCursor: undefined, hasMore: false };
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

export const fetchLoginHistoryPage = async (options: {
  limit: number;
  cursor?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}) => {
  if (_loginHistoryUnavailable) {
    return { items: [], nextCursor: undefined, hasMore: false };
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
      return { items: [], nextCursor: undefined, hasMore: false };
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

export const fetchActiveSessionsCount = async (options?: { minutes?: number }) => {
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

export const fetchFailedLoginsLast30 = async () => {
  if (_loginHistoryUnavailable) return { failed: 0, total: 0 };

  await waitForInit();
  const { data, error } = await supabase
    .from('login_history')
    .select('login_type')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    if (isMissingRelationError(error)) {
      _loginHistoryUnavailable = true;
      return { failed: 0, total: 0 };
    }
    throw error;
  }
  const failed = (data || []).filter((item) => item.login_type === 'failed').length;
  return {
    failed,
    total: (data || []).length
  };
};

export const fetchRecentLoginsCount = async (limit: number) => {
  if (_loginHistoryUnavailable) return 0;

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
