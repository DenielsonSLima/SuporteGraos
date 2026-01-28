/**
 * ============================================================================
 * PASSWORD VALIDATOR - Validação de Força de Senha
 * ============================================================================
 * 
 * Funções para:
 * - Validar força de senha (mínimo 8 caracteres, maiúsculas, números, especiais)
 * - Calcular score de segurança
 * - Sugerir melhorias
 * - Verificar senhas comuns
 * 
 * Uso:
 * ```typescript
 * const result = validatePasswordStrength('MinHaSenh@123');
 * if (result.isValid) {
 *   console.log(`Força: ${result.strength}`); // 'strong'
 * }
 * ```
 */

// ============================================================================
// TIPOS
// ============================================================================

export type PasswordStrength = 'very-weak' | 'weak' | 'medium' | 'strong' | 'very-strong';

export interface PasswordValidationResult {
  isValid: boolean;
  strength: PasswordStrength;
  score: number;  // 0-100
  errors: string[];
  suggestions: string[];
  checks: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
    notCommon: boolean;
  };
}

// ============================================================================
// CONFIGURAÇÕES
// ============================================================================

const MIN_LENGTH = 8;
const MIN_LENGTH_STRONG = 12;

/**
 * Lista de senhas mais comuns (evitar)
 */
const COMMON_PASSWORDS = [
  '123456', 'password', '12345678', 'qwerty', '123456789',
  '12345', '1234', '111111', '1234567', 'dragon',
  '123123', 'baseball', 'iloveyou', 'trustno1', '1234567890',
  'sunshine', 'master', 'welcome', 'shadow', 'ashley',
  'football', 'jesus', 'michael', 'ninja', 'mustang',
  'password1', 'abc123', 'admin', 'admin123', 'root'
];

// ============================================================================
// VALIDAÇÃO DE FORÇA
// ============================================================================

/**
 * Valida a força de uma senha e retorna análise completa
 * @param password Senha a ser validada
 * @returns Resultado da validação com score e sugestões
 */
export const validatePasswordStrength = (password: string): PasswordValidationResult => {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  // Verificações básicas
  const checks = {
    minLength: password.length >= MIN_LENGTH,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    notCommon: !COMMON_PASSWORDS.includes(password.toLowerCase())
  };

  // Calcular score
  if (checks.minLength) {
    score += 20;
    if (password.length >= MIN_LENGTH_STRONG) score += 10;
    if (password.length >= 16) score += 10;
  } else {
    errors.push(`A senha deve ter no mínimo ${MIN_LENGTH} caracteres`);
    suggestions.push('Use uma senha mais longa para maior segurança');
  }

  if (checks.hasUppercase) {
    score += 15;
  } else {
    errors.push('A senha deve conter pelo menos uma letra maiúscula');
    suggestions.push('Adicione letras maiúsculas (A-Z)');
  }

  if (checks.hasLowercase) {
    score += 15;
  } else {
    errors.push('A senha deve conter pelo menos uma letra minúscula');
    suggestions.push('Adicione letras minúsculas (a-z)');
  }

  if (checks.hasNumber) {
    score += 15;
  } else {
    errors.push('A senha deve conter pelo menos um número');
    suggestions.push('Adicione números (0-9)');
  }

  if (checks.hasSpecialChar) {
    score += 20;
  } else {
    errors.push('A senha deve conter pelo menos um caractere especial');
    suggestions.push('Adicione caracteres especiais (!@#$%^&*)');
  }

  if (!checks.notCommon) {
    score = Math.min(score, 30);
    errors.push('Esta senha é muito comum e facilmente adivinhável');
    suggestions.push('Evite senhas comuns como "123456" ou "password"');
  }

  // Penalidades por padrões fracos
  if (/^[0-9]+$/.test(password)) {
    score -= 20;
    suggestions.push('Evite usar apenas números');
  }

  if (/^[a-zA-Z]+$/.test(password)) {
    score -= 10;
    suggestions.push('Combine letras com números e caracteres especiais');
  }

  if (/(.)\1{2,}/.test(password)) {
    score -= 10;
    suggestions.push('Evite repetir caracteres consecutivos (ex: "aaa", "111")');
  }

  // Bônus por diversidade
  const uniqueChars = new Set(password).size;
  if (uniqueChars >= 10) score += 10;

  // Garantir que score está entre 0-100
  score = Math.max(0, Math.min(100, score));

  // Determinar força
  let strength: PasswordStrength;
  if (score < 30) strength = 'very-weak';
  else if (score < 50) strength = 'weak';
  else if (score < 70) strength = 'medium';
  else if (score < 90) strength = 'strong';
  else strength = 'very-strong';

  // Verificar se é válida (mínimo aceitável)
  const isValid = checks.minLength && 
                  checks.hasUppercase && 
                  checks.hasLowercase && 
                  checks.hasNumber && 
                  checks.notCommon;

  return {
    isValid,
    strength,
    score,
    errors,
    suggestions: suggestions.filter((s, i, arr) => arr.indexOf(s) === i), // remover duplicatas
    checks
  };
};

// ============================================================================
// UTILITÁRIOS
// ============================================================================

/**
 * Retorna cor para representar a força da senha (útil para UI)
 * @param strength Força da senha
 * @returns Código de cor hexadecimal
 */
export const getStrengthColor = (strength: PasswordStrength): string => {
  const colors = {
    'very-weak': '#ef4444',   // vermelho
    'weak': '#f97316',        // laranja
    'medium': '#eab308',      // amarelo
    'strong': '#84cc16',      // verde claro
    'very-strong': '#22c55e'  // verde escuro
  };
  return colors[strength];
};

/**
 * Retorna label em português para a força
 * @param strength Força da senha
 * @returns Label traduzida
 */
export const getStrengthLabel = (strength: PasswordStrength): string => {
  const labels = {
    'very-weak': 'Muito Fraca',
    'weak': 'Fraca',
    'medium': 'Média',
    'strong': 'Forte',
    'very-strong': 'Muito Forte'
  };
  return labels[strength];
};

/**
 * Gera uma senha forte aleatória
 * @param length Comprimento desejado (padrão: 16)
 * @returns Senha forte gerada
 */
export const generateStrongPassword = (length: number = 16): string => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const all = uppercase + lowercase + numbers + special;

  let password = '';
  
  // Garantir pelo menos um de cada tipo
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Preencher o restante aleatoriamente
  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  // Embaralhar
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

/**
 * Verifica se a senha contém informações pessoais óbvias
 * @param password Senha
 * @param personalInfo Informações pessoais (nome, email, etc)
 * @returns true se contém informações pessoais
 */
export const containsPersonalInfo = (password: string, personalInfo: string[]): boolean => {
  const lowerPassword = password.toLowerCase();
  return personalInfo.some(info => {
    if (!info || info.length < 3) return false;
    return lowerPassword.includes(info.toLowerCase());
  });
};

/**
 * Calcula entropia da senha (bits)
 * @param password Senha
 * @returns Entropia em bits
 */
export const calculateEntropy = (password: string): number => {
  let charsetSize = 0;
  
  if (/[a-z]/.test(password)) charsetSize += 26;
  if (/[A-Z]/.test(password)) charsetSize += 26;
  if (/[0-9]/.test(password)) charsetSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 32;

  return Math.log2(Math.pow(charsetSize, password.length));
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  validatePasswordStrength,
  getStrengthColor,
  getStrengthLabel,
  generateStrongPassword,
  containsPersonalInfo,
  calculateEntropy
};
