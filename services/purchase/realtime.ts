import { supabase } from '../supabase';
import { isSqlCanonicalOpsEnabled } from '../sqlCanonicalOps';
import { PurchaseOrder } from '../../modules/PurchaseOrder/types';
import { mapOrderFromDb, mapOrderFromOpsRow } from './mappers';
import { db } from './store';
import { queryClient } from '../../lib/queryClient';
import { QUERY_KEYS } from '../../hooks/queryKeys';

let currentChannel: any = null;
let activeChannels: any[] = [];

export const subscribeToUpdates = (callback: (order: PurchaseOrder, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void) => {
  const channelName = `purchase_orders_${Date.now()}`;
  const isCanonical = isSqlCanonicalOpsEnabled();
  const tableName = isCanonical ? 'ops_purchase_orders' : 'purchase_orders';
  const channel = supabase.channel(channelName);

  channel
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: tableName
      },
      (payload: any) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const newData = payload.new;
          if (newData) {
            const order = isCanonical ? mapOrderFromOpsRow(newData) : mapOrderFromDb(newData);
            callback(order, payload.eventType);
          }
        } else if (payload.eventType === 'DELETE') {
          callback({ id: payload.old.id } as PurchaseOrder, 'DELETE');
        }
      }
    )
    .subscribe();

  return channel;
};

export const stopRealtime = () => {
  activeChannels.forEach(channel => {
    supabase.removeChannel(channel);
  });
  activeChannels = [];
  currentChannel = null;
};

export const startRealtime = async (companyId?: string) => {
  if (!companyId) return;
  if (currentChannel) return;

  // 1. Subscribe to Purchase Orders
  const orderChannel = subscribeToUpdates((order, type) => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PURCHASE_ORDERS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_TRANSACTIONS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TOTAL_BALANCE });
    queryClient.invalidateQueries({ queryKey: ['totals'] });
    
    if (type === 'DELETE') {
      db.delete(order.id);
    } else {
      const existing = db.getById(order.id);
      if (existing) {
        db.update(order);
      } else {
        db.add(order);
      }
    }
  });

  // 2. Subscribe to Financial Links (Payments/Expenses)
  const linkChannel = supabase.channel(`purchase_links_${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'financial_links'
      },
      (payload) => {
        // Invalidate all purchase-related queries when a link (payment/expense) changes
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PURCHASE_ORDERS });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_TRANSACTIONS });
        queryClient.invalidateQueries({ queryKey: ['purchase_order_transactions'] });
        queryClient.invalidateQueries({ queryKey: ['totals'] });
        
        // Se tivermos o ID do pedido no payload, invalidar especificamente ele
        if (payload.new && (payload.new as any).purchase_order_id) {
           queryClient.invalidateQueries({ 
             queryKey: ['purchase_order_transactions', (payload.new as any).purchase_order_id] 
           });
        }
      }
    )
    .subscribe();

  activeChannels.push(orderChannel, linkChannel);
  currentChannel = orderChannel; // Keep track of at least one to signal we are "active"

  // 2. Subscribe to Purchase Expenses (New)
  const expensesChannel = supabase
    .channel('purchase_expenses_realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'purchase_expenses' },
      async (payload: any) => {
        const orderId = payload.new?.purchase_order_id || payload.old?.purchase_order_id;
        if (orderId) {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PURCHASE_ORDERS });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_TRANSACTIONS });
          queryClient.invalidateQueries({ queryKey: ['totals'] });

          const existing = db.getById(orderId);
          if (existing) {
            const { loadFromSupabase: reloadOrder } = await import('./loader');
            await reloadOrder(companyId);
          }
        }
      }
    )
    .subscribe();

  activeChannels.push(expensesChannel);
};
