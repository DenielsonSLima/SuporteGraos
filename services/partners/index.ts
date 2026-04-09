import { db } from './store';
import { loadFromSupabase, reload } from './loader';
import { add, update, deletePartner, setAddressLocal, importData } from './actions';
import { startRealtime, stopRealtime } from './realtime';
import type { Partner } from './types';

export const partnerService = {
  initialize: async () => {
    await loadFromSupabase();
    startRealtime();
  },
  loadFromSupabase,
  reload,
  startRealtime,
  stopRealtime,
  getAll: async () => {
    await loadFromSupabase();
    return db.getAll();
  },
  getById: async (id: string) => {
    if (db.getById(id)) return db.getById(id);
    await loadFromSupabase(true);
    return db.getById(id);
  },
  setAddressLocal,
  subscribe: (callback: (items: Partner[]) => void) => db.subscribe(callback),
  add,
  update,
  delete: deletePartner,
  importData
};
