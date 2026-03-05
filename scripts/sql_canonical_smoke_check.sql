-- ============================================================================
-- SQL Canonical Ops - Smoke Check
-- Objetivo: validar rapidamente saúde do rollout SQL-first em produção/homolog
-- Uso: psql -P pager=off "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/sql_canonical_smoke_check.sql
-- ============================================================================

\echo '=== [1/4] RPCs canônicas e grants ==='
SELECT
  proname,
  has_function_privilege('authenticated', oid, 'EXECUTE') AS can_exec
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname LIKE 'rpc_ops_%'
ORDER BY proname;

\echo '=== [2/4] Volumetria canônica ==='
SELECT
  (SELECT count(*) FROM public.ops_purchase_orders) AS ops_purchase_orders,
  (SELECT count(*) FROM public.ops_loadings) AS ops_loadings,
  (SELECT count(*) FROM public.ops_sales_orders) AS ops_sales_orders;

\echo '=== [3/4] Volumetria financeira com origem canônica ==='
SELECT count(*) AS financial_entries_canonical_origin
FROM public.financial_entries fe
WHERE COALESCE(
  row_to_json(fe)->>'origin_type',
  row_to_json(fe)->>'origin_module'
) IN ('purchase_order', 'sales_order', 'freight');

\echo '=== [4/4] Órfãos financeiros (esperado: 0/0/0) ==='
WITH purchase_orphans AS (
  SELECT count(*) AS c
  FROM public.financial_entries fe
  LEFT JOIN public.ops_purchase_orders o
    ON o.company_id = fe.company_id
   AND COALESCE(o.legacy_id::text, o.id::text) = fe.origin_id::text
  WHERE fe.type = 'payable'
    AND COALESCE(row_to_json(fe)->>'origin_type', row_to_json(fe)->>'origin_module') = 'purchase_order'
    AND o.id IS NULL
),
sales_orphans AS (
  SELECT count(*) AS c
  FROM public.financial_entries fe
  LEFT JOIN public.ops_sales_orders o
    ON o.company_id = fe.company_id
   AND COALESCE(o.legacy_id::text, o.id::text) = fe.origin_id::text
  WHERE fe.type = 'receivable'
    AND COALESCE(row_to_json(fe)->>'origin_type', row_to_json(fe)->>'origin_module') = 'sales_order'
    AND o.id IS NULL
),
freight_orphans AS (
  SELECT count(*) AS c
  FROM public.financial_entries fe
  LEFT JOIN public.ops_loadings o
    ON o.company_id = fe.company_id
   AND COALESCE(o.legacy_id::text, o.id::text) = fe.origin_id::text
  WHERE fe.type = 'payable'
    AND COALESCE(row_to_json(fe)->>'origin_type', row_to_json(fe)->>'origin_module') = 'freight'
    AND o.id IS NULL
)
SELECT
  (SELECT c FROM purchase_orphans) AS purchase_orphans,
  (SELECT c FROM sales_orphans) AS sales_orphans,
  (SELECT c FROM freight_orphans) AS freight_orphans;
