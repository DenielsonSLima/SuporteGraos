import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://vqhjbsiwzgxaozcedqcn.supabase.co', 'sb_publishable_m8MBqafWFUIhbSmhatvDYw_NWrO_E8V');

async function run() {
  console.log('=== VERIFICAÇÃO DE SALDOS E TRANSAÇÕES ===\n');

  // 1. Verificar últimos adiantamentos
  const { data: advances, error: advErr } = await supabase
    .from('advances')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (advErr) {
    console.error('Erro ao buscar adiantamentos:', advErr);
  } else {
    console.log('--- Últimos Adiantamentos (advances) ---');
    console.table(
      (advances || []).map(a => ({
        id: a.id.substring(0, 8) + '...',
        parentId: a.parent_id ? a.parent_id.substring(0, 8) + '...' : null,
        amount: a.amount,
        settled: a.settled_amount,
        remaining: a.remaining_amount,
        status: a.status,
        date: a.advance_date,
        description: a.description
      }))
    );
  }

  // 2. Verificar últimas transações financeiras
  const { data: transactions, error: txErr } = await supabase
    .from('financial_transactions')
    .select('id, amount, transaction_date, type, description, account:accounts(account_name)')
    .order('created_at', { ascending: false })
    .limit(8);

  if (txErr) {
    console.error('Erro ao buscar transações:', txErr);
  } else {
    console.log('\n--- Últimas Transações Financeiras ---');
    console.table(
      (transactions || []).map(t => ({
        id: t.id.substring(0, 8) + '...',
        date: t.transaction_date,
        amount: t.amount,
        type: t.type,
        description: t.description,
        account: t.account ? t.account.account_name : 'Virtual/Outra'
      }))
    );
  }

  // 3. Verificar saldos das contas bancárias (accounts)
  const { data: accounts, error: accErr } = await supabase
    .from('accounts')
    .select('id, account_name, balance, account_type')
    .order('account_name');

  if (accErr) {
    console.error('Erro ao buscar contas:', accErr);
  } else {
    console.log('\n--- Contas e Saldos (accounts) ---');
    console.table(
      (accounts || []).map(a => ({
        id: a.id.substring(0, 8) + '...',
        name: a.account_name,
        balance: a.balance,
        type: a.account_type
      }))
    );
  }

  // 4. Verificar últimos lançamentos de compras e fretes
  const { data: loadings, error: loadErr } = await supabase
    .from('ops_loadings')
    .select('id, loading_date, driver_name, vehicle_plate, total_purchase_value, total_freight_value, freight_paid, status')
    .order('created_at', { ascending: false })
    .limit(5);

  if (loadErr) {
    console.error('Erro ao buscar carregamentos:', loadErr);
  } else {
    console.log('\n--- Últimos Carregamentos ---');
    console.table(
      (loadings || []).map(l => ({
        id: l.id.substring(0, 8) + '...',
        date: l.loading_date,
        driver: l.driver_name,
        plate: l.vehicle_plate,
        purchase_val: l.total_purchase_value,
        freight_val: l.total_freight_value,
        freight_paid: l.freight_paid,
        status: l.status
      }))
    );
  }
}

run();
