/**
 * ============================================================================
 * HANDLER: REMOÇÃO DE TRANSAÇÃO FINANCEIRA (COM RESTAURAÇÃO DE SALDO)
 * ============================================================================
 * 
 * Responsável por estornar uma transação específica e RESTAURAR o saldo
 * no Contas a Pagar (Payables) ou Contas a Receber (Receivables).
 */

import { financialTransactionService } from '../financialTransactionService';
import { standaloneRecordsService } from '../../standaloneRecordsService';
import { payablesService } from '../payablesService';
import { receivablesService } from '../receivablesService';
import { invalidateFinancialCache } from '../../financialCache';
import { invalidateDashboardCache } from '../../dashboardCache';
import { isSqlCanonicalOpsEnabled, sqlCanonicalOpsLog } from '../../sqlCanonicalOps';

/**
 * Estorna uma transação financeira baseada no ID da transação (txId).
 * 
 * Foundation V2:
 * 1. Cria estorno no ledger (sem delete físico de financial_transactions).
 * 2. O trigger de saldo recalcula o efeito automaticamente.
 * 3. Nós apenas precisamos atualizar o status do Payable/Receivable de volta para pendente.
 */
export const removeFinancialTransaction = async (txIdOrRecordId: string) => {
    if (!txIdOrRecordId) return;
    const canonicalOpsEnabled = isSqlCanonicalOpsEnabled();

    // Normalizar ID
    const txId = txIdOrRecordId.replace('hist-', '').replace('adjust-', '').replace('fh-', '');


    try {
        // 1. Antes de deletar, descobrir o que restaurar nos pedidos
        const allStandalone = standaloneRecordsService.getAll();
        const record = allStandalone.find(r => r.id === `hist-${txId}` || r.id === `adjust-${txId}` || (r.notes && r.notes.includes(txId)));

        if (record) {
            const amount = record.paidValue || 0;
            const discount = record.discountValue || 0;
            const totalToRestore = amount + discount;

            const originMatch = record.notes?.match(/\[ORIGIN:([^\]]+)\]/);
            const originId = originMatch ? originMatch[1] : null;

            if (originId && totalToRestore > 0 && !canonicalOpsEnabled) {
                // Restaurar Payable
                const payable = payablesService.getById(originId);
                if (payable) {
                    const newPaidAmount = Math.max(0, (payable.paidAmount || 0) - totalToRestore);
                    payablesService.update({
                        ...payable,
                        paidAmount: Number(newPaidAmount.toFixed(2)),
                        status: newPaidAmount <= 0 ? 'pending' : 'partially_paid'
                    });
                } else {
                    // Se não achou pelo ID, pode ser um vinculado via Financial Link (Novo)
                    const links = await financialTransactionService.getLinksByEntity(originId, 'standalone');
                    // ... lógica de fallback se necessário ...
                }

                // Restaurar Receivable
                const receivable = receivablesService.getById(originId);
                if (receivable) {
                    const newReceivedAmount = Math.max(0, (receivable.receivedAmount || 0) - totalToRestore);
                    receivablesService.update({
                        ...receivable,
                        receivedAmount: Number(newReceivedAmount.toFixed(2)),
                        status: newReceivedAmount <= 0 ? 'pending' : 'partially_received'
                    });
                }
            } else if (originId && totalToRestore > 0 && canonicalOpsEnabled) {
                sqlCanonicalOpsLog('transactionCleanupHandler: restauração local de payable/receivable ignorada (SQL canônico ativo)');
            }
        }

        // 2. ESTORNAR Transação Principal (ledger imutável)
        await financialTransactionService.delete(txId);

        // Emitir evento para refresh de UI
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('financial:updated'));
        }

        // 3. Limpezas Legacy (somente Standalone auxiliar)
        await standaloneRecordsService.deleteByRef(txId);


        invalidateFinancialCache();
        invalidateDashboardCache();
    } catch (err) {
        throw err;
    }
};
