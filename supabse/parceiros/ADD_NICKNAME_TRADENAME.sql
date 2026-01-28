-- Adicionar colunas nickname e trade_name à tabela partners
-- Se as colunas já existem, esta migration não vai fazer nada

ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS nickname TEXT;

ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS trade_name TEXT;

-- Criar índices para melhorar performance de busca
CREATE INDEX IF NOT EXISTS idx_partners_nickname ON partners(nickname);
CREATE INDEX IF NOT EXISTS idx_partners_trade_name ON partners(trade_name);

-- Atualizar RLS policy para permitir leitura/escrita desses campos
-- (Assumindo que as policies já existem para outros campos)
