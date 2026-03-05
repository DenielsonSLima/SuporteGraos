-- ============================================================================
-- MIGRAÇÃO 010: MÓDULO DE PARCEIROS
-- Módulo: Parceiros (Fornecedores, Clientes, Transportadoras, etc)
-- Data: 2026-02-21
-- ============================================================================

-- ===========================================================================
-- TABELA: parceiros_parceiros
-- Tabela principal de parceiros de negócio.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.parceiros_parceiros (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  partner_type_id TEXT REFERENCES public.partner_types(id) ON DELETE RESTRICT,
  
  name            TEXT NOT NULL,
  trade_name      TEXT,               -- Nome Fantasia
  nickname        TEXT,               -- Apelido
  document        TEXT,               -- CPF ou CNPJ
  type            TEXT NOT NULL DEFAULT 'PJ' CHECK (type IN ('PF', 'PJ')),
  
  email           TEXT,
  phone           TEXT,
  notes           TEXT,
  
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_parceiros_parceiros_company_id ON public.parceiros_parceiros(company_id);
CREATE INDEX idx_parceiros_parceiros_type_id    ON public.parceiros_parceiros(partner_type_id);

CREATE TRIGGER trg_parceiros_parceiros_updated_at
  BEFORE UPDATE ON public.parceiros_parceiros
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===========================================================================
-- TABELA: parceiros_enderecos
-- Suporte a múltiplos endereços por parceiro.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.parceiros_enderecos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  partner_id      UUID NOT NULL REFERENCES public.parceiros_parceiros(id) ON DELETE CASCADE,
  city_id         UUID REFERENCES public.cities(id) ON DELETE SET NULL,
  
  cep             TEXT,
  street          TEXT,
  number          TEXT,
  neighborhood    TEXT,
  complement      TEXT,
  
  is_primary      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_parceiros_enderecos_partner_id ON public.parceiros_enderecos(partner_id);

CREATE TRIGGER trg_parceiros_enderecos_updated_at
  BEFORE UPDATE ON public.parceiros_enderecos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===========================================================================
-- TABELA: parceiros_motoristas
-- Dados específicos para parceiros do tipo transportadora.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.parceiros_motoristas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  partner_id      UUID NOT NULL REFERENCES public.parceiros_parceiros(id) ON DELETE CASCADE,
  
  name            TEXT NOT NULL,
  cnh_number      TEXT,
  cnh_category    TEXT,
  cpf             TEXT,
  phone           TEXT,
  
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_parceiros_motoristas_partner_id ON public.parceiros_motoristas(partner_id);

CREATE TRIGGER trg_parceiros_motoristas_updated_at
  BEFORE UPDATE ON public.parceiros_motoristas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===========================================================================
-- TABELA: parceiros_veiculos
-- Dados específicos para parceiros do tipo transportadora.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.parceiros_veiculos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  partner_id      UUID NOT NULL REFERENCES public.parceiros_parceiros(id) ON DELETE CASCADE,
  
  plate           TEXT NOT NULL,      -- Placa
  brand           TEXT,               -- Marca
  model           TEXT,               -- Modelo
  color           TEXT,
  year            INTEGER,
  
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_parceiros_veiculos_partner_id ON public.parceiros_veiculos(partner_id);

CREATE TRIGGER trg_parceiros_veiculos_updated_at
  BEFORE UPDATE ON public.parceiros_veiculos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: Módulo Parceiros
-- ---------------------------------------------------------------------------
-- Habilitar RLS em todas
ALTER TABLE public.parceiros_parceiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parceiros_enderecos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parceiros_motoristas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parceiros_veiculos ENABLE ROW LEVEL SECURITY;

-- parceiros_parceiros
CREATE POLICY "parceiros_parceiros_all" ON public.parceiros_parceiros
  FOR ALL USING (company_id = public.my_company_id());

-- parceiros_enderecos
CREATE POLICY "parceiros_enderecos_all" ON public.parceiros_enderecos
  FOR ALL USING (company_id = public.my_company_id());

-- parceiros_motoristas
CREATE POLICY "parceiros_motoristas_all" ON public.parceiros_motoristas
  FOR ALL USING (company_id = public.my_company_id());

-- parceiros_veiculos
CREATE POLICY "parceiros_veiculos_all" ON public.parceiros_veiculos
  FOR ALL USING (company_id = public.my_company_id());

-- ---------------------------------------------------------------------------
-- REALTIME: Módulo Parceiros
-- ---------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.parceiros_parceiros;
ALTER PUBLICATION supabase_realtime ADD TABLE public.parceiros_enderecos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.parceiros_motoristas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.parceiros_veiculos;
