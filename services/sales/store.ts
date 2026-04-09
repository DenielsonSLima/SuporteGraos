import { SalesOrder } from '../../modules/SalesOrder/types';

/**
 * SALES STORE
 * Gerencia o estado local dos Pedidos de Venda para garantir
 * reatividade em tempo real sem depender apenas do cache do TanStack Query.
 */

let sales: SalesOrder[] = [];
const listeners = new Set<(items: SalesOrder[]) => void>();

export const salesStore = {
  get: () => [...sales],
  
  setAll: (items: SalesOrder[]) => {
    sales = items;
    listeners.forEach(l => l([...sales]));
  },

  add: (item: SalesOrder) => {
    const exists = sales.find(s => s.id === item.id);
    if (exists) {
      salesStore.update(item);
      return;
    }
    sales = [item, ...sales];
    listeners.forEach(l => l([...sales]));
  },

  update: (item: SalesOrder) => {
    sales = sales.map(s => s.id === item.id ? { ...s, ...item } : s);
    listeners.forEach(l => l([...sales]));
  },

  delete: (id: string) => {
    sales = sales.filter(s => s.id !== id);
    listeners.forEach(l => l([...sales]));
  },

  subscribe: (callback: (items: SalesOrder[]) => void) => {
    listeners.add(callback);
    callback([...sales]);
    return () => {
      listeners.delete(callback);
    };
  }
};
