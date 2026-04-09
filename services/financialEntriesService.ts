/**
 * FINANCIAL ENTRIES SERVICE (Barrel Export)
 * Este arquivo atua como uma fachada para o novo Financial Entries Service modularizado.
 * Mantém total retrocompatibilidade com as importações existentes.
 */

export { financialEntriesService } from './financial/entries/index';
export type { 
  FinancialEntry, EnrichedPayableEntry, EnrichedReceivableEntry, 
  FinancialEntryType, OriginType, EntryStatus, FinancialFilterParams
} from './financial/entries/types';
