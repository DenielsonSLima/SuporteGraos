
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

// ✅ CREDENCIAIS SUPABASE - Projeto: Suporte Grãos ERP
const supabaseUrl = 'https://vqhjbsiwzgxaozcedqcn.supabase.co';
const supabaseAnonKey = 'sb_publishable_m8MBqafWFUIhbSmhatvDYw_NWrO_E8V';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * SQL PARA CRIAÇÃO DAS TABELAS NO SUPABASE (Copie e cole no SQL Editor do Supabase):
 * 
 * -- Tabela de Parceiros
 * CREATE TABLE partners (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   name TEXT NOT NULL,
 *   document TEXT UNIQUE,
 *   type TEXT CHECK (type IN ('PF', 'PJ')),
 *   categories TEXT[], -- Array de IDs de categorias
 *   phone TEXT,
 *   email TEXT,
 *   city TEXT,
 *   state TEXT,
 *   active BOOLEAN DEFAULT true,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
 * );
 * 
 * -- Tabela de Pedidos de Compra
 * CREATE TABLE purchase_orders (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   number TEXT UNIQUE NOT NULL,
 *   partner_id UUID REFERENCES partners(id),
 *   date DATE NOT NULL,
 *   status TEXT DEFAULT 'approved',
 *   total_value DECIMAL(15,2) DEFAULT 0,
 *   paid_value DECIMAL(15,2) DEFAULT 0,
 *   harvest TEXT,
 *   consultant_name TEXT,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
 * );
 * 
 * -- Tabela de Carregamentos (Logística)
 * CREATE TABLE loadings (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   purchase_order_id UUID REFERENCES purchase_orders(id),
 *   date DATE NOT NULL,
 *   vehicle_plate TEXT,
 *   driver_name TEXT,
 *   weight_kg DECIMAL(12,2),
 *   unload_weight_kg DECIMAL(12,2),
 *   status TEXT DEFAULT 'in_transit',
 *   freight_value DECIMAL(15,2),
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
 * );
 * 
 * -- Habilitar Realtime para estas tabelas
 * alter publication supabase_realtime add table partners;
 * alter publication supabase_realtime add table purchase_orders;
 * alter publication supabase_realtime add table loadings;
 */
