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

            // Busca transações VIA LINKS (Robusto para Foundation V2)
            // Isso garante que recebimentos e suas observações customizadas sejam resgatados corretamente.
            const { data: links, error: linkError } = await supabase
                .from('financial_links')
                .select(`
                    transaction_id,
                    link_type,
                    metadata,
                    transaction:financial_transactions(
                        *,
                        account:accounts(account_name, owner)
                    )
                `)
                .eq('sales_order_id', resolvedOrderId)
                .order('created_at', { ascending: false });

            if (linkError || !links) return [];

            return links
                .filter(l => l.transaction) // Garante que a transação existe
                .map((l: any) => {
                    const tx = l.transaction;
                    const metadata = l.metadata || {};

                    return {
                        id: tx.id,
                        value: Number(tx.amount),
                        discountValue: Number(tx.metadata?.discount_amount || metadata.discount || 0),
                        date: tx.transaction_date,
                        type: tx.type === 'IN' || tx.type === 'receipt' || tx.type === 'credit' ? 'receipt' : 'payment',
                        notes: metadata.notes || (
                            tx.description && 
                            !tx.description.startsWith('Recebimento Pedido Venda:') && 
                            tx.description !== 'Recebimento de Venda'
                                ? tx.description
                                : ''
                        ),
                        accountId: tx.account_id || tx.bank_account_id,
                        accountName: tx.account ? `${tx.account.account_name}${tx.account.owner ? ` - ${tx.account.owner}` : ''}` : (tx.description?.split(' [')[0] || 'Caixa')
                    };
                });
        },
        enabled: !!salesOrderId,
        staleTime: 0, // Realtime
        placeholderData: keepPreviousData,
    });
}
