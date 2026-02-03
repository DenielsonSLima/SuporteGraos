/**
 * Retry logic para operações Supabase
 * Implementa exponential backoff com jitter para evitar thundering herd
 */

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  shouldRetry?: (error: any) => boolean;
}

const defaultOptions: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1s
  maxDelay: 10000,    // 10s
  backoffFactor: 2,
  shouldRetry: (error: any) => {
    // Retry em erros de rede ou timeout
    if (error?.message?.includes('Failed to fetch')) return true;
    if (error?.message?.includes('Network request failed')) return true;
    if (error?.code === 'PGRST301') return true; // Supabase timeout
    
    // Não fazer retry em erros de autenticação ou permissão
    if (error?.code === 'PGRST301') return false;
    if (error?.status === 401 || error?.status === 403) return false;
    
    return false;
  }
};

/**
 * Executa uma operação async com retry exponential backoff
 */
export async function fetchWithRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: any;
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Se não deve fazer retry ou é a última tentativa, lança erro
      if (!opts.shouldRetry(error) || attempt === opts.maxRetries) {
        throw error;
      }
      
      // Calcula delay com exponential backoff + jitter
      const baseDelay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffFactor, attempt),
        opts.maxDelay
      );
      const jitter = Math.random() * 0.3 * baseDelay; // ±30% jitter
      const delay = baseDelay + jitter;
      
      console.warn(
        `[fetchWithRetry] Tentativa ${attempt + 1}/${opts.maxRetries} falhou. ` +
        `Retry em ${Math.round(delay)}ms...`,
        error
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Wrapper específico para operações Supabase
 */
export async function supabaseWithRetry<T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  options: RetryOptions = {}
): Promise<T> {
  const result = await fetchWithRetry(operation, options);
  
  if (result.error) {
    throw result.error;
  }
  
  if (result.data === null) {
    throw new Error('Supabase retornou data null sem error');
  }
  
  return result.data;
}
