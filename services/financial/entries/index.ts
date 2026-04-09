import { financialEntriesLoader } from './loader';
import { financialEntriesActions } from './actions';
import { financialEntriesRealtime } from './realtime';
import { 
  FinancialEntry, EnrichedPayableEntry, EnrichedReceivableEntry, 
  FinancialEntryType, OriginType, EntryStatus, FinancialFilterParams 
} from './types';

/**
 * FINANCIAL ENTRIES SERVICE (Modular)
 * Este é o ponto de entrada único para gerenciar obrigações (Contas a Pagar e Contas a Receber).
 */

export const financialEntriesService = {
  // Leitura
  getPayables: (params?: FinancialFilterParams) => financialEntriesLoader.getPayables(params),
  getReceivables: (params?: FinancialFilterParams) => financialEntriesLoader.getReceivables(params),
  getById: (id: string) => financialEntriesLoader.getById(id),
  getByOrigin: (originType: OriginType, originId: string) => financialEntriesLoader.getByOrigin(originType, originId),
  getByStatus: (type: FinancialEntryType, status: EntryStatus) => financialEntriesActions.getByStatus(type, status),
  getTotalsByType: (type: FinancialEntryType, startDate?: string, endDate?: string) => financialEntriesActions.getTotalsByType(type, startDate, endDate),

  // Escrita
  add: (entry: any) => financialEntriesActions.add(entry),
  cancel: (id: string) => financialEntriesActions.cancel(id),

  // Realtime
  subscribeRealtime: (onAnyChange: (entryType: string | undefined) => void) => 
    financialEntriesRealtime.subscribe(onAnyChange)
};

export type { 
  FinancialEntry, EnrichedPayableEntry, EnrichedReceivableEntry, 
  FinancialEntryType, OriginType, EntryStatus, FinancialFilterParams 
};
