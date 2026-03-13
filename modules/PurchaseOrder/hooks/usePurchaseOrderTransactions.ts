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

            // Busca a entry relativa a este pedido (SINGLE SOURCE OF TRUTH)
            const { data: entries } = await supabase
                .from('financial_entries')
                .select('id')
                .eq('origin_id', resolvedOrderId)
                .eq('origin_type', 'purchase_order');

            if (!entries || entries.length === 0) return [];

            const entryIds = entries.map(e => e.id);

            // Busca as transações dessas entries
            const { data: txs } = await supabase
                .from('financial_transactions')
                .select('*')
                .in('entry_id', entryIds)
                .order('transaction_date', { ascending: false });

            if (!txs) return [];

            // Mapear para o tipo OrderTransaction esperado pela UI do Pedido de Compra
            return txs.map((tx: any): OrderTransaction => ({
                id: tx.id,
                type: tx.type === 'IN' ? 'receipt' : 'payment',
                date: tx.transaction_date,
                value: Number(tx.amount),
                discountValue: 0, // No metadata legacy o desconto fica no objeto, no core SQL ele é uma entry/tx separada ou abatimento na entry
                accountId: tx.account_id || tx.bank_account_id,
                accountName: tx.description?.split(' [')[0] || 'Caixa',
                notes: tx.description,
                status: 'active'
            }));
        },
        enabled: !!purchaseOrderId,
        staleTime: 0,
        placeholderData: keepPreviousData,
    });
}
