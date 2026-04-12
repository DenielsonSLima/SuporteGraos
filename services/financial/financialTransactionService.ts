import { supabase } from '../supabase';
import { FinancialTransaction as FinancialTransactionUI } from '../../modules/Financial/types';
import { FinancialTransaction as FinancialTransactionDB } from '../../types/database';
import { getTodayBR } from '../../utils/dateUtils';

export interface TransactionLinkParams {
    purchaseOrderId?: string;
    salesOrderId?: string;
    loadingId?: string;
    commissionId?: string;
    standaloneId?: string;
    shareholderTxId?: string;
    linkType: 'payment' | 'receipt' | 'deduction' | 'reversal';
    metadata?: any;
}

export const financialTransactionService = {
    async createReversal(row: FinancialTransactionDB) {
        if (!row?.id || !row?.company_id || !row?.account_id || !row?.amount) {
            return;
        }

        const description = String(row.description || '');
        if (description.includes('[REV_OF:')) {
            return;
        }

        const { data: existingReversal } = await supabase
            .from('financial_transactions')
            .select('id')
            .eq('company_id', row.company_id)
            .ilike('description', `%[REV_OF:${row.id}]%`)
            .limit(1)
            .maybeSingle();

        if (existingReversal?.id) {
            return;
        }

        const rawType = String(row.type || '').toUpperCase();
        
        // Normalização robusta: Créditos/Inflows (IN, CREDIT, RECEIPT, etc) -> Reversão de SAÍDA (OUT)
        // Débitos/Outflows (OUT, DEBIT, PAYMENT, etc) -> Reversão de ENTRADA (IN)
        const isInflow = ['IN', 'CREDIT', 'RECEIPT', 'RECEBIMENTO', 'ENTRADA'].includes(rawType);
        const reversalType = isInflow ? 'OUT' : 'IN';

        const authModule = await import('../authService');
        const user = authModule.authService.getCurrentUser();
        
        // Se SQL canônico estiver ativo, logs extras... (opcional)

        // Safe check for created_by UUID to avoid 409 Conflict/FK violations
        const isValidUUID = (id: any) => 
            typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        const safeCreatedBy = [user?.appUserId, row.created_by]
            .find(id => isValidUUID(id)) || null;

        const { data: newTx, error: txError } = await supabase
            .from('financial_transactions')
            .insert({
                transaction_date: getTodayBR(),
                description: `Estorno automático [REV_OF:${row.id}] ${description}`,
                amount: Number(row.amount),
                type: reversalType,
                account_id: row.account_id,
                company_id: row.company_id,
                entry_id: row.entry_id, // ✅ CRITICAL: Link to parent entry for trigger update
                created_by: safeCreatedBy
            })
            .select()
            .single();

        if (txError) throw txError;

        // 2. Propagate links to the new financial_links table for full history visibility
        const { data: links } = await supabase
            .from('financial_links')
            .select('*')
            .eq('transaction_id', row.id);

        if (links && links.length > 0) {
            const newLinks = links.map(link => ({
                transaction_id: newTx.id,
                company_id: row.company_id,
                purchase_order_id: link.purchase_order_id,
                sales_order_id: link.sales_order_id,
                loading_id: link.loading_id,
                standalone_id: link.standalone_id,
                shareholder_tx_id: link.shareholder_tx_id,
                link_type: 'reversal'
            }));

            const { error: linkError } = await supabase.from('financial_links').insert(newLinks);
            if (linkError) {
                console.error('Error propagating links in createReversal:', linkError);
            }
        }
    },

    /**
     * Registers a new financial transaction (payment, receipt, etc)
     * Now supports optional link data for the new financial_links table.
     */
    async add(transaction: Omit<FinancialTransactionUI, 'id'>, linkData?: TransactionLinkParams) {
        const authModule = await import('../authService');
        const user = authModule.authService.getCurrentUser();
        const companyId = transaction.companyId || user?.companyId;

        if (!companyId) {
            throw new Error('Company ID is required for financial transactions');
        }

        try {
            const normalizedType = (() => {
                const rawType = String(transaction.type || '').toLowerCase();
                if (rawType === 'receipt' || rawType === 'credit' || rawType === 'in') return 'IN';
                if (rawType === 'payment' || rawType === 'debit' || rawType === 'transfer' || rawType === 'out') return 'OUT';
                return transaction.type;
            })();

            // 1. Insert the main transaction
            // The trigger 'trg_update_balance' will automatically update bank_accounts.current_balance
            const { data: tx, error: txError } = await supabase
                .from('financial_transactions')
                .insert({
                    transaction_date: transaction.date || getTodayBR(),
                    description: transaction.description,
                    amount: transaction.amount,
                    type: normalizedType,
                    account_id: transaction.bankAccountId,
                    company_id: companyId,
                    created_by: user?.id
                })
                .select()
                .single();

            if (txError) throw txError;

            // 2. Create the robust link in the new financial_links table if provided
            if (linkData) {
                const { error: linkError } = await supabase
                    .from('financial_links')
                    .insert({
                        transaction_id: tx.id,
                        company_id: companyId,
                        purchase_order_id: linkData.purchaseOrderId,
                        sales_order_id: linkData.salesOrderId,
                        loading_id: linkData.loadingId,
                        commission_id: linkData.commissionId,
                        standalone_id: linkData.standaloneId,
                        shareholder_tx_id: linkData.shareholderTxId,
                        link_type: linkData.linkType,
                        metadata: linkData.metadata
                    });

                if (linkError) {
                }
            }

            const logModule = await import('../logService');
            logModule.logService.addLog({
                userId: user?.id || 'system',
                userName: user?.name || 'Sistema',
                action: 'create',
                module: 'Financeiro',
                description: `Lançou ${transaction.type}: ${transaction.description} (R$ ${transaction.amount})`,
                entityId: tx.id
            });

            return tx as unknown as FinancialTransactionUI;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Lists transactions via the new financial_links table
     */
    async getLinksByEntity(entityId: string, entityType: 'purchase_order' | 'sales_order' | 'loading' | 'commission' | 'standalone' | 'shareholder_tx') {
        const column = entityType === 'shareholder_tx' ? 'shareholder_tx_id' : `${entityType}_id`;

        const { data, error } = await supabase
            .from('financial_links')
            .select(`
                *,
                transaction:financial_transactions(*)
            `)
            .eq(column, entityId)
            .order('created_at', { ascending: false });

        if (error) {
            return [];
        }

        return data;
    },

    /**
     * Remove uma transação financeira (Delete Físico)
     * Atende ao requisito do usuário de "apagar ao invés de estornar" 
     * para manter o saldo e a UI limpos.
     */
    async delete(txId: string) {
        if (!txId) return;

        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(txId);

        if (isValidUUID) {
            const { error } = await supabase
                .from('financial_transactions')
                .delete()
                .eq('id', txId);
            if (error) throw error;
        } else {
            // Fallback para delete por REF ou ORIGIN se não for UUID (caso de despesas extras)
            await this.deleteByRef(txId);
            await this.deleteByOrigin(txId);
        }
    },

    async deleteByRecordId(recordId: string, type: 'payable' | 'receivable'): Promise<boolean> {
        try {
            const field = type === 'payable' ? 'payable_id' : 'receivable_id';
            const { error } = await supabase
                .from('financial_transactions')
                .delete()
                .eq(field, recordId);

            if (error) throw error;
            return true;
        } catch (err) {
            console.error('Error in deleteByRecordId:', err);
            return false;
        }
    },

    async deleteByEntryId(entryId: string): Promise<boolean> {
        try {
            const { data, error } = await supabase
                .from('financial_transactions')
                .select('*')
                .eq('entry_id', entryId);

            if (error) {
                throw error;
            }

            for (const row of data || []) {
                await this.createReversal(row);
            }
            return true;
        } catch (err) {
            console.error('Error in deleteByEntryId:', err);
            return false;
        }
    },

    async deleteByRef(refId: string) {
        if (!refId) return;
        
        // Deleta por REF ou ORIGIN (cobre ambos os tipos de metadados na descrição)
        const { error } = await supabase
            .from('financial_transactions')
            .delete()
            .or(`description.ilike.%[REF:${refId}]%,description.ilike.%[ORIGIN:${refId}]%`);
            
        if (error) throw error;
    },

    async deleteByOrigin(originId: string) {
        if (!originId) return;

        const isValidUUID = (id: string) => 
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        // 1. Tentar deletar via Robust Links (Foundation V2)
        // Só tenta se for um UUID válido, para evitar erro de cast no Postgres
        if (isValidUUID(originId)) {
            const { data: linkedTxs, error: linkError } = await supabase
                .from('financial_links')
                .select('transaction_id')
                .or(`purchase_order_id.eq.${originId},sales_order_id.eq.${originId},loading_id.eq.${originId},commission_id.eq.${originId},standalone_id.eq.${originId}`);

            if (!linkError && linkedTxs && linkedTxs.length > 0) {
                const txIds = linkedTxs.map(l => l.transaction_id);
                const { error: delError } = await supabase
                    .from('financial_transactions')
                    .delete()
                    .in('id', txIds);
                
                if (delError) throw delError;
                return;
            }
        }

        // 2. Fallback: Deletar via Tags na descrição (Metadados legados)
        const { error } = await supabase
            .from('financial_transactions')
            .delete()
            .ilike('description', `%[ORIGIN:${originId}]%`);

        if (error) throw error;
    },

    /**
     * Corrige lançamentos legacy (receipt/payment/credit/debit...) para IN/OUT
     * e recalcula current_balance em contas_bancarias para refletir corretamente
     * Caixa/Início sem depender de execução manual de SQL.
     */
    async normalizeLegacyTransferTypesAndRecalculate() {
        const authModule = await import('../authService');
        const user = authModule.authService.getCurrentUser();
        const companyId = user?.companyId;
        if (!companyId) return { normalized: 0, balancesUpdated: 0 };

        const migrationKey = `fix_transfer_sign_v2_${companyId}`;
        if (typeof window !== 'undefined' && localStorage.getItem(migrationKey) === 'done') {
            return { normalized: 0, balancesUpdated: 0 };
        }

        const normalizeType = (value: string) => {
            const type = String(value || '').toLowerCase();
            if (['receipt', 'credit', 'in', 'recebimento', 'entrada'].includes(type)) return 'IN';
            if (['payment', 'debit', 'out', 'transfer', 'pagamento', 'saida', 'saída'].includes(type)) return 'OUT';
            return null;
        };

        let normalizedCount = 0;
        let balancesUpdated = 0;

        try {
            const { data: txRows } = await supabase
                .from('financial_transactions')
                .select('id, type, bank_account_id, amount')
                .eq('company_id', companyId);

            const toIn: string[] = [];
            const toOut: string[] = [];

            (txRows || []).forEach((row) => {
                const normalized = normalizeType(row.type);
                if (!normalized) return;
                if (normalized !== row.type) {
                    if (normalized === 'IN') toIn.push(row.id);
                    if (normalized === 'OUT') toOut.push(row.id);
                }
            });

            if (toIn.length > 0) {
                const { error } = await supabase
                    .from('financial_transactions')
                    .update({ type: 'IN' })
                    .in('id', toIn);
                if (!error) normalizedCount += toIn.length;
            }

            if (toOut.length > 0) {
                const { error } = await supabase
                    .from('financial_transactions')
                    .update({ type: 'OUT' })
                    .in('id', toOut);
                if (!error) normalizedCount += toOut.length;
            }

            // SKIL "Saldo Sagrado": recálculo via RPC server-side (nunca UPDATE direto)
            const { data: recalcResult, error: recalcError } = await supabase.rpc(
                'rpc_recalc_account_balances',
                { p_company_id: companyId }
            );

            if (!recalcError && recalcResult) {
                balancesUpdated = (recalcResult as { updated: number })?.updated ?? 0;
            }

            if (typeof window !== 'undefined' && balancesUpdated > 0) {
                localStorage.setItem(migrationKey, 'done');
            }

            return { normalized: normalizedCount, balancesUpdated };
        } catch {
            return { normalized: normalizedCount, balancesUpdated };
        }
    },

    // REALTIME — singleton channel (evita canais duplicados)
    subscribeRealtime: (() => {
        const listeners = new Set<() => void>();
        let channel: ReturnType<typeof supabase.channel> | null = null;
        return (onAnyChange: () => void): (() => void) => {
            listeners.add(onAnyChange);
            if (!channel) {
                channel = supabase
                    .channel('realtime:financial_transactions')
                    .on(
                        'postgres_changes',
                        { event: '*', schema: 'public', table: 'financial_transactions' },
                        (payload) => {
                            void import('../authService').then(m => {
                                const companyId = m.authService.getCurrentUser()?.companyId;
                                const changedCompanyId = payload?.new?.company_id ?? payload?.old?.company_id;
                                if (!companyId || !changedCompanyId || changedCompanyId === companyId) {
                                    listeners.forEach(fn => fn());
                                }
                            });
                        },
                    )
                    .subscribe();
            }
            return () => {
                listeners.delete(onAnyChange);
                if (listeners.size === 0 && channel) {
                    supabase.removeChannel(channel);
                    channel = null;
                }
            };
        };
    })(),
};
