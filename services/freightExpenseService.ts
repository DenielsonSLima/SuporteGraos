
import { supabase } from './supabase';
import { FreightExpense } from '../modules/Financial/types'; // Assuming this structure
import { authService } from './authService';

export const freightExpenseService = {
    async add(expense: Omit<FreightExpense, 'id'>) {
        const user = authService.getCurrentUser();
        const companyId = expense.companyId || user?.companyId;

        const { data, error } = await supabase
            .from('freight_expenses')
            .insert({
                loading_id: expense.loadingId,
                type: expense.type,
                amount: expense.amount,
                description: expense.description,
                is_deduction: expense.isDeduction,
                company_id: companyId
            })
            .select()
            .single();

        if (error) throw error;
        return data as FreightExpense;
    },

    async getByLoading(loadingId: string) {
        const { data, error } = await supabase
            .from('freight_expenses')
            .select('*')
            .eq('loading_id', loadingId);

        if (error) return [];
        return data as FreightExpense[];
    },

    async deleteByLoading(loadingId: string) {
        const { error } = await supabase
            .from('freight_expenses')
            .delete()
            .eq('loading_id', loadingId);

        if (error) throw error;
    }
};
