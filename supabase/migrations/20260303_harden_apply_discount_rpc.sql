-- ============================================================================
-- Migration: Harden apply_discount_financial_entry
-- Data: 2026-03-03
-- ============================================================================
-- CORRIGE:
--   apply_discount_financial_entry é SECURITY DEFINER mas NÃO valida auth.uid()
--   nem company_id do caller. Um usuário autenticado poderia chamar a RPC com
--   qualquer p_entry_id e aplicar desconto em entry de OUTRA empresa.
--
-- FIX: Adiciona validação:
--   1. auth.uid() IS NOT NULL (sessão ativa)
--   2. A entry pertence à mesma company_id do caller (via my_company_id())
-- ============================================================================

CREATE OR REPLACE FUNCTION public.apply_discount_financial_entry(
  p_entry_id UUID,
  p_amount   NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_company UUID;
  v_entry          RECORD;
BEGIN
  -- ═══════════════════════════════════════════════════════════════════
  -- GATE 1: Sessão ativa
  -- ═══════════════════════════════════════════════════════════════════
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- ═══════════════════════════════════════════════════════════════════
  -- GATE 2: Resolver company_id do caller
  -- ═══════════════════════════════════════════════════════════════════
  SELECT company_id INTO v_caller_company
  FROM public.app_users
  WHERE auth_user_id = (SELECT auth.uid())
    AND active = true
  LIMIT 1;

  IF v_caller_company IS NULL THEN
    RAISE EXCEPTION 'Usuário não vinculado a nenhuma empresa ativa';
  END IF;

  -- ═══════════════════════════════════════════════════════════════════
  -- Validação: desconto positivo
  -- ═══════════════════════════════════════════════════════════════════
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Desconto deve ser maior que zero';
  END IF;

  -- ═══════════════════════════════════════════════════════════════════
  -- GATE 3: A entry deve existir E pertencer à empresa do caller
  -- ═══════════════════════════════════════════════════════════════════
  SELECT id, total_amount, paid_amount, company_id
  INTO v_entry
  FROM public.financial_entries
  WHERE id = p_entry_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lançamento financeiro não encontrado: %', p_entry_id;
  END IF;

  IF v_entry.company_id <> v_caller_company THEN
    RAISE EXCEPTION 'Acesso negado: entry não pertence à sua empresa';
  END IF;

  -- ═══════════════════════════════════════════════════════════════════
  -- Aplicar desconto
  -- ═══════════════════════════════════════════════════════════════════
  UPDATE public.financial_entries
  SET total_amount = GREATEST(total_amount - p_amount, 0),
      status = CASE
        WHEN paid_amount >= GREATEST(total_amount - p_amount, 0) AND paid_amount > 0 THEN 'paid'
        WHEN paid_amount > 0 THEN 'partially_paid'
        ELSE status
      END,
      updated_at = now()
  WHERE id = p_entry_id;
END;
$$;

-- GRANT para usuários autenticados (já existia, reforça)
GRANT EXECUTE ON FUNCTION public.apply_discount_financial_entry(UUID, NUMERIC) TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO
-- ════════════════════════════════════════════════════════════════════════════
SELECT 'MIGRATION_20260303_HARDEN_APPLY_DISCOUNT_OK' AS status;
