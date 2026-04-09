import { SalesOrder, SalesStatus } from '../../modules/SalesOrder/types';
import { getTodayBR } from '../../utils/dateUtils';
import { authService } from '../authService';

/** Shape de uma row da tabela sales_orders (legado) */
export interface SalesOrderDbRow {
  id: string;
  number: string;
  order_date?: string;
  status?: string;
  customer_id?: string;
  customer_name?: string;
  total_value?: number;
  received_value?: number;
  notes?: string;
  metadata?: SalesOrder;
  company_id?: string;
  created_at?: string;
}

/** Shape de uma row da VIEW vw_sales_orders_enriched (canônico) */
export interface SalesOrderOpsRow {
  id?: string;
  legacy_id?: string;
  number?: string;
  order_date?: string;
  status?: string;
  customer_id?: string;
  customer_name?: string;
  customer_nickname?: string;
  total_value?: number;
  received_value?: number;
  delivered_qty_sc?: number;
  delivered_value?: number;
  load_count?: number;
  transit_count?: number;
  transit_value?: number;
  paid_value?: number;
  balance_value?: number;
  discount_value?: number;
  total_grain_cost?: number;
  total_freight_cost?: number;
  gross_profit?: number;
  margin_percent?: number;
  total_weight_kg_orig?: number;
  total_weight_kg_dest?: number;
  notes?: string;
  metadata?: SalesOrder;
}

export type DbStatus = 'pending' | 'approved' | 'shipped' | 'delivered' | 'cancelled' | 'draft';

export const statusToDb = (status: SalesStatus): DbStatus => {
  switch (status) {
    case 'approved':
      return 'approved';
    case 'completed':
      return 'delivered';
    case 'canceled':
      return 'cancelled';
    case 'pending':
    case 'draft':
      return 'draft';
    default:
      return 'pending';
  }
};

export const statusFromDb = (status?: string): SalesStatus => {
  switch (status) {
    case 'approved':
      return 'approved';
    case 'delivered':
      return 'completed';
    case 'cancelled':
      return 'canceled';
    case 'shipped':
      return 'approved';
    case 'draft':
      return 'draft';
    case 'pending':
    default:
      return 'pending';
  }
};

export const mapOrderToDb = (order: SalesOrder) => ({
  id: order.id,
  number: order.number,
  customer_id: order.customerId || null,
  order_date: order.date,
  status: statusToDb(order.status),
  total_value: order.totalValue ?? 0,
  customer_name: order.customerName,
  notes: order.notes || null,
  metadata: order,
  company_id: authService.getCurrentUser()?.companyId || null
});

export const mapOrderFromDb = (row: SalesOrderDbRow): SalesOrder => {
  const meta: SalesOrder | undefined = row?.metadata;
  const base = {
    id: row.id,
    number: row.number,
    date: row.order_date || getTodayBR(),
    status: statusFromDb(row?.status),
    consultantName: '',
    customerId: row?.customer_id || '',
    productName: '',
    quantity: undefined,
    unitPrice: undefined,
    totalValue: row?.total_value || 0,
    transactions: [],
    paidValue: 0,
    loadings: [],
    notes: ''
  } as SalesOrder;

  return {
    ...base,
    ...meta,
    id: row.id,
    number: row.number,
    date: row.order_date || base.date,
    customerId: row.customer_id || base.customerId,
    customerName: row?.customer_name ?? meta?.customerName ?? base.customerName ?? 'Cliente Não Informado',
    status: statusFromDb(row.status),
    totalValue: row.total_value ?? base.totalValue,
    notes: row.notes || base.notes
  };
};

export const mapOrderFromOpsRow = (row: SalesOrderOpsRow): SalesOrder => {
  const meta: SalesOrder | undefined = row.metadata;
  const legacyId = row.legacy_id || row.id || '';

  return {
    ...meta,
    id: legacyId,
    number: row.number || meta?.number || '000',
    date: row.order_date || meta?.date || getTodayBR(),
    status: statusFromDb(row.status),
    customerId: row.customer_id || meta?.customerId || '',
    customerName: row.customer_name || meta?.customerName || 'Cliente',
    customerNickname: row.customer_nickname || meta?.customerNickname || '',
    totalValue: Number(row.total_value ?? meta?.totalValue ?? 0),
    paidValue: Number(row.received_value ?? meta?.paidValue ?? 0),
    notes: row.notes || meta?.notes || '',
    
    // Virtual Enrichment (do VIEW)
    deliveredValue: Number(row.delivered_value ?? 0),
    deliveredQtySc: Number(row.delivered_qty_sc ?? 0),
    loadCount: Number(row.load_count ?? 0),
    balanceValue: Number(row.balance_value ?? 0),
    transitValue: Number(row.transit_value ?? 0),
    totalGrainCost: Number(row.total_grain_cost ?? 0),
    totalFreightCost: Number(row.total_freight_cost ?? 0),
    grossProfit: Number(row.gross_profit ?? 0),
    marginPercent: Number(row.margin_percent ?? 0)
  } as SalesOrder;
};
