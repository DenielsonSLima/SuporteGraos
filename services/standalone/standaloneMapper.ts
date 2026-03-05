/**
 * ============================================================================
 * STANDALONE MAPPER — Mapeamento admin_expenses ↔ FinancialRecord
 * ============================================================================
 * 
 * Extraído de standaloneRecordsService.ts para isolar a lógica de mapeamento.
 * Converte entre snake_case (Supabase) e camelCase (App).
 */

import { FinancialRecord } from '../../modules/Financial/types';
import { authService } from '../authService';

/**
 * Converte registro do Supabase (snake_case) para o formato do app (camelCase)
 */
export const fromSupabase = (record: any): FinancialRecord => ({
  id: record.id,
  description: record.description,
  entityName: record.entity_name,
  driverName: record.driver_name,
  category: record.category,
  dueDate: record.due_date || record.issue_date || new Date().toISOString().slice(0, 10),
  issueDate: record.issue_date || record.due_date || new Date().toISOString().slice(0, 10),
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
  weightSc: record.weight_sc ? parseFloat(record.weight_sc) : undefined,
  weightKg: record.weight_kg ? parseFloat(record.weight_kg) : undefined,
  unitPriceTon: record.unit_price_ton ? parseFloat(record.unit_price_ton) : undefined,
  unitPriceSc: record.unit_price_sc ? parseFloat(record.unit_price_sc) : undefined,
  loadCount: record.load_count,
  totalTon: record.total_ton ? parseFloat(record.total_ton) : undefined,
  totalSc: record.total_sc ? parseFloat(record.total_sc) : undefined,
  companyId: record.company_id,
});

/**
 * Converte registro do app (camelCase) para o formato do Supabase (snake_case)
 */
export const toSupabase = (record: FinancialRecord): any => ({
  id: record.id,
  description: record.description,
  entity_name: record.entityName,
  driver_name: record.driverName,
  category: record.category,
  due_date: record.dueDate,
  issue_date: record.issueDate,
  settlement_date: record.settlementDate,
  original_value: record.originalValue,
  paid_value: record.paidValue || 0,
  discount_value: record.discountValue || 0,
  status: record.status,
  sub_type: record.subType,
  bank_account: record.bankAccount,
  notes: record.notes,
  asset_id: record.assetId,
  is_asset_receipt: record.isAssetReceipt,
  asset_name: record.assetName,
  weight_sc: record.weightSc,
  weight_kg: record.weightKg,
  unit_price_ton: record.unitPriceTon,
  unit_price_sc: record.unitPriceSc,
  load_count: record.loadCount ? parseFloat(String(record.loadCount)) : undefined,
  total_ton: record.totalTon,
  total_sc: record.totalSc,
  company_id: record.companyId || authService.getCurrentUser()?.companyId,
});

export const STANDALONE_SELECT_FIELDS = [
  'id',
  'description',
  'entity_name',
  'driver_name',
  'category',
  'due_date',
  'issue_date',
  'settlement_date',
  'original_value',
  'paid_value',
  'discount_value',
  'status',
  'sub_type',
  'bank_account',
  'notes',
  'asset_id',
  'is_asset_receipt',
  'asset_name',
  'weight_sc',
  'weight_kg',
  'unit_price_ton',
  'unit_price_sc',
  'load_count',
  'total_ton',
  'total_sc',
  'company_id'
].join(',');
