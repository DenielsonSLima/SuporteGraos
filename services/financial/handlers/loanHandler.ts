
import { generateTxId, registerFinancialRecords } from './orchestratorHelpers';
import type { PaymentData, PaymentResult } from './orchestratorTypes';
import { supabase } from '../../supabase';

/**
 * Handler para Registro Inicial de Empréstimos (Entrada/Saída de Capital).
 * Quando um empréstimo é criado, este handler registra a movimentação no banco.
 */
export const handleLoanInitialEntry = async (
    loanId: string,
    data: PaymentData,
    type: 'taken' | 'granted'
): Promise<PaymentResult> => {
    const txId = generateTxId();
    const transactionValue = data.amount;

    // 1. Descrição padronizada
    const description = `${type === 'taken' ? 'Entrada de Capital (Empréstimo Tomado)' : 'Saída de Capital (Empréstimo Concedido)'}: ${data.entityName || 'Empréstimo'}`;

    // 2. Tentar vincular ao financial_entry criado pelo RPC
    const { data: entry } = await supabase
        .from('financial_entries')
        .select('id')
        .eq('origin_id', loanId)
        .maybeSingle();

    // 3. Registrar no Ledger
    await registerFinancialRecords({
        txId,
        date: data.date,
        amount: transactionValue,
        discount: 0,
        accountId: data.accountId,
        accountName: data.accountName,
        type: type === 'taken' ? 'receipt' : 'payment', // Tomado = Entrada de $$, Concedido = Saída de $$
        recordId: entry?.id || loanId,
        referenceType: type === 'taken' ? 'loan_taken' : 'loan_granted',
        referenceId: loanId,
        description,
        historyType: 'Empréstimo',
        entityName: data.entityName || 'Empréstimo',
        partnerId: data.partnerId,
        notes: data.notes
    });

    // Se houver entry_id, também registramos o pagamento (baixa) atômica via RPC
    if (entry?.id && data.accountId) {
        if (type === 'taken') {
            // Empréstimo tomado: o título é um PAGÁVEL. Receber o dinheiro é "pagar" o título no sentido de saldo?
            // Na verdade, no ERP, o título de empréstimo tomado representa a DÍVIDA.
            // Receber o dinheiro inicial NÃO baixa a dívida, ela continua 'pending'.
            // Então aqui APENAS registramos a transação bancária.
        } else {
            // Empréstimo concedido: o título é um RECEBÍVEL.
            // Dar o dinheiro inicial NÃO baixa o recebível, ele continua 'pending'.
            // Idem: apenas registramos a transação bancária.
        }
    }

    return { success: true, txId };
};
