-- Script para testar transporters no Supabase
-- Execute no Supabase SQL Editor

-- 1. Verificar se a tabela transporters existe e quantos registros tem
SELECT COUNT(*) as total_transporters FROM public.transporters;

-- 2. Listar todos os transporters
SELECT * FROM public.transporters LIMIT 10;

-- 3. Ver a estrutura das colunas de transporters
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'transporters' 
ORDER BY ordinal_position;

-- 4. Ver a estrutura das colunas de partners
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'partners' 
ORDER BY ordinal_position;

-- 5. Contar quantos partners existem
SELECT COUNT(*) as total_partners FROM public.partners;

-- 6. Listar alguns partners
SELECT * FROM public.partners LIMIT 5;
