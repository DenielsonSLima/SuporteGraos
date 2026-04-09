import { supabase } from '../supabase';
import { db, mapRow } from './store';
import { loadFromSupabase } from './loader';
import { invalidateDashboardCache } from '../dashboardCache';
import type { Shareholder, ShareholderTransaction } from './types';

export const _recalcBalance = async (shareholderId: string): Promise<void> => {
  const { error } = await supabase.rpc('rpc_recalc_shareholder_balance', {
    p_shareholder_id: shareholderId,
  });

  if (error) {
    console.error('[shareholderService] Erro ao recalcular saldo via RPC:', error.message);
    throw new Error(`Falha ao recalcular saldo do sócio: ${error.message}`);
  }
};

export const add = async (shareholder: Omit<Shareholder, 'id'>): Promise<Shareholder> => {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser?.id) throw new Error('Não autenticado');

  const { data: profile } = await supabase.from('app_users').select('company_id').eq('auth_user_id', authUser.id).single();
  if (!profile?.company_id) throw new Error('Usuário sem empresa vinculada');

  const { data, error } = await supabase.from('shareholders').insert({
    company_id: profile.company_id,
    name: shareholder.name,
    cpf: shareholder.cpf || null,
    email: shareholder.email || null,
    phone: shareholder.phone || null,
    address_street: shareholder.address.street || null,
    address_number: shareholder.address.number || null,
    address_neighborhood: shareholder.address.neighborhood || null,
    address_city: shareholder.address.city || null,
    address_state: shareholder.address.state || null,
    address_zip: shareholder.address.zip || null,
    pro_labore_value: shareholder.financial?.proLaboreValue ?? 0,
    current_balance: shareholder.financial?.currentBalance ?? 0,
    recurrence_active: shareholder.financial?.recurrence?.active ?? false,
    recurrence_amount: shareholder.financial?.recurrence?.amount ?? 0,
    recurrence_day: shareholder.financial?.recurrence?.day ?? 1,
  }).select().single();

  if (error) throw new Error(`Erro ao cadastrar sócio: ${error.message}`);

  const newShareholder = mapRow(data as any);
  db.add(newShareholder);
  invalidateDashboardCache();
  return newShareholder;
};

export const update = async (shareholder: Shareholder): Promise<void> => {
  const { error } = await supabase.from('shareholders').update({
    name: shareholder.name,
    cpf: shareholder.cpf || null,
    email: shareholder.email || null,
    phone: shareholder.phone || null,
    address_street: shareholder.address.street || null,
    address_number: shareholder.address.number || null,
    address_neighborhood: shareholder.address.neighborhood || null,
    address_city: shareholder.address.city || null,
    address_state: shareholder.address.state || null,
    address_zip: shareholder.address.zip || null,
    pro_labore_value: shareholder.financial?.proLaboreValue ?? 0,
    recurrence_active: shareholder.financial?.recurrence?.active ?? false,
    recurrence_amount: shareholder.financial?.recurrence?.amount ?? 0,
    recurrence_day: shareholder.financial?.recurrence?.day ?? 1,
  }).eq('id', shareholder.id);

  if (error) throw new Error(`Erro ao atualizar sócio: ${error.message}`);
  db.update(shareholder);
  invalidateDashboardCache();
};

export const deleteShareholder = async (id: string): Promise<void> => {
  const { error } = await supabase.from('shareholders').delete().eq('id', id);
  if (error) throw new Error(`Erro ao excluir sócio: ${error.message}`);
  db.delete(id);
  invalidateDashboardCache();
};

export const addTransaction = async (shareholderId: string, tx: Omit<ShareholderTransaction, 'id'>): Promise<void> => {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser?.id) throw new Error('Não autenticado');

  const { data: profile } = await supabase.from('app_users').select('company_id').eq('auth_user_id', authUser.id).single();
  if (!profile?.company_id) throw new Error('Usuário sem empresa vinculada');

  const { data: txRow, error: txErr } = await supabase.from('shareholder_transactions').insert({
    company_id: profile.company_id,
    shareholder_id: shareholderId,
    date: tx.date,
    type: tx.type,
    value: tx.value,
    description: tx.description || '',
    account_name: tx.accountId ?? null,
  }).select().single();

  if (txErr) throw new Error(`Erro ao registrar transação: ${txErr.message}`);

  if (tx.accountId) {
    try {
      const { handleShareholderPayment, resolveAccountLabel } = await import('../financial/paymentOrchestrator');
      const shareholder = db.getById(shareholderId);
      await handleShareholderPayment(shareholderId, {
        date: tx.date, amount: tx.value, discount: 0,
        accountId: tx.accountId, accountName: resolveAccountLabel(tx.accountId),
        entityName: shareholder?.name || 'Sócio', notes: tx.description
      }, tx.type, (txRow as any).id);
    } catch (err) { console.warn('Sync gap:', err); }
  }

  await _recalcBalance(shareholderId);
  await loadFromSupabase();
  invalidateDashboardCache();
};

export const updateTransaction = async (shareholderId: string, tx: ShareholderTransaction): Promise<void> => {
  // A limpeza de transações bancárias anteriores agora é delegada ao banco ou 
  // gerenciada no fluxo de atualização atômica. Para simplificar e garantir 
  // consistência SQL-First, deletamos a transação anterior (o gatilho limpa o banco)
  // e inserimos a nova, ou atualizamos e deixamos o integrador rodar.
  
  const { error } = await supabase.from('shareholder_transactions').update({
    date: tx.date, type: tx.type, value: tx.value,
    description: tx.description || '', account_name: tx.accountId ?? null,
  }).eq('id', tx.id);
  
  if (error) throw error;

  if (tx.accountId) {
    const { handleShareholderPayment, resolveAccountLabel } = await import('../financial/paymentOrchestrator');
    const shareholder = db.getById(shareholderId);
    await handleShareholderPayment(shareholderId, {
      date: tx.date, amount: tx.value, discount: 0,
      accountId: tx.accountId, accountName: resolveAccountLabel(tx.accountId),
      entityName: shareholder?.name || 'Sócio', notes: `(Editado) ${tx.description}`
    }, tx.type, tx.id);
  }

  await _recalcBalance(shareholderId);
  await loadFromSupabase();
  invalidateDashboardCache();
};

export const deleteTransaction = async (shareholderId: string, txId: string): Promise<void> => {
  // SQL-FIRST: Não precisamos mais varrer links no frontend.
  // O gatilho 'trg_shareholder_tx_delete_cleanup' no banco de dados 
  // limpará automaticamente as transações de caixa e links vinculados.
  const { error } = await supabase.from('shareholder_transactions').delete().eq('id', txId);
  if (error) throw error;

  await _recalcBalance(shareholderId);
  await loadFromSupabase();
  invalidateDashboardCache();
};
