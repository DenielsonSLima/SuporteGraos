import { supabase } from '../supabase';
import { authService } from '../authService';
import { Partner } from './types';
import { addressesActions } from './addresses';

/**
 * PARTNERS ACTIONS
 * Gerencia a tabela parceiros_parceiros e parceiros_categorias.
 */

export const partnersActions = {
  mapDatabaseToPartner(dbRow: any): Partner {
    if (!dbRow) return {} as Partner;
    const addressRow = Array.isArray(dbRow.address) ? dbRow.address[0] : dbRow.address;

    const categoriasRows = Array.isArray(dbRow.parceiros_categorias) ? dbRow.parceiros_categorias : [];
    const categories = categoriasRows.length > 0
      ? categoriasRows.map((c: any) => c.partner_type_id)
      : (dbRow.partner_type_id ? [dbRow.partner_type_id] : []);

    return {
      id: dbRow.id,
      companyId: dbRow.company_id,
      partnerTypeId: dbRow.partner_type_id,
      type: dbRow.type,
      categories,
      document: dbRow.document,
      name: dbRow.name,
      tradeName: dbRow.trade_name,
      nickname: dbRow.nickname,
      email: dbRow.email,
      phone: dbRow.phone,
      notes: dbRow.notes,
      active: dbRow.active !== false,
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at,
      address: addressRow ? addressesActions.mapDatabaseToAddress(addressRow) : undefined
    };
  },

  async getPartners(params?: {
    page?: number;
    pageSize?: number;
    searchTerm?: string;
    category?: string;
    active?: boolean;
  }) {
    const { page = 1, pageSize = 20, searchTerm, category, active } = params || {};
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const buildBaseQuery = (query: any, useJunctionCategories: boolean) => {
      if (category && category !== 'all') {
        query = useJunctionCategories
          ? query.eq('parceiros_categorias.partner_type_id', category)
          : query.eq('partner_type_id', category);
      }

      if (active !== undefined) {
        query = query.eq('active', active);
      }

      if (searchTerm) {
        const search = `%${searchTerm.trim()}%`;
        query = query.or(`name.ilike."${search}",trade_name.ilike."${search}",nickname.ilike."${search}",document.ilike."${search}"`);
      }

      return query.order('name', { ascending: true }).range(from, to);
    };

    const categoriasJoin = (category && category !== 'all')
      ? 'parceiros_categorias!inner(partner_type_id)'
      : 'parceiros_categorias(partner_type_id)';

    let primaryQuery = supabase
      .from('parceiros_parceiros')
      .select(`
        *,
        ${categoriasJoin},
        address:parceiros_enderecos(
          *,
          city:cities(
            name,
            state:states(uf)
          )
        )
      `, { count: 'exact' });

    const { data, error, count } = await buildBaseQuery(primaryQuery, true);

    let enrichedData = data || [];
    let finalCount = count || 0;

    if (error) {
      console.warn('[partnersActions] Junction indisponível, aplicando fallback legacy:', error.message);
      let fallbackQuery = supabase
        .from('parceiros_parceiros')
        .select(`
          *,
          address:parceiros_enderecos(
            *,
            city:cities(
              name,
              state:states(uf)
            )
          )
        `, { count: 'exact' });

      const { data: fallbackData, error: fallbackError, count: fallbackCount } = await buildBaseQuery(fallbackQuery, false);
      if (fallbackError) throw fallbackError;
      enrichedData = fallbackData || [];
      finalCount = fallbackCount || 0;
    } else if (category && category !== 'all' && enrichedData.length > 0) {
      const partnerIds = enrichedData.map((d: any) => d.id);
      const { data: allCats } = await supabase
        .from('parceiros_categorias')
        .select('partner_id, partner_type_id')
        .in('partner_id', partnerIds);

      if (allCats) {
        const catMap: Record<string, { partner_type_id: string }[]> = {};
        allCats.forEach((c: any) => {
          if (!catMap[c.partner_id]) catMap[c.partner_id] = [];
          catMap[c.partner_id].push({ partner_type_id: c.partner_type_id });
        });
        enrichedData = enrichedData.map((d: any) => ({
          ...d,
          parceiros_categorias: catMap[d.id] || d.parceiros_categorias
        }));
      }
    }

    return {
      data: enrichedData.map((row: any) => this.mapDatabaseToPartner(row)),
      count: finalCount
    };
  },

  async createPartner(partner: Omit<Partner, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>) {
    const companyId = authService.getCurrentUser()?.companyId;
    if (!companyId) throw new Error('Company ID not found');

    const categories = partner.categories?.length ? partner.categories : [partner.partnerTypeId || '6'];

    const { data, error } = await supabase
      .from('parceiros_parceiros')
      .insert({
        company_id: companyId,
        name: partner.name,
        trade_name: partner.tradeName,
        nickname: partner.nickname,
        document: partner.document,
        type: partner.type,
        partner_type_id: categories[0],
        email: partner.email,
        phone: partner.phone,
        notes: partner.notes,
        active: true
      })
      .select()
      .single();

    if (error) throw error;

    if (data && categories.length > 0) {
      const rows = categories.map(typeId => ({
        company_id: companyId,
        partner_id: data.id,
        partner_type_id: typeId
      }));
      const { error: catError } = await supabase.from('parceiros_categorias').insert(rows);
      if (catError) console.error('[partnersActions] Erro ao salvar categorias:', catError);
    }

    return this.mapDatabaseToPartner({ ...data, parceiros_categorias: categories.map(c => ({ partner_type_id: c })) });
  },

  async updatePartner(id: string, partner: Partial<Partner>) {
    const categories = partner.categories;
    const { data, error } = await supabase
      .from('parceiros_parceiros')
      .update({
        name: partner.name,
        trade_name: partner.tradeName,
        nickname: partner.nickname,
        document: partner.document,
        type: partner.type,
        partner_type_id: categories?.[0] || partner.partnerTypeId,
        email: partner.email,
        phone: partner.phone,
        notes: partner.notes,
        active: partner.active
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (categories && categories.length > 0) {
      const companyId = data?.company_id || authService.getCurrentUser()?.companyId;
      await supabase.from('parceiros_categorias').delete().eq('partner_id', id);
      const rows = categories.map(typeId => ({
        company_id: companyId,
        partner_id: id,
        partner_type_id: typeId
      }));
      const { error: catError } = await supabase.from('parceiros_categorias').insert(rows);
      if (catError) console.error('[partnersActions] Erro ao atualizar categorias:', catError);
    }

    return this.mapDatabaseToPartner({ ...data, parceiros_categorias: (categories || []).map(c => ({ partner_type_id: c })) });
  },

  async deletePartner(id: string) {
    const { error } = await supabase.from('parceiros_parceiros').delete().eq('id', id);
    if (error) throw error;
  }
};
