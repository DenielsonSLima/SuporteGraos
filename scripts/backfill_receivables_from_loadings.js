import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env vars: VITE_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const computeStatus = (amount, received) => {
  if (amount <= 0) return 'pending';
  if (received >= amount - 0.01) return 'received';
  if (received > 0) return 'partially_received';
  return 'pending';
};

const main = async () => {
  console.log('Loading sales orders, loadings, and existing receivables...');

  const { data: orders, error: ordersError } = await supabase
    .from('sales_orders')
    .select('id, number, date, partner_id, metadata');

  if (ordersError) throw ordersError;

  const { data: loadings, error: loadingsError } = await supabase
    .from('logistics_loadings')
    .select('id, date, sales_order_id, status, unload_weight_kg, weight_sc, sales_price, total_sales_value, customer_name')
    .not('sales_order_id', 'is', null);

  if (loadingsError) throw loadingsError;

  const { data: existingReceivables, error: receivablesError } = await supabase
    .from('receivables')
    .select('id, sales_order_id, received_amount');

  if (receivablesError) throw receivablesError;

  const receivableByOrder = new Map();
  (existingReceivables || []).forEach((r) => {
    if (!r.sales_order_id) return;
    receivableByOrder.set(r.sales_order_id, r);
  });

  const loadingsByOrder = new Map();
  (loadings || []).forEach((l) => {
    if (!l.sales_order_id) return;
    if (l.status === 'canceled') return;
    if (!l.unload_weight_kg || l.unload_weight_kg <= 0) return;
    if (!loadingsByOrder.has(l.sales_order_id)) loadingsByOrder.set(l.sales_order_id, []);
    loadingsByOrder.get(l.sales_order_id).push(l);
  });

  const orderById = new Map();
  (orders || []).forEach((o) => orderById.set(o.id, o));

  const upserts = [];

  loadingsByOrder.forEach((orderLoadings, orderId) => {
    const order = orderById.get(orderId);
    const meta = order?.metadata || {};

    const partnerId = order?.partner_id || meta.customerId;
    if (!partnerId) return;

    const total = orderLoadings.reduce(
      (acc, l) => {
        const unitPrice = toNumber(l.sales_price) || toNumber(meta.unitPrice);
        const sc = toNumber(l.weight_sc) || (toNumber(l.unload_weight_kg) / 60);
        const value = toNumber(l.total_sales_value) > 0
          ? toNumber(l.total_sales_value)
          : Number((unitPrice * sc).toFixed(2));
        return { totalSc: acc.totalSc + sc, amount: acc.amount + value };
      },
      { totalSc: 0, amount: 0 }
    );

    if (total.amount <= 0) return;

    const existing = receivableByOrder.get(orderId);
    const receivedAmount = toNumber(existing?.received_amount) || toNumber(meta.paidValue);
    const status = computeStatus(total.amount, receivedAmount);

    const customerName = meta.customerName || orderLoadings[0]?.customer_name || 'Cliente';
    const dueDate = order?.date || orderLoadings.map((l) => l.date).filter(Boolean).sort()[0];

    upserts.push({
      id: existing?.id || crypto.randomUUID(),
      sales_order_id: orderId,
      partner_id: partnerId,
      description: `Venda #${order?.number || 'sem numero'}`,
      due_date: dueDate,
      amount: Number(total.amount.toFixed(2)),
      received_amount: Number(receivedAmount.toFixed(2)),
      status,
      notes: `Backfill: ${orderLoadings.length} carga(s) | Total destino ${total.totalSc.toFixed(2)} SC`,
      company_id: meta.companyId || null
    });
  });

  if (upserts.length === 0) {
    console.log('No receivables to backfill.');
    return;
  }

  console.log(`Upserting ${upserts.length} receivables...`);

  const { error: upsertError } = await supabase
    .from('receivables')
    .upsert(upserts, { onConflict: 'id' });

  if (upsertError) throw upsertError;

  console.log('Backfill completed successfully.');
};

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
