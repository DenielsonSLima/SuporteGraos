import { PurchaseOrder, OrderStatus } from '../../modules/PurchaseOrder/types';
import { authService } from '../authService';
import { getTodayBR } from '../../utils/dateUtils';

export type DbStatus = 'pending' | 'approved' | 'received' | 'cancelled';

export const statusToDb = (status: OrderStatus): DbStatus => {
  switch (status) {
    case 'approved':
    case 'pending':
    case 'draft':
      return 'pending';
    case 'transport':
      return 'approved';
    case 'completed':
      return 'received';
    case 'canceled':
      return 'cancelled';
    default:
      return 'pending';
  }
};

export const statusFromDb = (status?: string): OrderStatus => {
  switch (status) {
    case 'approved':
      return 'approved';
    case 'received':
      return 'completed';
    case 'cancelled':
    case 'canceled':
      return 'canceled';
    case 'pending':
    default:
      return 'pending';
  }
};

export const mapOrderToDb = (order: PurchaseOrder) => ({
  id: order.id,
  number: order.number,
  partner_id: order.partnerId || null,
  date: order.date,
  status: statusToDb(order.status),
  total_value: order.totalValue ?? 0,
  received_value: order.paidValue ?? 0,
  partner_name: order.partnerName,
  notes: order.notes || null,
  metadata: order,
  company_id: authService.getCurrentUser()?.companyId || null
});

export const mapOrderFromDb = (row: any): PurchaseOrder => {
  const meta: PurchaseOrder | undefined = row?.metadata;
  const base = {
    id: row.id,
    number: row.number,
    date: row.date || getTodayBR(),
    status: statusFromDb(row?.status),
    consultantName: '',
    partnerId: row?.partner_id || '',
    useRegisteredLocation: false,
    loadingCity: '',
    loadingState: '',
    harvest: '',
    hasBroker: false,
    items: [],
    transactions: [],
    totalValue: row?.total_value || 0,
    paidValue: row?.received_value || 0,
    transportValue: 0
  } as PurchaseOrder;

  if (meta && (!meta.loadingCity || !meta.loadingState)) {
    base.loadingCity = meta.partnerCity || '';
    base.loadingState = meta.partnerState || '';
    if (meta.useRegisteredLocation === undefined) {
      base.useRegisteredLocation = true;
    }
  }

  return {
    ...base,
    ...meta,
    id: row.id,
    number: row.number,
    date: row.date || base.date,
    partnerId: row.partner_id || base.partnerId,
    status: statusFromDb(row.status),
    totalValue: row.total_value ?? base.totalValue,
    partnerName: row?.partner_name ?? meta.partnerName ?? base.partnerName ?? 'Parceiro Não Informado',
    paidValue: Number(row?.received_value ?? base.paidValue ?? 0),
    notes: row.notes || base.notes
  };
};

export const mapOrderFromOpsRow = (row: any): PurchaseOrder => {
  const meta: PurchaseOrder | undefined = row?.metadata;

  return {
    id: row?.legacy_id ?? row?.id ?? meta?.id ?? '',
    number: row?.number ?? meta?.number ?? '',
    date: row?.order_date ?? meta?.date ?? getTodayBR(),
    status: statusFromDb(row?.status) ?? (meta?.status as OrderStatus),
    consultantName: meta?.consultantName ?? '',
    partnerId: row?.partner_id ?? meta?.partnerId ?? '',
    partnerName: row?.partner_name ?? meta?.partnerName ?? 'Parceiro Não Informado',
    partnerNickname: row?.partner_nickname ?? meta?.partnerNickname,
    partnerDocument: meta?.partnerDocument ?? '',
    partnerCity: meta?.partnerCity ?? '',
    partnerState: meta?.partnerState ?? '',
    useRegisteredLocation: meta?.useRegisteredLocation ?? false,
    loadingCity: meta?.loadingCity ?? '',
    loadingState: meta?.loadingState ?? '',
    loadingComplement: meta?.loadingComplement,
    harvest: meta?.harvest ?? '',
    hasBroker: meta?.hasBroker ?? false,
    brokerId: meta?.brokerId,
    brokerName: meta?.brokerName,
    brokerCommissionPerSc: Number(row?.broker_commission_per_sc ?? meta?.brokerCommissionPerSc ?? 0),
    deductBrokerCommission: meta?.deductBrokerCommission,
    brokerPaidValue: Number(row?.broker_paid_value ?? 0),
    brokerBalanceValue: Number(row?.broker_balance_value ?? 0),
    items: meta?.items ?? [],
    transactions: meta?.transactions ?? [],
    totalValue: Number(row?.total_value ?? 0),
    paidValue: Number(row?.paid_value ?? 0),
    balanceValue: Number(row?.balance_value ?? 0),
    discountValue: Number(row?.discount_value ?? 0),
    transportValue: Number(row?.transport_value ?? meta?.transportValue ?? 0),
    totalPurchaseValCalc: Number(row?.total_purchase_val_calc ?? 0),
    totalFreightValCalc: Number(row?.total_freight_val_calc ?? 0),
    totalSalesValCalc: Number(row?.total_sales_val_calc ?? 0),
    totalKg: Number(row?.total_kg ?? 0),
    totalSc: Number(row?.total_sc ?? 0),
    notes: row.notes || meta?.notes,
    notesList: meta?.notesList,
  };
};
