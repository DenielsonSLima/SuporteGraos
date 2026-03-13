
import { supabase } from './supabase';
import { FreightExpense } from '../modules/Financial/types'; // Assuming this structure
import { authService } from './authService';

export const freightExpenseService = {
    async add(expense: Omit<FreightExpense, 'id'>) {
        const user = authService.getCurrentUser();
        const companyId = expense.companyId || user?.companyId;

        const { data, error } = await supabase
            .from('ops_loading_freight_components')
            .insert({
                loading_id: expense.loadingId,
                component_type: expense.type === 'deduction' ? 'quebra' : 'outros',
                amount: expense.amount,
                description: expense.description,
                deductible: expense.isDeduction,
                company_id: companyId
            })
            .select()
            .single();

        if (error) throw error;

        // Map back to FreightExpense interface
        return {
            id: data.id,
            loadingId: data.loading_id,
            type: data.deductible ? 'deduction' : 'addition',
            amount: Number(data.amount),
            description: data.description,
            isDeduction: data.deductible,
            companyId: data.company_id
        } as FreightExpense;
    },

    async getByLoading(loadingId: string) {
        const { data, error } = await supabase
            .from('ops_loading_freight_components')
            .select('*')
            .eq('loading_id', loadingId);

        if (error) return [];
        return (data || []).map(d => ({
            id: d.id,
            loadingId: d.loading_id,
            type: d.deductible ? 'deduction' : 'addition',
            amount: Number(d.amount),
            description: d.description,
            isDeduction: d.deductible,
            companyId: d.company_id
        })) as FreightExpense[];
    },

    async deleteByLoading(loadingId: string) {
        const { error } = await supabase
            .from('ops_loading_freight_components')
            .delete()
            .eq('loading_id', loadingId);

        if (error) throw error;
    }
};
