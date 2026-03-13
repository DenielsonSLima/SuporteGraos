import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useEffect } from 'react';
import { financialTransactionService } from '../../../services/financial/financialTransactionService';
import { financialTransactionsService } from '../../../services/financialTransactionsService';

export function useSalesOrderTransactions(salesOrderId: string) {
    const queryClient = useQueryClient();
    const key = ['sales_order_transactions', salesOrderId] as const;

    useEffect(() => {
        const unsub = financialTransactionsService.subscribeRealtime(() => {
            queryClient.invalidateQueries({ queryKey: key });
        });
        return unsub;
    }, [queryClient, key]);

    return useQuery({
        queryKey: key,
        queryFn: async () => {
            if (!salesOrderId) return [];

            const { supabase } = await import('../../../services/supabase');

            let resolvedOrderId = salesOrderId;

            // Se não for um UUID válido, buscar o UUID real
            const isValidUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

            if (isValidUuid(salesOrderId)) {
                const { data: order } = await supabase
                    .from('ops_sales_orders')
                    .select('id')
                    .or(`id.eq.${salesOrderId},legacy_id.eq.${salesOrderId}`)
                    .limit(1)
                    .maybeSingle();
                if (order?.id) {
                    resolvedOrderId = order.id;
                }
            } else {
                const { data: order } = await supabase
                    .from('ops_sales_orders')
                    .select('id')
                    .eq('number', salesOrderId)
                    .limit(1)
                    .maybeSingle();
                if (order?.id) {
                    resolvedOrderId = order.id;
                }
            }

            // Busca a entry relativa a este pedido
            const { data: entries } = await supabase
                .from('financial_entries')
                .select('id')
                .eq('origin_id', resolvedOrderId)
                .eq('origin_type', 'sales_order');

            if (!entries || entries.length === 0) return [];

            const entryId = entries[0].id;

            // Busca as transações dessa entry
            const { data: txs } = await supabase
                .from('financial_transactions')
                .select('*')
                .eq('entry_id', entryId)
                .order('transaction_date', { ascending: false });

            if (!txs) return [];

            return txs.map((tx: any) => ({
                ...tx,
                id: tx.id,
                value: Number(tx.amount),
                date: tx.transaction_date,
                type: tx.type === 'IN' || tx.type === 'receipt' || tx.type === 'credit' ? 'receipt' : 'payment',
                notes: tx.description,
                accountId: tx.account_id || tx.bank_account_id
            }));
        },
        enabled: !!salesOrderId,
        staleTime: 0, // Realtime
        placeholderData: keepPreviousData,
    });
}
