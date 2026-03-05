/**
 * classificationService.ts
 *
 * CRUD de tipos de produtos e tipos de parceiros via supabase-js direto.
 *
 * Estratégia de dados:
 *   - company_id = NULL → registros de sistema, visíveis a todas as empresas (read-only)
 *   - company_id = uuid → registros personalizados de cada empresa
 *
 * O RLS das tabelas garante que cada empresa vê os registros de sistema + os próprios.
 *
 * Tabelas:
 *   public.product_types
 *   public.partner_types
 */

import { supabase } from './supabase';

// ─── TIPOS EXPORTADOS ─────────────────────────────────────────────────────────

export interface ProductType {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
}

export interface PartnerType {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
}

// ─── MAPEADORES ───────────────────────────────────────────────────────────────

function mapProductRow(row: any): ProductType {
  return {
    id:          row.id,
    name:        row.name        ?? '',
    description: row.description ?? '',
    isSystem:    row.is_system   ?? false,
  };
}

function mapPartnerRow(row: any): PartnerType {
  return {
    id:          row.id,
    name:        row.name        ?? '',
    description: row.description ?? '',
    isSystem:    row.is_system   ?? false,
  };
}

// ─── HELPER: buscar company_id do usuário logado ──────────────────────────────

async function getCompanyId(): Promise<string> {
  const { data, error } = await supabase
    .from('app_users')
    .select('company_id')
    .single();
  if (error || !data?.company_id) throw new Error('Usuário sem empresa vinculada');
  return data.company_id as string;
}

// ─── SERVICE ──────────────────────────────────────────────────────────────────

export const classificationService = {

  // ── PRODUCT TYPES ──────────────────────────────────────────────────────────

  getProductTypes: async (): Promise<ProductType[]> => {
    const { data, error } = await supabase
      .from('product_types')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw new Error(`Erro ao buscar tipos de produto: ${error.message}`);
    return (data ?? []).map(mapProductRow);
  },

  addProductType: async (type: Omit<ProductType, 'id' | 'isSystem'>): Promise<void> => {
    const companyId = await getCompanyId();
    const { error } = await supabase.from('product_types').insert({
      id:          crypto.randomUUID(),
      company_id:  companyId,
      name:        type.name,
      description: type.description || null,
      is_system:   false,
    });
    if (error) throw new Error(`Erro ao cadastrar tipo de produto: ${error.message}`);
  },

  updateProductType: async (type: ProductType): Promise<void> => {
    const { error } = await supabase
      .from('product_types')
      .update({
        name:        type.name,
        description: type.description || null,
      })
      .eq('id', type.id);
    if (error) throw new Error(`Erro ao atualizar tipo de produto: ${error.message}`);
  },

  deleteProductType: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('product_types')
      .delete()
      .eq('id', id);
    if (error) throw new Error(`Erro ao excluir tipo de produto: ${error.message}`);
  },

  // ── PARTNER TYPES ──────────────────────────────────────────────────────────

  getPartnerTypes: async (): Promise<PartnerType[]> => {
    const { data, error } = await supabase
      .from('partner_types')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw new Error(`Erro ao buscar tipos de parceiro: ${error.message}`);
    return (data ?? []).map(mapPartnerRow);
  },

  addPartnerType: async (type: Omit<PartnerType, 'id' | 'isSystem'>): Promise<void> => {
    const companyId = await getCompanyId();
    const { error } = await supabase.from('partner_types').insert({
      id:          crypto.randomUUID(),
      company_id:  companyId,
      name:        type.name,
      description: type.description || null,
      is_system:   false,
    });
    if (error) throw new Error(`Erro ao cadastrar tipo de parceiro: ${error.message}`);
  },

  updatePartnerType: async (type: PartnerType): Promise<void> => {
    const { error } = await supabase
      .from('partner_types')
      .update({
        name:        type.name,
        description: type.description || null,
      })
      .eq('id', type.id);
    if (error) throw new Error(`Erro ao atualizar tipo de parceiro: ${error.message}`);
  },

  deletePartnerType: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('partner_types')
      .delete()
      .eq('id', id);
    if (error) throw new Error(`Erro ao excluir tipo de parceiro: ${error.message}`);
  },

  // ── REALTIME ───────────────────────────────────────────────────────────────

  /**
   * Assina mudanças em tempo real nas tabelas de classificações.
   * Dispara onAnyChange() para qualquer INSERT/UPDATE/DELETE em
   * product_types ou partner_types.
   * Retorna função para cancelar a assinatura (usar no cleanup do useEffect).
   */
  subscribeRealtime: (() => {
    const listeners = new Set<() => void>();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    return (onAnyChange: () => void): (() => void) => {
      listeners.add(onAnyChange);
      if (!channel) {
        channel = supabase
          .channel('realtime:classifications')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'product_types' }, () => listeners.forEach(fn => fn()))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'partner_types' }, () => listeners.forEach(fn => fn()))
          .subscribe();
      }
      return () => {
        listeners.delete(onAnyChange);
        if (listeners.size === 0 && channel) { supabase.removeChannel(channel); channel = null; }
      };
    };
  })(),

  // ── COMPAT: métodos legados utilizados em outros módulos ──────────────────

  /**
   * @deprecated Use getProductTypes() (async)
   */
  loadFromSupabase: async () => {},
  startRealtime:    () => {},
  importData:       (_pt: any[], _prt: any[]) => {},
};
