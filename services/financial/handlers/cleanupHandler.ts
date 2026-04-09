/**
 * ============================================================================
 * HANDLER: ESTORNO FINANCEIRO EM CASCATA
 * ============================================================================
 * 
 * Responsável por ESTORNAR (reversal) todos os registros financeiros ao deletar uma entidade.
 * Usado ao deletar loadings, pedidos de compra ou pedidos de venda.
 * 
 * Imutabilidade do Ledger: cria registros de estorno ao invés de deletar.
 * Estorna: financial_history, financial_transactions
 */

import { financialTransactionService } from '../financialTransactionService';
import { financialHistoryService } from '../financialHistoryService';
import { invalidateFinancialCache } from '../../financialCache';
import { invalidateDashboardCache } from '../../dashboardCache';
import type { CleanupParams } from './orchestratorTypes';

/**
 * Estorna TODOS os registros financeiros associados a uma entidade.
 * Deve ser chamado ao deletar loadings, pedidos de compra ou venda.
 * 
 * Imutabilidade: cria estornos (reversals) em vez de hard-deletes.
 */
export const cleanupFinancialRecords = async (params: CleanupParams) => {
  const { entityId, entityType, payableIds = [], receivableIds = [] } = params;


  try {
    // 1. Localizar e deletar via Financial Links (Nova Abstração)
    const links = await financialTransactionService.getLinksByEntity(entityId, entityType);
    for (const link of links) {
      if (link.transaction_id) {
        await financialTransactionService.delete(link.transaction_id);
      }
    }

    // 1.1 Safety Fallback: Deletar via tag [ORIGIN:entityId] na descrição
    // Garante que transações "avulsas" vinculadas por tag (como despesas extras) sejam limpas
    await financialTransactionService.deleteByOrigin(entityId);

    // 2. Limpar legacy transactions (via IDs antigos)
    for (const payableId of payableIds) {
      await financialTransactionService.deleteByRecordId(payableId, 'payable');
    }
    for (const receivableId of receivableIds) {
      await financialTransactionService.deleteByRecordId(receivableId, 'receivable');
    }

    // 3. Limpar legacy history (via referenceId)
    const allHistory = financialHistoryService.getAll();
    const relatedHistory = allHistory.filter(h =>
      h.referenceId === entityId ||
      payableIds.includes(h.referenceId || '') ||
      receivableIds.includes(h.referenceId || '')
    );
    for (const h of relatedHistory) {
      financialHistoryService.delete(h.id);
    }

    // 4. Limpar admin_expenses (standalone) pelo [ORIGIN:xxx]
    const { standaloneRecordsService } = await import('../../standaloneRecordsService');
    const allStandalone = standaloneRecordsService.getAll();
    const toDeleteStandalone = allStandalone.filter(s => {
      const notes = s.notes || '';
      return notes.includes(`[ORIGIN:${entityId}]`) ||
        payableIds.some(id => notes.includes(`[ORIGIN:${id}]`)) ||
        receivableIds.some(id => notes.includes(`[ORIGIN:${id}]`)) ||
        s.id.startsWith('hist-'); // captura registros hist- vinculados por convenção
    });

    for (const s of toDeleteStandalone) {
      await standaloneRecordsService.delete(s.id);
    }

  } catch (err) {
  }

  invalidateFinancialCache();
  invalidateDashboardCache();
};
