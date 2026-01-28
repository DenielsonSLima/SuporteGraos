/**
 * ============================================================================
 * CRYPTO UTILITY - Gerenciamento Seguro de Senhas
 * ============================================================================
 * 
 * Funções para:
 * - Hash de senhas com bcrypt (salt rounds: 10)
 * - Verificação de senhas
 * - Geração de tokens seguros
 * 
 * Uso:
 * ```typescript
 * const hash = await hashPassword('minhaSenha123');
 * const isValid = await verifyPassword('minhaSenha123', hash);
 * ```
 */

import bcrypt from 'bcryptjs';

// ============================================================================
// CONFIGURAÇÕES
// ============================================================================

/**
 * Número de salt rounds para o bcrypt
 * - 10 = ~65ms (recomendado para produção)
 * - 12 = ~260ms (mais seguro, mas mais lento)
 */
const SALT_ROUNDS = 10;

// ============================================================================
// HASH DE SENHAS
// ============================================================================

/**
 * Gera hash bcrypt de uma senha
 * @param password Senha em texto puro
 * @returns Hash bcrypt da senha
 */
export const hashPassword = async (password: string): Promise<string> => {
  try {
    if (!password || password.length === 0) {
      throw new Error('Senha não pode ser vazia');
    }

    // Gera salt e hash em uma única operação
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    return hash;
  } catch (error) {
    console.error('Erro ao gerar hash de senha:', error);
    throw new Error('Falha ao processar senha');
  }
};

/**
 * Verifica se uma senha corresponde ao hash armazenado
 * @param password Senha em texto puro
 * @param hash Hash armazenado no banco
 * @returns true se a senha estiver correta
 */
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  try {
    if (!password || !hash) {
      return false;
    }

    const isMatch = await bcrypt.compare(password, hash);
    return isMatch;
  } catch (error) {
    console.error('Erro ao verificar senha:', error);
    return false;
  }
};

// ============================================================================
// GERAÇÃO DE TOKENS SEGUROS
// ============================================================================

/**
 * Gera um token aleatório seguro
 * @param length Tamanho do token (padrão: 32 caracteres)
 * @returns Token hexadecimal aleatório
 */
export const generateSecureToken = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  
  // Usar crypto.getRandomValues para maior segurança
  const randomValues = new Uint8Array(length);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(randomValues);
  } else {
    // Fallback para Node.js
    const crypto = require('crypto');
    crypto.randomFillSync(randomValues);
  }
  
  for (let i = 0; i < length; i++) {
    token += chars[randomValues[i] % chars.length];
  }
  
  return token;
};

/**
 * Gera um código numérico de recuperação (ex: 1234-5678)
 * @returns Código formatado
 */
export const generateRecoveryCode = (): string => {
  const part1 = Math.floor(1000 + Math.random() * 9000); // 1000-9999
  const part2 = Math.floor(1000 + Math.random() * 9000);
  return `${part1}-${part2}`;
};

// ============================================================================
// VALIDAÇÃO DE FORÇA DE SENHA
// ============================================================================

/**
 * Verifica se o hash precisa ser atualizado (ex: se mudou o número de rounds)
 * @param hash Hash atual
 * @returns true se precisa rehash
 */
export const needsRehash = (hash: string): boolean => {
  try {
    // Extrai o número de rounds do hash
    // Formato bcrypt: $2a$10$... (onde 10 é o número de rounds)
    const parts = hash.split('$');
    if (parts.length < 3) return true;
    
    const currentRounds = parseInt(parts[2], 10);
    return currentRounds !== SALT_ROUNDS;
  } catch {
    return true;
  }
};

// ============================================================================
// UTILITÁRIOS DE TEMPO CONSTANTE
// ============================================================================

/**
 * Compara duas strings em tempo constante (evita timing attacks)
 * @param a Primeira string
 * @param b Segunda string
 * @returns true se iguais
 */
export const constantTimeCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  hashPassword,
  verifyPassword,
  generateSecureToken,
  generateRecoveryCode,
  needsRehash,
  constantTimeCompare
};
