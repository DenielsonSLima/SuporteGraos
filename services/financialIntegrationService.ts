
import { FinancialRecord } from '../modules/Financial/types';
import { financialEntriesService, EnrichedPayableEntry, EnrichedReceivableEntry } from './financialEntriesService';

// ============================================================================
// MAPEAMENTO: Entry → FinancialRecord (SQL-FIRST)
// ============================================================================

const toPayableRecord = (entry: EnrichedPayableEntry): FinancialRecord => {
  const origin = entry.origin_type || '';
  const status = entry.status === 'paid' ? 'paid'
    : entry.status === 'partially_paid' ? 'partial'
      : entry.status === 'overdue' ? 'overdue'
        : entry.status === 'cancelled' ? 'cancelled'
          : entry.status === 'reversed' ? 'reversed'
            : 'pending';

  const subType = origin === 'purchase_order' ? 'purchase_order'
    : origin === 'commission' ? 'commission'
      : origin === 'expense' ? 'admin'
        : origin === 'loan' ? 'loan_taken'
          : origin === 'freight' ? 'freight'
            : 'freight';

  return {
    id: entry.id,
    originId: entry.origin_id,
    description: entry.partner_name,
    entityName: entry.partner_name,
    category: subType === 'purchase_order' ? 'Compras' : subType === 'freight' ? 'Frete' : subType === 'commission' ? 'Comissão' : 'Administrativo',
    dueDate: entry.due_date || entry.created_date,
    issueDate: entry.created_date,
    originalValue: entry.total_amount,
    paidValue: entry.paid_amount,
    remainingValue: entry.remaining_amount,
    deductionsAmount: entry.deductions_amount,
    netAmount: entry.net_amount,
    status,
    subType: subType as any,
    weightKg: entry.freight_weight_kg || entry.total_weight_kg,
    orderNumber: entry.order_number
  };
};

const toReceivableRecord = (entry: EnrichedReceivableEntry): FinancialRecord => {
  const status = entry.status === 'paid' ? 'paid'
    : entry.status === 'partially_paid' ? 'partial'
      : entry.status === 'overdue' ? 'overdue'
        : entry.status === 'cancelled' ? 'cancelled'
          : entry.status === 'reversed' ? 'reversed'
            : 'pending';

  return {
    id: entry.id,
    originId: entry.origin_id,
    description: entry.partner_name,
    entityName: entry.partner_name,
    category: 'Vendas',
    dueDate: entry.due_date || entry.created_date,
    issueDate: entry.created_date,
    originalValue: entry.total_amount,
    paidValue: entry.paid_amount,
    remainingValue: entry.remaining_amount,
    deductionsAmount: entry.deductions_amount,
    netAmount: entry.net_amount,
    status,
    subType: 'sales_order',
    weightKg: entry.loading_weight_kg,
    orderNumber: entry.sales_order_number
  };
};

export const financialIntegrationService = {
  /**
   * Consolida tudo que a empresa DEVE (Passivo) - Modo Assíncrono SQL-First
   */
  getPayables: async (): Promise<FinancialRecord[]> => {
    const entries = await financialEntriesService.getPayables();
    return entries.map(toPayableRecord);
  },

  /**
   * Consolida tudo que a empresa DEVE RECEBER (Ativo) - Modo Assíncrono SQL-First
   */
  getReceivables: async (): Promise<FinancialRecord[]> => {
    const entries = await financialEntriesService.getReceivables();
    return entries.map(toReceivableRecord);
  }
};
