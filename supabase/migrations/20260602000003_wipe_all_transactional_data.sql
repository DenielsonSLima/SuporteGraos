-- Migration: Wipe all transactional data to start with a clean slate
-- Target schema: public

-- 1. Truncate transaction tables
TRUNCATE TABLE 
  public.ops_loading_freight_components,
  public.ops_loadings,
  public.ops_purchase_order_expenses,
  public.ops_purchase_order_commissions,
  public.ops_purchase_order_items,
  public.ops_purchase_orders,
  public.ops_sales_order_unloads,
  public.ops_sales_orders,
  public.initial_balances,
  public.loan_installments,
  public.loans,
  public.advances,
  public.admin_expenses,
  public.financial_links,
  public.financial_transactions,
  public.financial_entries,
  public.transfers,
  public.shareholder_transactions,
  public.shareholder_operations,
  public.assets,
  public.audit_logs,
  public.report_access_logs,
  public.credit_lines;

-- 2. Reset balances in parent tables
UPDATE public.accounts SET balance = 0;
UPDATE public.shareholders SET current_balance = 0;
