import { PurchaseOrder } from '../../modules/PurchaseOrder/types';

class Persistence {
  private data: PurchaseOrder[] = [];
  private subscribers: ((data: PurchaseOrder[]) => void)[] = [];

  constructor() {}

  set(data: PurchaseOrder[], silent = false) {
    this.data = data;
    if (!silent) this.notify();
  }

  getById(id: string) {
    return this.data.find(o => o.id === id);
  }

  getAll() {
    return this.data;
  }

  add(order: PurchaseOrder) {
    this.data = [order, ...this.data];
    this.notify();
  }

  update(order: PurchaseOrder) {
    this.data = this.data.map(o => o.id === order.id ? order : o);
    this.notify();
  }

  delete(id: string) {
    this.data = this.data.filter(o => o.id !== id);
    this.notify();
  }

  subscribe(callback: (data: PurchaseOrder[]) => void) {
    this.subscribers.push(callback);
    callback(this.data);
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== callback);
    };
  }

  private notify() {
    this.subscribers.forEach(callback => callback(this.data));
  }
}

export const db = new Persistence();
