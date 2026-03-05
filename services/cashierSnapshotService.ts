import { supabase } from './supabase';

export interface CashierSnapshotChangePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: any;
  old: any;
}

export const cashierSnapshotService = {
  list: async (): Promise<any[]> => {
    const { data, error } = await supabase
      .from('cashier_monthly_snapshots')
      .select('*')
      .order('closed_date', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  },

  upsert: async (payload: any): Promise<void> => {
    const { error } = await supabase
      .from('cashier_monthly_snapshots')
      .upsert(payload)
      .select();

    if (error) {
      throw error;
    }
  },

  deleteById: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('cashier_monthly_snapshots')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  },

  subscribe: (onChange: (payload: CashierSnapshotChangePayload) => void): (() => void) => {
    const channel = supabase
      .channel('realtime:cashier_monthly_snapshots')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cashier_monthly_snapshots' },
        (payload) => {
          onChange(payload as CashierSnapshotChangePayload);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }
};
