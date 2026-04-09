import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useEffect } from 'react';
import { financialTransactionsService } from '../../../services/financialTransactionsService';
import { OrderTransaction } from '../types';

export function usePurchaseOrderTransactions(purchaseOrderId: string) {
    const queryClient = useQueryClient();
    const key = ['purchase_order_transactions', purchaseOrderId] as const;

    useEffect(() => {
        const unsub = financialTransactionsService.subscribeRealtime(() => {
            queryClient.invalidateQueries({ queryKey: key });
        });
        return unsub;
    }, [queryClient, key]);

    return useQuery({
        queryKey: key,
        queryFn: async () => {
            if (!purchaseOrderId) return [];

            const { supabase } = await import('../../../services/supabase');

            let resolvedOrderId = purchaseOrderId;

            // Se não for um UUID válido, buscar o UUID real (casos legacy ou busca por number)
            const isValidUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

            if (!isValidUuid(purchaseOrderId)) {
                const { data: order } = await supabase
                    .from('ops_purchase_orders')
                    .select('id')
                    .eq('number', purchaseOrderId)
                    .limit(1)
                    .maybeSingle();
                if (order?.id) {
                    resolvedOrderId = order.id;
                }
            }

            // Busca transações VIA LINKS (Robusto para Foundation V2)
            // Isso garante que despesas extras (sem entry_id) apareçam na UI.
            const { data: links, error: linkError } = await supabase
                .from('financial_links')
                .select(`
                    transaction_id,
                    link_type,
                    metadata,
                    transaction:financial_transactions(*)
                `)
                .eq('purchase_order_id', resolvedOrderId)
                .order('created_at', { ascending: false });

            if (linkError || !links) return [];

            // Mapear para o tipo OrderTransaction esperado pela UI do Pedido de Compra
            return links
                .filter(l => l.transaction) // Garante que a transação existe
                .map((l: any): OrderTransaction => {
                    const tx = l.transaction;
                    const metadata = l.metadata || {};

                    // ✅ Determinar tipo real: se no link for 'expense' ou se houver metadata de expense
                    const isExpense = l.link_type === 'expense' || metadata.expenseId || 
                                     (tx.description && (tx.description.includes('Despesa Extra') || tx.description.includes('Taxa')));
                    const isCommission = metadata.subType === 'commission';
                    
                    const getType = () => {
                        if (isCommission) return 'commission';
                        if (isExpense) return 'expense';
                        return tx.type === 'IN' ? 'receipt' : 'payment';
                    };

                    return {
                        id: tx.id,
                        type: getType(),
                        date: tx.transaction_date,
                        value: Number(tx.amount),
                        discountValue: Number(metadata.discount || 0),
                        accountId: tx.account_id,
                        accountName: tx.description?.split(' [')[0] || 'Caixa',
                        notes: tx.description,
                        status: 'active',
                        deductFromPartner: metadata.deductFromPartner ?? false
                    };
                });
        },
        enabled: !!purchaseOrderId,
        staleTime: 0,
    });
}
