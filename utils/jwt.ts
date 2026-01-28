/**
 * ============================================================================
 * JWT UTILITY - Gerenciamento de Tokens JWT
 * ============================================================================
 * 
 * Funções para:
 * - Geração de tokens JWT (access token)
 * - Validação e decodificação de tokens
 * - Geração de refresh tokens
 * - Verificação de expiração
 * 
 * Uso:
 * ```typescript
 * const token = generateAccessToken({ userId: '123', email: 'user@example.com' });
 * const decoded = verifyToken(token);
 * ```
 */

import jwt from 'jsonwebtoken';

// ============================================================================
// CONFIGURAÇÕES
// ============================================================================

/**
 * Chave secreta para assinar os tokens
 * EM PRODUÇÃO: Use uma variável de ambiente forte e única!
 */
const JWT_SECRET = process.env.JWT_SECRET || 'suporte-graos-erp-secret-key-2026-change-in-production';

/**
 * Chave secreta para refresh tokens (diferente do access token)
 */
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'suporte-graos-refresh-secret-2026-change-in-production';

/**
 * Duração do access token (2 horas)
 */
const ACCESS_TOKEN_EXPIRES_IN = '2h';

/**
 * Duração do refresh token (7 dias)
 */
const REFRESH_TOKEN_EXPIRES_IN = '7d';

// ============================================================================
// TIPOS
// ============================================================================

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  name?: string;
  permissions?: string[];
}

export interface DecodedToken extends TokenPayload {
  iat: number;  // issued at
  exp: number;  // expiration
}

// ============================================================================
// GERAÇÃO DE TOKENS
// ============================================================================

/**
 * Gera um Access Token JWT
 * @param payload Dados do usuário
 * @returns Token JWT assinado
 */
export const generateAccessToken = (payload: TokenPayload): string => {
  try {
    const token = jwt.sign(
      {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        name: payload.name,
        permissions: payload.permissions || []
      },
      JWT_SECRET,
      {
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
        issuer: 'suporte-graos-erp',
        audience: 'suporte-graos-users'
      }
    );

    return token;
  } catch (error) {
    console.error('Erro ao gerar access token:', error);
    throw new Error('Falha ao gerar token de acesso');
  }
};

/**
 * Gera um Refresh Token JWT
 * @param userId ID do usuário
 * @returns Refresh token JWT
 */
export const generateRefreshToken = (userId: string): string => {
  try {
    const token = jwt.sign(
      { userId, type: 'refresh' },
      REFRESH_SECRET,
      {
        expiresIn: REFRESH_TOKEN_EXPIRES_IN,
        issuer: 'suporte-graos-erp'
      }
    );

    return token;
  } catch (error) {
    console.error('Erro ao gerar refresh token:', error);
    throw new Error('Falha ao gerar refresh token');
  }
};

// ============================================================================
// VALIDAÇÃO DE TOKENS
// ============================================================================

/**
 * Verifica e decodifica um Access Token
 * @param token Token JWT
 * @returns Payload decodificado ou null se inválido
 */
export const verifyAccessToken = (token: string): DecodedToken | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'suporte-graos-erp',
      audience: 'suporte-graos-users'
    }) as DecodedToken;

    return decoded;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      console.warn('Token expirado');
    } else if (error.name === 'JsonWebTokenError') {
      console.warn('Token inválido');
    } else {
      console.error('Erro ao verificar token:', error);
    }
    return null;
  }
};

/**
 * Verifica e decodifica um Refresh Token
 * @param token Refresh token JWT
 * @returns Payload decodificado ou null se inválido
 */
export const verifyRefreshToken = (token: string): { userId: string; type: string } | null => {
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET, {
      issuer: 'suporte-graos-erp'
    }) as any;

    if (decoded.type !== 'refresh') {
      return null;
    }

    return { userId: decoded.userId, type: decoded.type };
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      console.warn('Refresh token expirado');
    } else {
      console.error('Erro ao verificar refresh token:', error);
    }
    return null;
  }
};

// ============================================================================
// UTILITÁRIOS
// ============================================================================

/**
 * Decodifica um token SEM verificar a assinatura (útil para debug)
 * @param token Token JWT
 * @returns Payload decodificado
 */
export const decodeToken = (token: string): any => {
  try {
    return jwt.decode(token);
  } catch (error) {
    console.error('Erro ao decodificar token:', error);
    return null;
  }
};

/**
 * Verifica se um token está expirado (sem validar assinatura)
 * @param token Token JWT
 * @returns true se expirado
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded: any = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    return decoded.exp < now;
  } catch {
    return true;
  }
};

/**
 * Obtém o tempo restante até expiração (em segundos)
 * @param token Token JWT
 * @returns Segundos até expirar, ou 0 se já expirado
 */
export const getTokenExpirationTime = (token: string): number => {
  try {
    const decoded: any = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return 0;
    }

    const now = Math.floor(Date.now() / 1000);
    const remaining = decoded.exp - now;
    return remaining > 0 ? remaining : 0;
  } catch {
    return 0;
  }
};

/**
 * Converte segundos restantes em formato legível
 * @param seconds Segundos
 * @returns String formatada (ex: "1h 30m")
 */
export const formatTimeRemaining = (seconds: number): string => {
  if (seconds <= 0) return 'Expirado';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
};

// ============================================================================
// VALIDAÇÃO DE PERMISSÕES
// ============================================================================

/**
 * Verifica se o token tem permissão específica
 * @param token Token JWT
 * @param requiredPermission Permissão necessária
 * @returns true se tiver permissão
 */
export const hasPermission = (token: string, requiredPermission: string): boolean => {
  const decoded = verifyAccessToken(token);
  if (!decoded) return false;

  // Admin tem todas as permissões
  if (decoded.role === 'admin' || decoded.role === 'Administrador') {
    return true;
  }

  // Verifica se tem a permissão específica
  if (decoded.permissions && decoded.permissions.includes(requiredPermission)) {
    return true;
  }

  return false;
};

/**
 * Verifica se o token pertence a um admin
 * @param token Token JWT
 * @returns true se for admin
 */
export const isAdmin = (token: string): boolean => {
  const decoded = verifyAccessToken(token);
  return decoded?.role === 'admin' || decoded?.role === 'Administrador';
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  isTokenExpired,
  getTokenExpirationTime,
  formatTimeRemaining,
  hasPermission,
  isAdmin
};
