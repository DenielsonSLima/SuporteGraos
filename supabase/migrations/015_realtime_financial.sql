-- ============================================================================
-- Migration 015: Realtime para Módulo Financeiro
-- ============================================================================
-- Esta migration ativa Realtime (WebSocket) para as tabelas do módulo
-- financeiro, permitindo que mudanças se propaguem para todos os usuários
-- conectados em tempo real.
--
-- As tabelas já foram adicionadas à publication nas migrations anteriorespor segurança),
-- então esta migration é apenas confirmação e documentação.
-- ============================================================================

-- Adicione novamente caso uma tabela não tenha sido adicionada
-- (migrations 011-013 já adicionaram, mas replicar é seguro)
ALTER PUBLICATION supabase_realtime ADD TABLE public.accounts;

ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_entries;

ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_transactions;

-- ============================================================================
-- Verificações Opcionais (comentadas - rodar via psql)
-- ============================================================================

-- Para verificar se as tabelas estão na publication:
-- SELECT tablename FROM pg_publication_tables
-- WHERE pubname = 'supabase_realtime'
-- ORDER BY tablename;

-- Esperado (mínimo):
-- accounts
-- financial_entries
-- financial_transactions

-- ============================================================================
-- EOF: Realtime ativo para módulo financeiro
-- ============================================================================
