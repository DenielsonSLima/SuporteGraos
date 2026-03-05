/**
 * ============================================================================
 * LOADING MAPPER — Mapeamento Loading ↔ Supabase
 * ============================================================================
 * 
 * Converte objetos Loading entre formato do app (camelCase) e banco (snake_case).
 */

import { Loading } from '../../modules/Loadings/types';
import { authService } from '../authService';
import { getTodayBR } from '../../utils/dateUtils';

// ============================================================================
// HELPERS
// ============================================================================

export const generateUUID = (): string => {
  if (typeof self !== 'undefined' && self.crypto && self.crypto.randomUUID) {
    return self.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// ============================================================================
// APP → SUPABASE (camelCase → snake_case)
// ============================================================================

export const mapLoadingToDb = (l: Loading) => ({
  id: l.id,
  date: l.date,
  invoice_number: l.invoiceNumber || null,
  purchase_order_id: l.purchaseOrderId || null,
  purchase_order_number: l.purchaseOrderNumber || null,
  supplier_name: l.supplierName || null,
  carrier_id: l.carrierId || null,
  carrier_name: l.carrierName || null,
  driver_id: l.driverId || null,
  driver_name: l.driverName || null,
  vehicle_id: null,
  vehicle_plate: l.vehiclePlate,
  is_client_transport: !!l.isClientTransport,
  product: l.product,
  weight_kg: l.weightKg,
  weight_sc: l.weightSc || null,
  unload_weight_kg: l.unloadWeightKg || null,
  breakage_kg: l.breakageKg || null,
  purchase_price_per_sc: l.purchasePricePerSc || null,
  total_purchase_value: l.totalPurchaseValue || null,
  product_paid: l.productPaid || 0,
  freight_price_per_ton: l.freightPricePerTon || null,
  total_freight_value: l.totalFreightValue || null,
  freight_advances: l.freightAdvances || 0,
  freight_paid: l.freightPaid || 0,
  notes: l.notes || null,
  sales_order_id: l.salesOrderId || null,
  sales_order_number: l.salesOrderNumber || null,
  customer_name: l.customerName || null,
  sales_price: l.salesPrice || null,
  total_sales_value: l.totalSalesValue || null,
  status: l.status,
  is_redirected: !!l.isRedirected,
  original_destination: l.originalDestination || null,
  redirect_displacement_value: l.redirectDisplacementValue || null,
  freight_base: l.freightBase || 'Origem',
  metadata: l,
  company_id: l.companyId || authService.getCurrentUser()?.companyId || null
});

// ============================================================================
// SUPABASE → APP (snake_case → camelCase)
// ============================================================================

export const mapLoadingFromDb = (row: any): Loading => {
  const meta: Loading | undefined = row?.metadata;
  const base: Loading = meta ? { ...meta } : {
    id: row.id,
    date: row.date || getTodayBR(),
    invoiceNumber: row?.invoice_number || undefined,
    purchaseOrderId: row?.purchase_order_id || '',
    purchaseOrderNumber: row?.purchase_order_number || '',
    supplierName: row?.supplier_name || '',
    carrierId: row?.carrier_id || '',
    carrierName: row?.carrier_name || '',
    driverId: row?.driver_id || '',
    driverName: row?.driver_name || '',
    vehiclePlate: row?.vehicle_plate || '',
    isClientTransport: !!row?.is_client_transport,
    product: row?.product || '',
    weightKg: Number(row?.weight_kg) || 0,
    weightTon: Number(row?.weight_ton) || Number(row?.weight_kg || 0) / 1000,
    weightSc: Number(row?.weight_sc) || 0,
    unloadWeightKg: Number(row?.unload_weight_kg) || undefined,
    breakageKg: Number(row?.breakage_kg) || undefined,
    purchasePricePerSc: Number(row?.purchase_price_per_sc) || 0,
    totalPurchaseValue: Number(row?.total_purchase_value) || 0,
    productPaid: Number(row?.product_paid) || 0,
    freightPricePerTon: Number(row?.freight_price_per_ton) || 0,
    totalFreightValue: Number(row?.total_freight_value) || 0,
    freightAdvances: Number(row?.freight_advances) || 0,
    freightPaid: Number(row?.freight_paid) || 0,
    notes: row?.notes || undefined,
    salesOrderId: row?.sales_order_id || '',
    salesOrderNumber: row?.sales_order_number || '',
    customerName: row?.customer_name || '',
    salesPrice: Number(row?.sales_price) || 0,
    totalSalesValue: Number(row?.total_sales_value) || 0,
    status: (row?.status || 'in_transit'),
    isRedirected: !!row?.is_redirected,
    originalDestination: row?.original_destination || undefined,
    redirectDisplacementValue: Number(row?.redirect_displacement_value) || undefined,
    freightBase: (row?.freight_base || 'Origem') as 'Origem' | 'Destino',
    extraExpenses: [],
    transactions: []
  } as Loading;

  return {
    ...base,
    id: row?.id ?? base.id,
    date: row?.date ?? base.date,
    status: row?.status ?? base.status,
    companyId: row?.company_id || undefined
  };
};
