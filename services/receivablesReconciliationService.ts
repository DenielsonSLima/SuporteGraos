import { receivablesService, Receivable } from './financial/receivablesService';
import { salesService } from './salesService';
import { standaloneRecordsService } from './standaloneRecordsService';

let hasRun = false;

const toNumber = (value: any) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const parseOrigin = (notes?: string) => {
  if (!notes) return '';
  const match = notes.match(/\[ORIGIN:([^\]]+)\]/);
  return match ? match[1] : '';
};

const makeTxKey = (tx: { date?: string; value?: number; discountValue?: number; accountName?: string }) => {
  const date = tx.date || '';
  const value = toNumber(tx.value).toFixed(2);
  const discount = toNumber(tx.discountValue).toFixed(2);
  const account = tx.accountName || '';
  return `${date}|${value}|${discount}|${account}`;
};

export const reconcileReceivablesFromHistory = async () => {
  if (hasRun) return;
  hasRun = true;

  const history = standaloneRecordsService
    .getAll()
    .filter(r => r.subType === 'sales_order')
    .map(r => ({
      id: r.id,
      date: r.settlementDate || r.issueDate,
      value: toNumber(r.paidValue),
      discountValue: toNumber(r.discountValue),
      accountName: r.bankAccount || 'N/D',
      notes: r.notes
    }))
    .filter(r => r.date && (r.value > 0 || r.discountValue > 0));

  if (history.length === 0) return;

  const historyByOrigin = new Map<string, typeof history>();
  for (const record of history) {
    const origin = parseOrigin(record.notes);
    if (!origin) continue;
    if (!historyByOrigin.has(origin)) historyByOrigin.set(origin, []);
    historyByOrigin.get(origin)!.push(record);
  }

  if (historyByOrigin.size === 0) return;

  const receivables = receivablesService.getAll();
  const receivableById = new Map(receivables.map(r => [r.id, r]));
  const receivableByOrder = new Map(receivables.map(r => [r.salesOrderId || '', r]).filter(([k]) => k));

  const orders = salesService.getAll();
  const orderById = new Map(orders.map(o => [o.id, o]));

  historyByOrigin.forEach((records, origin) => {
    const totalReceived = records.reduce((acc, r) => acc + r.value + r.discountValue, 0);
    if (totalReceived <= 0) return;

    const orderIdFromOrigin = origin.startsWith('so-') ? origin.replace('so-', '') : '';
    const receivableFromOrigin = receivableById.get(origin);
    const orderId = orderIdFromOrigin || receivableFromOrigin?.salesOrderId || '';

    const receivable = receivableFromOrigin || (orderId ? receivableByOrder.get(orderId) : undefined);
    if (receivable) {
      const newReceived = Number(totalReceived.toFixed(2));
      if (Math.abs((receivable.receivedAmount || 0) - newReceived) > 0.01) {
        const status: Receivable['status'] = newReceived >= receivable.amount - 0.01
          ? 'received'
          : newReceived > 0
            ? 'partially_received'
            : 'pending';

        receivablesService.update({
          ...receivable,
          receivedAmount: newReceived,
          status
        });
      }
    }

    if (orderId) {
      const order = orderById.get(orderId);
      if (order) {
        const historyTx = records.map(r => ({
          id: r.id,
          type: 'receipt' as const,
          date: r.date,
          value: r.value,
          discountValue: r.discountValue,
          accountId: r.accountName || 'unknown',
          accountName: r.accountName || 'N/D',
          notes: r.notes
        }));

        const existing = order.transactions || [];
        const existingKeys = new Set(existing.map(t => makeTxKey(t)));
        const merged = [...existing];
        for (const tx of historyTx) {
          const key = makeTxKey(tx);
          if (!existingKeys.has(key)) {
            merged.push(tx as any);
            existingKeys.add(key);
          }
        }

        const newPaidValue = Number(totalReceived.toFixed(2));
        if (Math.abs((order.paidValue || 0) - newPaidValue) > 0.01 || merged.length !== existing.length) {
          salesService.update({
            ...order,
            paidValue: newPaidValue,
            transactions: merged
          });
        }
      }
    }
  });
};
