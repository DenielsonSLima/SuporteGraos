import { Persistence } from '../persistence';
import type { AuditLog, UserSession, LoginHistory } from './types';

export const auditLogsDb = new Persistence<AuditLog>('audit_logs', [], { useStorage: false });
export const userSessionsDb = new Persistence<UserSession>('user_sessions', [], { useStorage: false });
export const loginHistoryDb = new Persistence<LoginHistory>('login_history', [], { useStorage: false });
