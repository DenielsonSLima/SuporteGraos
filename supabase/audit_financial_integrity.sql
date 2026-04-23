-- SQL AUDIT SCRIPT: Financial Integrity
-- This script detects discrepancies between table balances and the transaction ledger.

-- 1. Discrepancies in Purchase Order Paid Values
-- Compares 'paid_value' column with the sum of linked transactions
SELECT 
    po.id, 
    po.number, 
    po.paid_value as table_balance,
    COALESCE(SUM(ft.amount), 0) as ledger_sum,
    po.paid_value - COALESCE(SUM(ft.amount), 0) as diff
FROM 
    public.ops_purchase_orders po
LEFT JOIN 
    public.financial_links fl ON fl.purchase_order_id = po.id
LEFT JOIN 
    public.financial_transactions ft ON ft.id = fl.transaction_id
GROUP BY 
    po.id, po.number, po.paid_value
HAVING 
    ABS(po.paid_value - COALESCE(SUM(ft.amount), 0)) > 0.01;

-- 2. Discrepancies in Financial Entries
-- Compares 'paid_amount' column with its transactions
SELECT 
    fe.id, 
    fe.description, 
    fe.paid_amount as table_balance,
    COALESCE(SUM(ft.amount), 0) as ledger_sum,
    fe.paid_amount - COALESCE(SUM(ft.amount), 0) as diff
FROM 
    public.financial_entries fe
LEFT JOIN 
    public.financial_transactions ft ON ft.entry_id = fe.id
GROUP BY 
    fe.id, fe.description, fe.paid_amount
HAVING 
    ABS(fe.paid_amount - COALESCE(SUM(ft.amount), 0)) > 0.01;

-- 3. Orphan Financial Links
-- Links that point to non-existent transactions
SELECT * FROM public.financial_links fl
WHERE NOT EXISTS (SELECT 1 FROM public.financial_transactions ft WHERE ft.id = fl.transaction_id);
