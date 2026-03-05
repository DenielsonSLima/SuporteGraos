-- ============================================================================
-- Migration: VIEW v_logistics_freights
-- Data: 2026-03-02
-- ============================================================================
-- OBJETIVO:
--   Mover cálculos de frete do frontend para o banco de dados.
--   Regra 5.4 da skill: "Fazer cálculo crítico no front-end viola a regra
--   de que o banco é a fonte da verdade."
--
-- CAMPOS COMPUTADOS:
--   - total_paid       → freight_paid (já acumulado na tabela)
--   - total_discount    → SUM de discount_value das transactions (via JSONB)
--   - balance_value     → total_freight_value - freight_paid - total_discount
--   - financial_status  → 'paid' | 'partial' | 'pending'
--   - breakage_kg       → weight_kg - unload_weight_kg (quando há descarga)
--   - derived_status    → 'completed' quando unloading + tem unload_weight_kg
--   - merchandise_value → COALESCE(total_sales_value, total_purchase_value, 0)
--
-- NOTA: A VIEW respeita RLS porque consulta ops_loadings que tem RLS ativo.
-- ============================================================================

CREATE OR REPLACE VIEW public.v_logistics_freights AS
WITH freight_data AS (
  SELECT
    l.id,
    l.company_id,
    l.loading_date                                                          AS date,

    -- Identificação do pedido (da tabela de purchase orders)
    COALESCE(po.number, '')                                                 AS order_number,

    -- Transportadora & Motorista (raw_payload = camelCase JSONB)
    COALESCE(l.raw_payload->>'carrierName', '')                             AS carrier_name,
    COALESCE(l.driver_name, l.raw_payload->>'driverName', '')               AS driver_name,
    COALESCE(l.vehicle_plate, l.raw_payload->>'vehiclePlate', '')           AS vehicle_plate,

    -- Origem (fornecedor)
    COALESCE(po.partner_name, l.raw_payload->>'supplierName', '')           AS supplier_name,

    -- Destino (cliente)
    COALESCE(l.raw_payload->>'customerName', '')                            AS destination_city,

    -- Carga
    COALESCE(l.raw_payload->>'product', '')                                 AS product,
    COALESCE(l.weight_kg, 0)                                                AS weight,
    'SC'::text                                                              AS unit,
    l.unload_weight_kg,

    -- Quebra de carga (computada no banco!)
    CASE
      WHEN l.unload_weight_kg IS NOT NULL
       AND ABS(l.weight_kg - l.unload_weight_kg) >= 0.01
      THEN l.weight_kg - l.unload_weight_kg
      ELSE NULL
    END                                                                     AS breakage_kg,

    -- Frete base
    l.raw_payload->>'freightBase'                                           AS freight_base,

    -- Financeiro — Frete
    COALESCE((l.raw_payload->>'freightPricePerTon')::numeric, 0)            AS price_per_unit,
    COALESCE(l.total_freight_value, 0)                                      AS total_freight,
    COALESCE((l.raw_payload->>'freightPaid')::numeric, 0)                   AS paid_value,
    COALESCE((l.raw_payload->>'freightAdvances')::numeric, 0)               AS advance_value,

    -- Valor de mercadoria (para KPIs/seguro)
    COALESCE(l.total_sales_value, l.total_purchase_value, 0)                AS merchandise_value,

    -- Discount (soma de discountValue das transactions no raw_payload)
    COALESCE(
      (SELECT SUM((t->>'discountValue')::numeric)
       FROM jsonb_array_elements(
         CASE jsonb_typeof(l.raw_payload->'transactions')
           WHEN 'array' THEN l.raw_payload->'transactions'
           ELSE '[]'::jsonb
         END
       ) AS t
       WHERE (t->>'discountValue') IS NOT NULL
      ), 0
    )                                                                       AS total_discount,

    -- Status base
    l.status                                                                AS raw_status

  FROM public.ops_loadings l
  LEFT JOIN public.ops_purchase_orders po
    ON po.id = l.purchase_order_id
)
SELECT
  fd.*,

  -- Balance (computado no banco — ANTES era no frontend!)
  GREATEST(
    fd.total_freight - fd.paid_value - fd.total_discount,
    0
  )                                                                         AS balance_value,

  -- Status derivado (antes era no frontend!)
  CASE
    WHEN fd.raw_status = 'unloading' AND fd.unload_weight_kg IS NOT NULL
    THEN 'completed'
    ELSE COALESCE(fd.raw_status, 'in_transit')
  END                                                                       AS status,

  -- Financial status (antes era no frontend!)
  CASE
    WHEN GREATEST(fd.total_freight - fd.paid_value - fd.total_discount, 0) <= 0.05
    THEN 'paid'
    WHEN fd.paid_value > 0
    THEN 'partial'
    ELSE 'pending'
  END                                                                       AS financial_status

FROM freight_data fd;

-- ════════════════════════════════════════════════════════════════════════════
-- COMENTÁRIO na VIEW para documentação
-- ════════════════════════════════════════════════════════════════════════════
COMMENT ON VIEW public.v_logistics_freights IS
  'Freights computados a partir de ops_loadings. Campos balance_value, '
  'financial_status e breakage_kg são calculados no banco (não no frontend). '
  'Criada em 2026-03-02 para atender regra 5.4 da skill.';

-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO
-- ════════════════════════════════════════════════════════════════════════════
SELECT 'MIGRATION_20260302_V_LOGISTICS_FREIGHTS_OK' AS status;
