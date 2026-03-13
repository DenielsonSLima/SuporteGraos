/**
 * expenseCategoryService.ts  (reescrito — padrão TanStack Query)
 *
 * Todas as operações são async/await diretas no Supabase.
 * Registros de sistema (company_id IS NULL) são visíveis via RLS multi-tenant.
 *
 * Shims legados mantidos para retrocompatibilidade:
 *   getExpenseCategories(), addCategory(), updateCategory(), deleteCategory(),
 *   isExpenseSubtypeInUse(), subscribe(), getCategoryIcon()
 */

import { supabase } from './supabase';
import { authService } from './authService';
import { logService } from './logService';
import { Anchor, TrendingUp, Briefcase, HelpCircle } from 'lucide-react';

// ── Tipos ─────────────────────────────────────────────────────────────────────


export interface ExpenseSubtype {
  id: string;
  categoryId: string;
  name: string;
  isSystem?: boolean;
}


export interface ExpenseCategory {
  id: string;
  name: string;
  type: 'fixed' | 'variable' | 'administrative' | 'custom';
  color: string;
  isSystem?: boolean;
  icon?: unknown;
  subtypes?: ExpenseSubtype[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const getCompanyId = () => authService.getCurrentUser()?.companyId ?? null;

const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return { userId: user?.id || 'system', userName: user?.name || 'Sistema' };
};

const TYPE_ORDER: Record<string, number> = {
  fixed: 0,
  variable: 1,
  administrative: 2,
  custom: 3,
};


const mapRow = (row: any): ExpenseCategory => ({
  id: row.id,
  name: row.name,
  type: (row.type ?? 'custom') as ExpenseCategory['type'],
  color: row.color ?? 'bg-slate-50 text-slate-700 border-slate-200',
  isSystem: row.is_system ?? false,
});

const mapSubcategory = (row: any): ExpenseSubtype => ({
  id: row.id,
  categoryId: row.category_id,
  name: row.name,
  isSystem: row.is_system ?? false,
});

const sortCategories = (cats: ExpenseCategory[]): ExpenseCategory[] =>
  [...cats].sort((a, b) => {
    const orderA = TYPE_ORDER[a.type] ?? 99;
    const orderB = TYPE_ORDER[b.type] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name);
  });

/** Ícone por tipo (mantido por retrocompatibilidade com componentes antigos). */
export const getCategoryIcon = (type: string) => {
  switch (type) {
    case 'fixed': return Anchor;
    case 'variable': return TrendingUp;
    case 'administrative': return Briefcase;
    default: return HelpCircle;
  }
};


// ── API principal ─────────────────────────────────────────────────────────────

export const expenseCategoryService = {


  /** Retorna todas as categorias (sistema + empresa) com subcategorias aninhadas. */
  getAll: async (): Promise<ExpenseCategory[]> => {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('id, type, name, color, is_system')
      .order('created_at', { ascending: true });
    if (error) throw error;
    const categories = (data ?? []).map(mapRow);

    // Buscar subcategorias
    const { data: subs, error: errSubs } = await supabase
      .from('expense_subcategories')
      .select('id, category_id, name, is_system')
      .order('created_at', { ascending: true });
    if (errSubs) throw errSubs;
    const subcategories = (subs ?? []).map(mapSubcategory);

    // Aninhar
    const byCat: Record<string, ExpenseSubtype[]> = {};
    for (const sub of subcategories) {
      byCat[sub.categoryId] = byCat[sub.categoryId] || [];
      byCat[sub.categoryId].push(sub);
    }
    return sortCategories(categories.map(cat => ({ ...cat, subtypes: byCat[cat.id] || [] })));
  },


  /** Adiciona uma categoria customizada para a empresa atual. */
  add: async (input: Omit<ExpenseCategory, 'id' | 'icon' | 'isSystem' | 'subtypes'>): Promise<ExpenseCategory> => {
    const companyId = getCompanyId();
    if (!companyId) throw new Error('Usuário sem empresa vinculada.');

    const { data, error } = await supabase
      .from('expense_categories')
      .insert({
        company_id: companyId,
        type: input.type ?? 'custom',
        name: input.name.trim(),
        color: input.color,
        is_system: false,
      })
      .select('id, type, name, color, is_system')
      .single();

    if (error) {
      if (error.code === '23505') throw new Error(`Já existe uma categoria com o nome "${input.name}".`);
      throw error;
    }

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId, userName, action: 'create', module: 'Configurações',
      description: `Criou categoria de despesa: ${input.name}`,
      entityId: data.id,
    });

    return mapRow(data);
  },

  /** Adiciona uma subcategoria à categoria informada. */
  addSubcategory: async (categoryId: string, name: string): Promise<ExpenseSubtype> => {
    const companyId = getCompanyId();
    if (!companyId) throw new Error('Usuário sem empresa vinculada.');
    const { data, error } = await supabase
      .from('expense_subcategories')
      .insert({
        category_id: categoryId,
        company_id: companyId,
        name: name.trim(),
        is_system: false,
      })
      .select('id, category_id, name, is_system')
      .single();
    if (error) {
      if (error.code === '23505') throw new Error(`Já existe um item com esse nome nesta categoria.`);
      throw error;
    }
    return mapSubcategory(data);
  },

  /** Atualiza o nome de uma subcategoria. */
  updateSubcategory: async (subcategoryId: string, name: string): Promise<ExpenseSubtype> => {
    const { data, error } = await supabase
      .from('expense_subcategories')
      .update({ name: name.trim() })
      .eq('id', subcategoryId)
      .select('id, category_id, name, is_system')
      .single();
    if (error) throw error;
    return mapSubcategory(data);
  },

  /** Remove uma subcategoria (apenas customizada). */
  deleteSubcategory: async (subcategoryId: string): Promise<void> => {
    const { error } = await supabase
      .from('expense_subcategories')
      .delete()
      .eq('id', subcategoryId);
    if (error) throw error;
  },


  /** Atualiza uma categoria (apenas as da empresa — is_system=false). */
  update: async (id: string, input: Partial<Omit<ExpenseCategory, 'id' | 'icon' | 'isSystem' | 'subtypes'> & { name?: string; color?: string; type?: string }>): Promise<ExpenseCategory> => {
    const payload: Record<string, unknown> = {};
    if (input.name     !== undefined) payload.name     = input.name.trim();
    if (input.type     !== undefined) payload.type     = input.type;
    if (input.color    !== undefined) payload.color    = input.color;
    const { data, error } = await supabase
      .from('expense_categories')
      .update(payload)
      .eq('id', id)
      .select('id, type, name, color, is_system')
      .single();
    if (error) {
      if (error.code === '23505') throw new Error(`Já existe uma categoria com esse nome.`);
      throw error;
    }
    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId, userName, action: 'update', module: 'Configurações',
      description: `Atualizou categoria de despesa: ${data.name}`,
      entityId: id,
    });
    return mapRow(data);
  },


  /** Deleta uma categoria customizada da empresa. */
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('expense_categories')
      .delete()
      .eq('id', id);
    if (error) {
      if (error.code === '23503') throw new Error('Esta categoria está em uso e não pode ser removida.');
      throw error;
    }
    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId, userName, action: 'delete', module: 'Configurações',
      description: 'Removeu categoria de despesa.',
      entityId: id,
    });
  },


  /** Realtime: singleton channel para expense_categories + expense_subcategories. Retorna cleanup. */
  subscribeRealtime: (() => {
    const listeners = new Set<() => void>();
    let channelCat: ReturnType<typeof supabase.channel> | null = null;
    return (callback: () => void): (() => void) => {
      listeners.add(callback);
      if (!channelCat) {
        channelCat = supabase
          .channel('realtime:expense_categories:svc')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'expense_categories' }, () => listeners.forEach(fn => fn()))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'expense_subcategories' }, () => listeners.forEach(fn => fn()))
          .subscribe();
      }
      return () => {
        listeners.delete(callback);
        if (listeners.size === 0 && channelCat) {
          void supabase.removeChannel(channelCat);
          channelCat = null;
        }
      };
    };
  })(),

  // ── Shims legados ──────────────────────────────────────────────────────────

  /** @deprecated Use expenseCategoryService.getAll() via useExpenseCategories() */
  getExpenseCategories: (): ExpenseCategory[] => [],

  /** @deprecated Use expenseCategoryService.add() via useExpenseCategories() */
  addCategory: async (category: ExpenseCategory): Promise<void> => {
    await expenseCategoryService.add(category);
  },

  /** @deprecated Use expenseCategoryService.update() via useExpenseCategories() */
  updateCategory: async (category: ExpenseCategory): Promise<void> => {
    await expenseCategoryService.update(category.id, category);
  },

  /** @deprecated Use expenseCategoryService.delete() via useExpenseCategories() */
  deleteCategory: async (id: string): Promise<void> => {
    await expenseCategoryService.delete(id);
  },

  /** @deprecated Sempre retorna false — proteção via FK no DB. */
  isExpenseSubtypeInUse: (_name: string): boolean => false,

  /** @deprecated Use subscribeRealtime() */
  subscribe: (callback: (items: ExpenseCategory[]) => void): (() => void) => {
    return expenseCategoryService.subscribeRealtime(() => {
      void expenseCategoryService.getAll().then(callback);
    });
  },

  loadFromSupabase: async () => { /* no-op — TanStack Query gerencia o cache */ },
  startRealtime: () => { /* no-op */ },
};
