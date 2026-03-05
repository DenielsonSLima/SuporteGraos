
/**
 * Utilitários de Data para Suporte Grãos ERP
 * Centraliza o tratamento de fuso horário para o Brasil (UTC-3).
 */

/**
 * Retorna a data atual no formato YYYY-MM-DD respeitando o fuso do Brasil
 */
export const getTodayBR = (): string => {
  const date = new Date();
  // Ajuste manual para UTC-3 se necessário, mas em navegadores no Brasil 
  // o local time já é UTC-3. Para garantir consistência em servidores/nuvem:
  const brDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const year = brDate.getFullYear();
  const month = String(brDate.getMonth() + 1).padStart(2, '0');
  const day = String(brDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Converte qualquer objeto Date para string YYYY-MM-DD no fuso local
 */
export const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formata uma string YYYY-MM-DD para DD/MM/YYYY sem shifting de timezone
 */
export const formatDateBR = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  // Se a string contiver 'T', removemos a parte do tempo para garantir consistência
  const pureDate = dateStr.split('T')[0];
  const parts = pureDate.split('-');

  if (parts.length !== 3) return dateStr;

  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

/**
 * Converte string YYYY-MM-DD para objeto Date local (evita conversão UTC)
 * Isso garante que 2026-01-01 continue sendo 01/01/2026 no fuso horário do Brasil.
 */
export const parseStringToLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const pureDate = dateStr.split('T')[0];
  const [year, month, day] = pureDate.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Retorna o primeiro dia do mês atual no formato YYYY-MM-DD
 */
export const getFirstDayOfMonthBR = (): string => {
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};
