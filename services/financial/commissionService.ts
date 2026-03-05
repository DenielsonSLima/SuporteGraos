import { supabase } from '../supabase';
import { Commission } from '../../modules/Financial/types';
import { authService } from '../authService';

export const commissionService = {
    async add(commission: Omit<Commission, 'id'>) {
        const user = authService.getCurrentUser();
        const companyId = commission.companyId || user?.companyId;

        const { data, error } = await supabase
            .from('commissions')
            .insert({
                date: commission.date || new Date().toISOString().split('T')[0],
                partner_id: commission.partnerId,
                sales_order_id: commission.salesOrderId || null,
                loading_id: commission.loadingId || null,
                amount: commission.amount,
                status: commission.status || 'pending',
                description: commission.description,
                company_id: companyId
            })
            .select()
            .single();

        if (error) throw error;
        return data as Commission;
    },

    async getByLoading(loadingId: string) {
        const { data, error } = await supabase
            .from('commissions')
            .select('*')
            .eq('loading_id', loadingId);

        if (error) return [];
        return data as Commission[];
    },

    async deleteByLoading(loadingId: string) {
        const { error } = await supabase
            .from('commissions')
            .delete()
            .eq('loading_id', loadingId);

        if (error) throw error;
    }
};
