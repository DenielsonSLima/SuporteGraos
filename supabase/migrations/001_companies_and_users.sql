-- ============================================================================
-- MIGRAÇÃO 001: EMPRESAS E USUÁRIOS
-- Módulo: Configurações → Empresa / Usuários
-- Data: 2026-02-21
-- ============================================================================

-- ===========================================================================
-- TABELA: companies
-- Uma linha por empresa. Dados cadastrais da organização.
-- ===========================================================================
CREATE TABLE public.companies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social  TEXT NOT NULL,
  nome_fantasia TEXT NOT NULL,
  cnpj          TEXT UNIQUE,
  ie            TEXT,
  endereco      TEXT,
  numero        TEXT,
  bairro        TEXT,
  cidade        TEXT,
  uf            CHAR(2),
  cep           TEXT,
  telefone      TEXT,
  email         TEXT,
  website       TEXT,
  logo_url      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: companies
-- REGRA: qualquer usuário autenticado faz tudo, mas APENAS na sua empresa.
-- Isolamento por company_id — usuário da empresa 1 nunca vê/altera empresa 2.
-- ---------------------------------------------------------------------------
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Leitura: apenas a própria empresa
CREATE POLICY "companies_select" ON public.companies
  FOR SELECT USING (id = public.my_company_id());

-- Atualização: qualquer autenticado da empresa
CREATE POLICY "companies_update" ON public.companies
  FOR UPDATE USING (id = public.my_company_id());

-- Exclusão: qualquer autenticado da empresa
CREATE POLICY "companies_delete" ON public.companies
  FOR DELETE USING (id = public.my_company_id());

-- Insert: apenas autenticado (necessário para setup inicial — primeiro admin)
CREATE POLICY "companies_insert" ON public.companies
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Nota: my_company_id() é criada junto com app_users logo abaixo.

-- ===========================================================================
-- TABELA: app_users
-- Perfil estendido do usuário. Vinculado ao auth.users do Supabase.
-- ===========================================================================
CREATE TABLE public.app_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id  UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id    UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  first_name    TEXT NOT NULL DEFAULT '',
  last_name     TEXT NOT NULL DEFAULT '',
  cpf           TEXT,
  email         TEXT NOT NULL,
  phone         TEXT,
  role          TEXT NOT NULL DEFAULT 'user'
                  CHECK (role IN ('admin', 'manager', 'user')),
  active        BOOLEAN NOT NULL DEFAULT true,
  permissions   JSONB NOT NULL DEFAULT '[]'::jsonb,
  allow_recovery BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_app_users_auth_user_id ON public.app_users(auth_user_id);
CREATE INDEX idx_app_users_company_id   ON public.app_users(company_id);

CREATE TRIGGER trg_app_users_updated_at
  BEFORE UPDATE ON public.app_users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: app_users
-- Usuário vê apenas registro da própria empresa.
-- Admin da empresa vê todos os usuários da empresa.
-- ---------------------------------------------------------------------------
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Função auxiliar: retorna company_id do usuário logado
CREATE OR REPLACE FUNCTION public.my_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.app_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Leitura: vê apenas usuários da mesma empresa
CREATE POLICY "app_users_select" ON public.app_users
  FOR SELECT USING (
    company_id = public.my_company_id()
  );

-- próprio usuário pode atualizar seu perfil
CREATE POLICY "app_users_update_self" ON public.app_users
  FOR UPDATE USING (
    auth_user_id = auth.uid()
  );

-- admin pode atualizar qualquer usuário da empresa
CREATE POLICY "app_users_update_admin" ON public.app_users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.app_users AS u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'admin'
        AND u.active = true
        AND u.company_id = app_users.company_id
    )
  );

-- Insert gerenciado pelas Edge Functions (service_role) — usuário comum não insere diretamente
CREATE POLICY "app_users_insert_service" ON public.app_users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users AS u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'admin'
        AND u.active = true
    )
  );

-- ===========================================================================
-- SEED: Empresa padrão (necessária antes de criar o primeiro admin)
-- ===========================================================================
INSERT INTO public.companies (
  razao_social, nome_fantasia, cnpj, email, cidade, uf
) VALUES (
  'Agro Grãos LTDA',
  'Suporte Grãos',
  '12.345.678/0001-90',
  'financeiro@suportegraos.com',
  'Sinop',
  'MT'
);
