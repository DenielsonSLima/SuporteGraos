
import { FinancialRecord, FinancialStatus } from '../modules/Financial/types';
import { financialActionService } from './financialActionService';
import { loansService } from './financial/loansService';
import { payablesService, Payable } from './financial/payablesService';
import { receivablesService, Receivable } from './financial/receivablesService';

// ❌ REMOVIDO (Fase 2 - Modularização):
// import { purchaseService } from './purchaseService';
// import { salesService } from './salesService';
// import { loadingService } from './loadingService';
// Motivo: financialIntegrationService agora lê APENAS das tabelas financeiras
// (payables, receivables, standalone_records, loans)

const mapPayableStatusToFinancialStatus = (status: Payable['status']): FinancialStatus => {
  if (status === 'paid') return 'paid';
  if (status === 'partially_paid') return 'partial';
  if (status === 'overdue') return 'overdue';
  return 'pending';
};

const mapReceivableStatusToFinancialStatus = (status: Receivable['status']): FinancialStatus => {
  if (status === 'received') return 'paid';
  if (status === 'partially_received') return 'partial';
  if (status === 'overdue') return 'overdue';
  return 'pending';
};

// ============================================================================
// MAPEAMENTO: Payable → FinancialRecord
// ============================================================================

const mapPayableToFinancialRecord = (p: Payable): FinancialRecord => ({
  id: p.id,
  description: p.description,
  entityName: p.partnerName || 'Parceiro Desconhecido',
  driverName: p.driverName,
  category: p.subType === 'purchase_order' ? 'Matéria Prima'
    : p.subType === 'freight' ? 'Logística'
      : p.subType === 'commission' ? 'Comissões'
        : 'Outros',
  issueDate: p.dueDate, // Usando dueDate como issueDate (payable não tem issueDate separado)
  dueDate: p.dueDate,
  originalValue: p.amount,
  paidValue: p.paidAmount || 0,
  remainingValue: Math.max(0, p.amount - (p.paidAmount || 0)),
  discountValue: 0,
  status: mapPayableStatusToFinancialStatus(p.status),
  subType: (p.subType === 'other' ? 'admin' : p.subType) as FinancialRecord['subType'],
  bankAccount: p.paymentMethod || undefined,
  notes: p.notes,
  weightKg: p.weightKg,
  weightSc: p.weightKg ? p.weightKg / 60 : undefined,
  unitPriceSc: (p.weightKg && p.weightKg > 0) ? p.amount / (p.weightKg / 60) : undefined
});

// ============================================================================
// MAPEAMENTO: Singleton Entry → FinancialRecord
// ============================================================================

const mapEntryToFinancialRecord = (entry: any): FinancialRecord => ({
  id: entry.id,
  description: entry.description,
  entityName: 'Carregando...', // Nome do parceiro precisa de join ou resolve posterior
  category: entry.origin_type === 'purchase' ? 'Matéria Prima'
    : entry.origin_type === 'sales' ? 'Receita Operacional'
      : entry.origin_type === 'freight' ? 'Logística'
        : entry.origin_type === 'commission' ? 'Comissões'
          : 'Outros',
  issueDate: entry.due_date,
  dueDate: entry.due_date,
  originalValue: entry.total_amount,
  paidValue: 0,
  remainingValue: entry.total_amount,
  discountValue: 0,
  status: entry.status === 'paid' ? 'paid' : entry.status === 'partial' ? 'partial' : entry.status === 'overdue' ? 'overdue' : 'pending',
  subType: entry.origin_type as any,
  bankAccount: undefined,
  notes: `[ORIGIN:${entry.origin_type}:${entry.origin_id}]`
});

// ✅ Novo fetch unificado do Single Ledger
const fetchEntriesSync = async (type: 'payable' | 'receivable'): Promise<FinancialRecord[]> => {
  const { supabase } = await import('./supabase');
  const types = type === 'payable'
    ? ['purchase_payable', 'freight_payable', 'commission_payable', 'expense_payable', 'loan_payable', 'partner_withdrawal']
    : ['sales_receivable', 'loan_receivable', 'partner_contribution', 'other_receivable'];

  const { data, error } = await supabase
    .from('financial_entries')
    .select('*')
    .in('type', types)
    .order('due_date', { ascending: true });

  if (error) {
    return [];
  }

  return (data || []).map(mapEntryToFinancialRecord);
};

// ============================================================================
// MAPEAMENTO: Receivable → FinancialRecord
// ============================================================================

const mapReceivableToFinancialRecord = (r: Receivable): FinancialRecord => ({
  id: r.id,
  description: r.description,
  entityName: r.partnerName || (r.notes?.replace('Cliente: ', '') || 'Cliente Desconhecido'),
  category: 'Receita Operacional',
  issueDate: r.dueDate,
  dueDate: r.dueDate,
  originalValue: r.amount,
  paidValue: r.receivedAmount || 0,
  remainingValue: Math.max(0, r.amount - (r.receivedAmount || 0)),
  discountValue: 0,
  status: mapReceivableStatusToFinancialStatus(r.status),
  subType: 'sales_order',
  bankAccount: r.paymentMethod || undefined,
  notes: r.notes
});

export const financialIntegrationService = {
  // Consolida tudo que a empresa DEVE (Passivo)
  getPayables: (): FinancialRecord[] => {
    // ⚠️ Atenção: getAll() do Persistence é síncrono, mas o fetch supahase é asíncrono.
    // Para manter a assinatura legada, retornamos o que está no cache ou fazemos o sync em background.

    // Como os dados financeiros agora são reativos e cacheados globalmente,
    // podemos continuar usando os services locais se preferirmos estabilidade UI imediata,
    // ou migrar tudo para async.

    // Por enquanto, manteremos a lógica híbrida para não quebrar a UI síncrona:
    const records: FinancialRecord[] = [];
    (payablesService?.getAll?.() || []).forEach(p => {
      if (p) records.push(mapPayableToFinancialRecord(p));
    });
    (financialActionService?.getStandaloneRecords?.() || []).forEach(r => {
      if (r && ['admin', 'commission', 'loan_taken', 'shareholder'].includes(r.subType || '')) records.push(r);
    });
    return records.sort((a, b) => (a?.dueDate ?? '').localeCompare(b?.dueDate ?? ''));
  },

  getReceivables: (): FinancialRecord[] => {
    const records: FinancialRecord[] = [];
    (receivablesService?.getAll?.() || []).forEach(r => {
      if (r) records.push(mapReceivableToFinancialRecord(r));
    });
    (financialActionService?.getStandaloneRecords?.() || []).forEach(r => {
      if (r && ['receipt', 'loan_granted'].includes(r.subType || '')) records.push(r);
    });
    return records.sort((a, b) => (a?.dueDate ?? '').localeCompare(b?.dueDate ?? ''));
  }
};
