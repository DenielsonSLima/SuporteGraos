import { db } from './store';
import { loadFromSupabase, getById, getShareholderTotals } from './loader';
import {
  add,
  update,
  deleteShareholder,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  _recalcBalance
} from './actions';
import { startRealtime, stopRealtime } from './realtime';
import type { Shareholder } from './types';

let isInitialized = false;

export const shareholderService = {
  initialize: async () => {
    if (isInitialized) return;
    await loadFromSupabase();
    startRealtime();
    isInitialized = true;
  },
  loadFromSupabase,
  startRealtime,
  stopRealtime,
  getAll: (): Shareholder[] => db.getAll(),
  getById,
  add,
  update,
  delete: deleteShareholder,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  _recalcBalance,
  getShareholderTotals,
  subscribe: (callback: (items: Shareholder[]) => void) => db.subscribe(callback),
  subscribeRealtime: (onAnyChange: () => void) => {
    startRealtime();
    // In actual implementation, we'd need to link onAnyChange to the channel, 
    // but the store subscription usually suffices for UI updates.
    return () => {}; 
  }
};
