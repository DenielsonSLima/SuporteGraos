import { supabase } from '../supabase';
import { SalesOrder, SalesTransaction } from '../../modules/SalesOrder/types';
import { financialTransactionService } from '../financial/financialTransactionService';
import { financialActionService } from '../financialActionService';
import { authService } from '../authService';
import { getTodayBR } from '../../utils/dateUtils';

/**
 * RECEIPT SERVICE (SALES)
 * Centraliza a lógica de processamento de recebimentos no módulo de Pedido de Venda.
 * Segue o padrão de orquestração financeira com rastreabilidade [REF].
 */
export const receiptService = {
  /**
   * Adiciona um novo recebimento ao pedido e sincroniza com o financeiro.
   */
  async addReceipt(orderId: string, data: any) {
    const user = authService.getCurrentUser();
    const receiptId = crypto.randomUUID();

    // 1. Processar o recebimento via Orquestrador Financeiro
    // Isso cria a transação real no banco/caixa e atualiza a 'financial_entry' do pedido.
    const result = await financialActionService.processRecord(
      orderId, 
      {
        ...data,
        notes: `${data.notes || 'Recebimento de Venda'} [REF:${receiptId}]`
      },
      'sales_order'
    );

    if (!result.success) {
      throw new Error('Falha ao processar recebimento financeiro');
    }

    return result;
  },

  /**
   * Remove um recebimento e limpa todos os rastros financeiros vinculados.
   */
  async deleteReceipt(orderId: string, txId: string) {
    if (!txId) throw new Error('ID da transação não fornecido');

    // 1. Tentar remover via transação financeira direta (Ledger)
    // O orchestrator já cuida de estornar o valor na 'financial_entry'.
    try {
      const { removeFinancialTransaction } = await import('../financial/paymentOrchestrator');
      await removeFinancialTransaction(txId);
    } catch (err) {
      console.warn('[receiptService.deleteReceipt] Falha ao remover transação direta, tentando por REF:', err);
      // Fallback: Se o ID passado não for o da transação, mas for o do recebimento (REF)
      await financialTransactionService.deleteByRef(txId);
      await financialTransactionService.deleteByOrigin(orderId);
    }

    // 2. Sincronizar metadata do pedido (se houver cache local/store)
    // Nota: O TanStack Query deve ser invalidado no componente para refletir a mudança no banco real.
    return { success: true };
  },

  /**
   * Atualiza um recebimento existente (Estorna e Lança novamente).
   */
  async updateReceipt(orderId: string, txId: string, data: any) {
    // 1. Estorna o lançamento antigo
    await this.deleteReceipt(orderId, txId);
    
    // 2. Lança o novo com os dados atualizados
    return await this.addReceipt(orderId, data);
  }
};
