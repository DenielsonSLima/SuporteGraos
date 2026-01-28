
/**
 * Utilitários de Data para Suporte Grãos ERP
 * Evita problemas de fuso horário onde datas YYYY-MM-DD são tratadas como UTC
 * e acabam exibindo o dia anterior no fuso do Brasil (UTC-3).
 */

/**
 * Retorna a data atual no formato YYYY-MM-DD respeitando o fuso local
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
export const formatDateBR = (dateStr: string): string => {
  if (!dateStr) return '-';
  // Se a string contiver 'T', removemos a parte do tempo para garantir consistência
  const pureDate = dateStr.split('T')[0];
  const [year, month, day] = pureDate.split('-');
  
  if (!year || !month || !day) return dateStr;
  
  return `${day}/${month}/${year}`;
};

/**
 * Converte string YYYY-MM-DD para objeto Date local (sem UTC)
 */
export const parseStringToLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};
