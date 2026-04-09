import { loadFromSupabase } from './loader';
import { startRealtime, stopRealtime, subscribeToUpdates } from './realtime';
import { add, update, remove, reload, cancel, importData, persistUpsert, createPayableForPurchaseOrder, syncExpenses } from './actions';
import { updateTransaction, deleteTransaction } from './transactions';
import { upsertPurchaseOrderCanonical, deletePurchaseOrderCanonical } from './canonical';
import { mapOrderToDb } from './mappers';
import { db } from './store';

export const purchaseService = {
  // Loader
  loadFromSupabase,
  getAll: () => db.getAll(),
  getById: (id: string) => db.getById(id),

  // Realtime
  startRealtime,
  stopRealtime,
  subscribeToUpdates,
  subscribe: subscribeToUpdates,

  // Actions
  add,
  update,
  delete: remove, // Rename to match original API
  reload,
  cancel,
  importData,
  persistUpsert,
  upsertPurchaseOrderCanonical,
  deletePurchaseOrderCanonical,
  createPayableForPurchaseOrder,
  syncExpenses,

  // Transactions
  updateTransaction,
  deleteTransaction,
};
