
import { generateTxId, registerFinancialRecords } from './orchestratorHelpers';
import type { PaymentData, PaymentResult } from './orchestratorTypes';
import { isSqlCanonicalOpsEnabled } from '../../sqlCanonicalOps';

/**
 * Handler para Transações de Sócios (Retiradas e Aportes).
 * Garante que a movimentação no saldo do sócio gere reflexo no Caixa/Banco.
 */
export const handleShareholderPayment = async (
    shareholderId: string,
    data: PaymentData,
    type: 'credit' | 'debit'
): Promise<PaymentResult> => {
    const txId = generateTxId();
    const transactionValue = data.amount;

    // 1. Descrição padronizada
    const description = `${type === 'debit' ? 'Retirada/Sócio' : 'Aporte/Sócio'}: ${data.entityName || 'Sócio'}`;

    // 2. Registrar no Ledger (Fonte da Verdade Bancária)
    await registerFinancialRecords({
        txId,
        date: data.date,
        amount: transactionValue,
        discount: 0,
        accountId: data.accountId,
        accountName: data.accountName,
        type: type === 'debit' ? 'payment' : 'receipt',
        recordId: shareholderId,
        referenceType: 'shareholder',
        referenceId: shareholderId,
        description,
        historyType: 'Movimentação de Sócio',
        entityName: data.entityName || 'Sócio',
        partnerId: data.partnerId,
        notes: data.notes
    });

    // Nota: A atualização do saldo do sócio (tabela shareholder_transactions) 
    // deve ser feita pelo service que chama este handler, ou vice-versa, 
    // para evitar loop de dependência.

    return { success: true, txId };
};
