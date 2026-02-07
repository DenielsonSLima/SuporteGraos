import { createClient } from '@supabase/supabase-js';

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

const computeStatus = (amount, paid) => {
  if (amount <= 0) return 'pending';
  if (paid >= amount - 0.01) return 'paid';
  if (paid > 0) return 'partially_paid';
  return 'pending';
};

const main = async () => {
  console.log('Loading purchase orders and loadings...');

  const { data: orders, error: ordersError } = await supabase
    .from('purchase_orders')
    .select('id, number, date, partner_id, metadata');

  if (ordersError) throw ordersError;

  const { data: loadings, error: loadingsError } = await supabase
    .from('logistics_loadings')
    .select('id, date, purchase_order_id, supplier_name, weight_kg, purchase_price_per_sc, total_purchase_value, product_paid')
    .not('purchase_order_id', 'is', null);

  if (loadingsError) throw loadingsError;

  const { data: existingPayables, error: payablesError } = await supabase
    .from('payables')
    .select('id, purchase_order_id')
    .eq('sub_type', 'purchase_order');

  if (payablesError) throw payablesError;

  const payableByOrder = new Map();
  (existingPayables || []).forEach((p) => {
    payableByOrder.set(p.purchase_order_id, p.id);
  });

  const loadingsByOrder = new Map();
  (loadings || []).forEach((l) => {
    const orderId = l.purchase_order_id;
    if (!orderId) return;
    if (!loadingsByOrder.has(orderId)) loadingsByOrder.set(orderId, []);
    loadingsByOrder.get(orderId).push(l);
  });

  const upserts = [];

  (orders || []).forEach((order) => {
    const orderId = order.id;
    const orderLoadings = loadingsByOrder.get(orderId) || [];
    if (orderLoadings.length === 0) return;

    const totalPurchase = orderLoadings.reduce((sum, l) => {
      const rawTotal = toNumber(l.total_purchase_value);
      if (rawTotal > 0) return sum + rawTotal;
      const weightKg = toNumber(l.weight_kg);
      const priceSc = toNumber(l.purchase_price_per_sc);
      const computed = weightKg > 0 && priceSc > 0 ? (weightKg / 60) * priceSc : 0;
      return sum + computed;
    }, 0);

    const totalPaid = orderLoadings.reduce((sum, l) => sum + toNumber(l.product_paid), 0);

    if (totalPurchase <= 0 || !order.partner_id) return;

    const orderMeta = order.metadata || {};
    const partnerName = orderMeta.partnerName || orderMeta.partner_name || orderMeta.supplierName || orderLoadings[0]?.supplier_name || 'Fornecedor';

    const earliestDate = orderLoadings
      .map((l) => l.date)
      .filter(Boolean)
      .sort()[0] || order.date;

    const payableId = payableByOrder.get(orderId);

    upserts.push({
      id: payableId || undefined,
      purchase_order_id: orderId,
      partner_id: order.partner_id,
      partner_name: partnerName,
      description: `Pedido de Compra ${order.number}`,
      due_date: earliestDate,
      amount: Number(totalPurchase.toFixed(2)),
      paid_amount: Number(totalPaid.toFixed(2)),
      status: computeStatus(totalPurchase, totalPaid),
      sub_type: 'purchase_order',
      notes: `Backfill: ${orderLoadings.length} carregamento(s)`
    });
  });

  if (upserts.length === 0) {
    console.log('No payables to backfill.');
    return;
  }

  console.log(`Upserting ${upserts.length} payables...`);

  const { error: upsertError } = await supabase
    .from('payables')
    .upsert(upserts, { onConflict: 'id' });

  if (upsertError) throw upsertError;

  console.log('Backfill completed successfully.');
};

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
