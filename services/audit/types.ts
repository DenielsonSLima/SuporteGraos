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
