import { supabase } from './supabase';

export interface SalesHistoryRow {
  date: string;
  number: string;
  customerName: string;
  productName: string;
  quantity: number;
  deliveredQtySc: number;
  totalValue: number;
  realizedValue: number;
}

export interface PurchaseHistoryRow {
  date: string;
  number: string;
  partnerName: string;
  productName: string;
  volumeSc: number;
  totalValue: number;
}

export const reportsService = {
  /**
   * Busca histórico de vendas filtrado no servidor.
   */
  getSalesHistory: async (
    companyId: string,
    startDate?: string,
    endDate?: string
  ): Promise<SalesHistoryRow[]> => {
    const { data, error } = await supabase.rpc('rpc_report_sales_history', {
      p_company_id: companyId,
      p_start_date: startDate || null,
      p_end_date: endDate || null
    });

    if (error) throw error;
    
    // Mapear snake_case para camelCase
    return (data || []).map((row: any) => ({
      date: row.date,
      number: row.number,
      customerName: row.customer_name,
      productName: row.product_name,
      quantity: row.quantity,
      deliveredQtySc: row.delivered_qty_sc,
      totalValue: row.total_value,
      realizedValue: row.realized_value
    }));
  },

  /**
   * Busca histórico de compras filtrado no servidor.
   */
  getPurchasesHistory: async (
    companyId: string,
    params: {
      startDate?: string;
      endDate?: string;
      partnerId?: string;
      productName?: string;
    }
  ): Promise<PurchaseHistoryRow[]> => {
    const { data, error } = await supabase.rpc('rpc_report_purchases_history', {
      p_company_id: companyId,
      p_start_date: params.startDate || null,
      p_end_date: params.endDate || null,
      p_partner_id: params.partnerId || null,
      p_product_name: params.productName || null
    });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      date: row.date,
      number: row.number,
      partnerName: row.partner_name,
      productName: row.product_name,
      volumeSc: row.volume_sc,
      totalValue: row.total_value
    }));
  }
};
