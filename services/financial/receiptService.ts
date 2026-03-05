import { supabase } from '../supabase';
import { Persistence } from '../persistence';
import { FinancialRecord } from '../../modules/Financial/types';
import { invalidateFinancialCache } from '../financialCache';
import { invalidateDashboardCache } from '../dashboardCache';
import { logService } from '../logService';
import { authService } from '../authService';
import { shouldSkipLegacyTableOps } from '../realtimeTableAvailability';
import { sqlCanonicalOpsLog } from '../sqlCanonicalOps';

// In-memory persistence
const db = new Persistence<FinancialRecord>('standalone_receipts', [], { useStorage: false });

let isInitialized = false;
let realtimeSubscription: any = null;

// Mapper: Supabase -> App
const fromSupabase = (record: any): FinancialRecord => ({
    id: record.id,
    description: record.description,
    entityName: record.entity_name,
    category: record.category,
    dueDate: record.due_date,
    issueDate: record.issue_date,
    settlementDate: record.settlement_date,
    originalValue: parseFloat(record.original_value),
    paidValue: parseFloat(record.paid_value || 0),
    remainingValue: Math.max(0, parseFloat(record.original_value) - parseFloat(record.paid_value || 0) - parseFloat(record.discount_value || 0)),
    discountValue: parseFloat(record.discount_value || 0),
    status: record.status,
    subType: record.sub_type,
    bankAccount: record.bank_account,
    notes: record.notes,
    assetId: record.asset_id,
    isAssetReceipt: record.is_asset_receipt,
    assetName: record.asset_name,
    companyId: record.company_id,
});

// Mapper: App -> Supabase
const toSupabase = (record: FinancialRecord): any => ({
    id: record.id,
    description: record.description,
    entity_name: record.entityName,
    category: record.category,
    due_date: record.dueDate,
    issue_date: record.issueDate,
    settlement_date: record.settlementDate,
    original_value: record.originalValue,
    paid_value: record.paidValue || 0,
    discount_value: record.discountValue || 0,
    status: record.status,
    sub_type: record.subType || 'receipt',
    bank_account: record.bankAccount,
    notes: record.notes,
    asset_id: record.assetId,
    is_asset_receipt: record.isAssetReceipt,
    asset_name: record.assetName,
    company_id: record.companyId || authService.getCurrentUser()?.companyId,
});

export const receiptService = {
    initialize: async () => {
        if (shouldSkipLegacyTableOps('standalone_receipts')) {
            sqlCanonicalOpsLog('receiptService.initialize ignorado: tabela standalone_receipts indisponível no modo canônico');
            return;
        }

        if (isInitialized) return;
        await receiptService.loadFromSupabase();
        receiptService.setupRealtime();
        isInitialized = true;
    },

    loadFromSupabase: async () => {
        if (shouldSkipLegacyTableOps('standalone_receipts')) {
            db.setAll([]);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('standalone_receipts')
                .select('*')
                .order('issue_date', { ascending: false });

            if (error) throw error;
            if (data) {
                db.setAll(data.map(fromSupabase));
            }
        } catch (error) {
        }
    },

    setupRealtime: () => {
        if (shouldSkipLegacyTableOps('standalone_receipts')) {
            return;
        }

        if (realtimeSubscription) return;
        realtimeSubscription = supabase
            .channel('receipt_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'standalone_receipts' }, () => {
                receiptService.loadFromSupabase();
                invalidateFinancialCache();
                invalidateDashboardCache();
            })
            .subscribe();
    },

    stopRealtime: () => {
        if (realtimeSubscription) {
            supabase.removeChannel(realtimeSubscription);
            realtimeSubscription = null;
        }
    },

    getAll: () => db.getAll(),
    getById: (id: string) => db.getById(id),

    add: async (record: FinancialRecord) => {
        if (shouldSkipLegacyTableOps('standalone_receipts')) {
            sqlCanonicalOpsLog('receiptService.add ignorado: tabela standalone_receipts indisponível no modo canônico');
            return;
        }

        const user = authService.getCurrentUser();
        const supabaseRecord = toSupabase(record);

        // ✅ Adicionar em memória PRIMEIRO (optimistic update)
        db.add(record);
        invalidateFinancialCache();
        invalidateDashboardCache();

        const { error } = await supabase.from('standalone_receipts').insert(supabaseRecord);
        if (error) throw error;

        // ✅ SINGLE LEDGER: Criar a entrada financeira (Receivable)
        try {
            const user = authService.getCurrentUser();
            const companyId = record.companyId || user?.companyId;
            if (companyId) {
                await supabase.from('financial_entries').insert({
                    company_id: companyId,
                    type: 'receivable',
                    origin_type: 'standalone_receipt',
                    origin_id: record.id,
                    total_amount: record.originalValue,
                    due_date: record.dueDate,
                    status: 'open',
                    paid_amount: 0,
                    remaining_amount: record.originalValue,
                    created_date: new Date().toISOString().split('T')[0]
                });
            }
        } catch (err) {
        }
    },

    update: async (record: FinancialRecord) => {
        if (shouldSkipLegacyTableOps('standalone_receipts')) {
            sqlCanonicalOpsLog('receiptService.update ignorado: tabela standalone_receipts indisponível no modo canônico');
            return;
        }

        const { error } = await supabase.from('standalone_receipts').update(toSupabase(record)).eq('id', record.id);
        if (error) throw error;

        // ✅ SINGLE LEDGER: Atualizar a entrada financeira
        try {
            await supabase.from('financial_entries').update({
                total_amount: record.originalValue,
                due_date: record.dueDate
            }).eq('origin_id', record.id).eq('origin_type', 'standalone_receipt');
        } catch (err) {
        }

        db.update(record);
        invalidateFinancialCache();
        invalidateDashboardCache();
    },

    delete: async (id: string) => {
        if (shouldSkipLegacyTableOps('standalone_receipts')) {
            sqlCanonicalOpsLog('receiptService.delete ignorado: tabela standalone_receipts indisponível no modo canônico');
            return;
        }

        const { error } = await supabase.from('standalone_receipts').delete().eq('id', id);
        if (error) throw error;

        // ✅ SINGLE LEDGER: Marcar entrada como estornada (imutabilidade do ledger)
        try {
            await supabase.from('financial_entries')
                .update({ status: 'reversed', description: `[ESTORNO] ${id}` })
                .eq('origin_id', id)
                .eq('origin_type', 'standalone_receipt');
        } catch (err) {
        }

        db.delete(id);
        invalidateFinancialCache();
        invalidateDashboardCache();
    }
};
