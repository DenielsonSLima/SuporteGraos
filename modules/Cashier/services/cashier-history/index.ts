/**
 * 📦 Exportações centralizadas do módulo cashier-history
 */

export {
  calculateMonthlyReport,
  getMonthlyHistory,
  getMonthReport,
  historyService
} from './historyService';

export {
  snapshotService
} from './snapshotService';

export type {
  MonthlyReport,
  MonthlySnapshot,
  HistoryFilters,
  HistoryListItem
} from './types';
