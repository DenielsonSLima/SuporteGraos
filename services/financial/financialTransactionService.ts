
import { supabase } from '../supabase';
import { FinancialTransaction } from '../../modules/Financial/types';
import { authService } from '../authService';
import { logService } from '../logService';
import { getTodayBR } from '../../utils/dateUtils';

export interface TransactionLinkParams {
    purchaseOrderId?: string;
    salesOrderId?: string;
    loadingId?: string;
    commissionId?: string;
    standaloneId?: string;
    linkType: 'payment' | 'receipt' | 'deduction' | 'reversal';
}

export const financialTransactionService = {
    async createReversal(row: any) {
        if (!row?.id || !row?.company_id || !row?.bank_account_id || !row?.amount) {
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
        const reversalType = rawType === 'IN' ? 'OUT' : 'IN';

        const user = authService.getCurrentUser();
        const { error } = await supabase
            .from('financial_transactions')
            .insert({
                date: getTodayBR(),
                description: `Estorno automático [REV_OF:${row.id}] ${description}`,
                amount: Number(row.amount),
                type: reversalType,
                bank_account_id: row.bank_account_id,
                payable_id: null,
                receivable_id: null,
                company_id: row.company_id,
                user_id: user?.id || row.user_id || null
            });

        if (error) {
            throw error;
        }
    },

    /**
     * Registers a new financial transaction (payment, receipt, etc)
     * Now supports optional link data for the new financial_links table.
     */
    async add(transaction: Omit<FinancialTransaction, 'id'>, linkData?: TransactionLinkParams) {
        const user = authService.getCurrentUser();
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
                    date: transaction.date || getTodayBR(),
                    description: transaction.description,
                    amount: transaction.amount,
                    type: normalizedType,
                    bank_account_id: transaction.bankAccountId,
                    // Legacy fields (kept for compatibility during migration, but we should phase them out)
                    payable_id: linkData?.purchaseOrderId || (transaction.financialRecordId && transaction.type === 'payment' ? transaction.financialRecordId : null),
                    receivable_id: linkData?.salesOrderId || (transaction.financialRecordId && transaction.type === 'receipt' ? transaction.financialRecordId : null),
                    company_id: companyId,
                    user_id: user?.id
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
                        purchase_order_id: linkData.purchaseOrderId,
                        sales_order_id: linkData.salesOrderId,
                        loading_id: linkData.loadingId,
                        commission_id: linkData.commissionId,
                        standalone_id: linkData.standaloneId,
                        link_type: linkData.linkType
                    });

                if (linkError) {
                }
            }

            logService.addLog({
                userId: user?.id || 'system',
                userName: user?.name || 'Sistema',
                action: 'create',
                module: 'Financeiro',
                description: `Lançou ${transaction.type}: ${transaction.description} (R$ ${transaction.amount})`,
                entityId: tx.id
            });

            return tx as FinancialTransaction;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Lists transactions via the new financial_links table
     */
    async getLinksByEntity(entityId: string, entityType: 'purchase_order' | 'sales_order' | 'loading' | 'commission' | 'standalone') {
        const column = `${entityType}_id`;

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
     * Registra estorno de uma transação (ledger imutável)
     */
    async delete(txId: string) {
        const { data, error } = await supabase
            .from('financial_transactions')
            .select('*')
            .eq('id', txId)
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!data) {
            return;
        }

        await this.createReversal(data);
    },

    async deleteByRecordId(recordId: string, type: 'payable' | 'receivable') {
        const field = type === 'payable' ? 'payable_id' : 'receivable_id';
        const { data, error } = await supabase
            .from('financial_transactions')
            .select('*')
            .eq(field, recordId);

        if (error) throw error;

        for (const row of data || []) {
            await this.createReversal(row);
        }
    },

    async deleteByRef(refId: string) {
        const { data, error } = await supabase
            .from('financial_transactions')
            .select('*')
            .ilike('description', `%[REF:${refId}]%`);

        if (error) {
            throw error;
        }

        for (const row of data || []) {
            await this.createReversal(row);
        }
    },

    /**
     * Corrige lançamentos legacy (receipt/payment/credit/debit...) para IN/OUT
     * e recalcula current_balance em contas_bancarias para refletir corretamente
     * Caixa/Início sem depender de execução manual de SQL.
     */
    async normalizeLegacyTransferTypesAndRecalculate() {
        const user = authService.getCurrentUser();
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

            (txRows || []).forEach((row: any) => {
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
                balancesUpdated = (recalcResult as any)?.updated ?? 0;
            }

            if (typeof window !== 'undefined' && balancesUpdated > 0) {
                localStorage.setItem(migrationKey, 'done');
            }

            return { normalized: normalizedCount, balancesUpdated };
        } catch {
            return { normalized: normalizedCount, balancesUpdated };
        }
    }
};
