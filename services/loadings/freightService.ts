/**
 * freightService.ts
 * 
 * SERVIÇO DE GESTÃO FINANCEIRA DE FRETE
 * Orquestra o ciclo de vida de pagamentos, descontos e estornos de frete.
 * Implementa o padrão de sincronização [REF:UUID] para integridade financeira.
 */

import { financialActionService } from '../financialActionService';
import { loadingPersistence } from '../loading/loadingPersistence';
import { Loading, LoadingExtraExpense } from '../../modules/Loadings/types';
import { generateUUID } from '../loading/loadingMapper';
import { PaymentData } from '../financial/handlers/orchestratorTypes';

export const freightService = {
  /**
   * Registra um novo pagamento de frete.
   * Cria o lançamento no financeiro sincronizado via [REF:UUID].
   */
  async addFreightPayment(loading: Loading, data: {
    amount: number;
    date: string;
    accountId: string;
    accountName: string;
    notes?: string;
    discount?: number;
  }, existingTxId?: string) {
    const txId = existingTxId || generateUUID();
    const notesWithRef = `${data.notes || ''} [REF:${txId}]`.trim();

    // 1. Processar no Financeiro (Orquestrador)
    const orchestratorData: PaymentData = {
      date: data.date,
      amount: data.amount,
      discount: data.discount || 0,
      accountId: data.accountId,
      accountName: data.accountName,
      notes: notesWithRef,
      entityName: loading.carrierName || 'Transportadora',
      category: 'Fretes',
      subType: 'freight'
    };

    const result = await financialActionService.processRecord(
      `fr-${loading.id}`, 
      orchestratorData, 
      'freight'
    );

    if (!result.success) throw new Error('Falha ao processar pagamento no financeiro');

    // 2. Atualizar Carregamento Local
    const newTx = {
      id: txId,
      date: data.date,
      value: data.amount,
      discountValue: data.discount || 0,
      accountId: data.accountId,
      accountName: data.accountName,
      notes: notesWithRef,
      type: 'payment' as const
    };

    const updatedLoading = {
      ...loading,
      freightPaid: (loading.freightPaid || 0) + data.amount,
      transactions: [newTx, ...(loading.transactions || []).filter(t => t.id !== txId)]
    };

    // Persiste atualização no Supabase para sincronização
    await loadingPersistence.persistLoading(updatedLoading, loading.companyId);
    
    return { success: true, txId };
  },

  /**
   * Atualiza um pagamento de frete existente.
   * Mantém o mesmo [REF:UUID] para integridade mas reseta o estado financeiro.
   */
  async updateFreightPayment(loading: Loading, txId: string, data: {
    amount: number;
    date: string;
    accountId: string;
    accountName: string;
    notes?: string;
    discount?: number;
  }) {
    // 1. Estorna o lançamento anterior (sem deletar o loading)
    await financialActionService.syncDeleteFromOrigin(txId);

    // 2. Recalcula o saldo temporário do loading (removendo a tx antiga)
    const oldTx = loading.transactions?.find(t => t.id === txId);
    const tempPaid = Math.max(0, (loading.freightPaid || 0) - (oldTx?.value || 0));
    const tempLoading = { ...loading, freightPaid: tempPaid };

    // 3. Adiciona o novo (reutilizando o ID para consistência de referência)
    return this.addFreightPayment(tempLoading, data, txId);
  },

  /**
   * Estorna um pagamento de frete.
   */
  async deleteFreightPayment(loading: Loading, txId: string) {
    // 1. Remover do Financeiro de forma sincronizada
    await financialActionService.syncDeleteFromOrigin(txId);

    // 2. Atualizar Carregamento
    const txToDelete = loading.transactions?.find(t => t.id === txId);
    const updatedTransactions = loading.transactions?.filter(t => t.id !== txId) || [];
    const updatedPaid = Math.max(0, (loading.freightPaid || 0) - (txToDelete?.value || 0));

    const updatedLoading = {
      ...loading,
      transactions: updatedTransactions,
      freightPaid: updatedPaid
    };

    // Persiste no banco de dados Supabase
    await loadingPersistence.persistLoading(updatedLoading, loading.companyId);

    return { success: true };
  },

  /**
   * Adiciona uma despesa extra (Adicional ou Dedução).
   */
  async addExtraExpense(loading: Loading, expenseData: {
    description: string;
    value: number;
    type: 'addition' | 'deduction';
    date: string;
    accountId?: string;
    accountName?: string;
  }) {
    const expenseId = generateUUID();
    const expense: LoadingExtraExpense = {
      id: expenseId,
      description: expenseData.description,
      value: expenseData.value,
      type: expenseData.type,
      date: expenseData.date
    };

    // Se houver conta bancária, gera lançamento financeiro sincronizado
    if (expenseData.accountId) {
      // Adições aumentam o valor a pagar (débito), deduções diminuem (crédito no financeiro? não, aqui é pagamento)
      // Se for uma adição paga agora, é um pagamento positivo.
      // Se for uma dedução (ex: quebra), ela diminui o saldo a pagar, mas se for "paga" (estornada), é complexo.
      // Geralmente deduções apenas diminuem o saldo devedor.
      await this.addFreightPayment(loading, {
        amount: expenseData.type === 'addition' ? expenseData.value : -expenseData.value,
        date: expenseData.date,
        accountId: expenseData.accountId,
        accountName: expenseData.accountName || '',
        notes: `${expenseData.description} (Lançamento Extra)`
      });
    }

    const updatedLoading = {
      ...loading,
      extraExpenses: [...(loading.extraExpenses || []), expense]
    };

    // Persiste no banco de dados Supabase
    await loadingPersistence.persistLoading(updatedLoading, loading.companyId);

    return { success: true, expenseId };
  }
};
