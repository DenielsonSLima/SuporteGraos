-- ============================================================================
-- 📊 MIGRATION: Atomic Partner Address Upsert
-- Data: 2026-04-09
-- Objetivo: Consolidar a resolução de localidade e salvamento de endereço em uma RPC.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_upsert_partner_primary_address(
  p_partner_id UUID,
  p_cep TEXT,
  p_street TEXT,
  p_number TEXT,
  p_neighborhood TEXT,
  p_complement TEXT,
  p_city_name TEXT,
  p_state_uf TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_state_id UUID;
  v_city_id UUID;
  v_address_id UUID;
BEGIN
  -- 1. Obter Empresa do contexto
  v_company_id := public.my_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não vinculado a uma empresa.';
  END IF;

  -- 2. Resolver Estado (UF)
  SELECT id INTO v_state_id 
  FROM public.states 
  WHERE upper(uf) = upper(p_state_uf);

  IF v_state_id IS NULL THEN
    RAISE EXCEPTION 'Estado (UF) "%" não encontrado.', p_state_uf;
  END IF;

  -- 3. Resolver ou Criar Cidade (Case Insensitive)
  SELECT id INTO v_city_id 
  FROM public.cities 
  WHERE state_id = v_state_id 
    AND lower(trim(name)) = lower(trim(p_city_name))
    AND (company_id IS NULL OR company_id = v_company_id)
  LIMIT 1;

  IF v_city_id IS NULL THEN
    INSERT INTO public.cities (state_id, name, company_id)
    VALUES (v_state_id, trim(p_city_name), v_company_id)
    RETURNING id INTO v_city_id;
  END IF;

  -- 4. Identificar endereço primário existente para este parceiro
  SELECT id INTO v_address_id
  FROM public.parceiros_enderecos
  WHERE partner_id = p_partner_id
    AND is_primary = true
  LIMIT 1;

  -- 5. UPSERT Endereço
  IF v_address_id IS NOT NULL THEN
    UPDATE public.parceiros_enderecos SET
      city_id = v_city_id,
      cep = coalesce(p_cep, ''),
      street = coalesce(p_street, ''),
      number = coalesce(p_number, ''),
      neighborhood = coalesce(p_neighborhood, ''),
      complement = coalesce(p_complement, ''),
      updated_at = now()
    WHERE id = v_address_id;
  ELSE
    INSERT INTO public.parceiros_enderecos (
      company_id, partner_id, city_id, cep, street, number, neighborhood, complement, is_primary
    ) VALUES (
      v_company_id, p_partner_id, v_city_id, coalesce(p_cep, ''), coalesce(p_street, ''), 
      coalesce(p_number, ''), coalesce(p_neighborhood, ''), coalesce(p_complement, ''), true
    )
    RETURNING id INTO v_address_id;
  END IF;

  RETURN v_address_id;
END;
$$;

COMMENT ON FUNCTION public.rpc_upsert_partner_primary_address IS 'Realiza o salvamento atômico do endereço primário de um parceiro, resolvendo ou criando a cidade se necessário.';
