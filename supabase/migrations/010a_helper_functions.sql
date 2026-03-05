-- ============================================================================
-- Migration 010a: Helper Functions (deve rodar ANTES das outras)
-- ============================================================================
-- Funções auxiliares usadas por todas as tabelas do sistema.
-- ============================================================================

-- ============================================================================
-- Função: handle_updated_at()
-- Usada por TRIGGER para atualizar o campo updated_at automaticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- EOF: Helper functions prontas
-- ============================================================================
