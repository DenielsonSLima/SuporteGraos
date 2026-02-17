import { supabase } from '../supabase';
import { authService } from '../authService';
import { ExpenseCategory } from './types';

/**
 * Sincronização com Supabase (não-bloqueante, em background)
 * Todos os métodos retornam Promise para que o chamador possa fazer .catch()
 * mas não espera resposta (fire-and-forget pattern)
 */

export const expenseCategorySupabaseSync = {

  syncInsertCategory: async (category: ExpenseCategory) => {
    try {
      const companyId = authService.getCurrentUser()?.companyId || null;

      await supabase.from('expense_types').upsert({
        id: category.id,
        name: category.name,
        type_key: category.type,
        color: category.color || 'bg-gray-50 text-gray-700 border-gray-200',
        icon: null,
        is_system: false,
        company_id: companyId
      }, { onConflict: 'id' });

      if (category.subtypes && category.subtypes.length > 0) {
        const categoriesToInsert = category.subtypes.map(sub => ({
          id: sub.id,
          expense_type_id: category.id,
          name: sub.name,
          description: null,
          is_system: false,
          company_id: companyId
        }));
        await supabase.from('expense_categories').upsert(categoriesToInsert, { onConflict: 'id' });
      }

      console.log(`✅ Categoria ${category.name} sincronizada no Supabase`);
    } catch (error) {
      console.warn('⚠️ Erro ao sincronizar categoria no Supabase:', error);
    }
  },

  syncUpdateCategory: async (category: ExpenseCategory) => {
    try {
      await supabase.from('expense_types')
        .update({
          name: category.name,
          type_key: category.type,
          color: category.color
        })
        .eq('id', category.id);

      // Remove subtypes antigos e insere novos
      await supabase.from('expense_categories').delete().eq('expense_type_id', category.id);

      if (category.subtypes && category.subtypes.length > 0) {
        const companyId = authService.getCurrentUser()?.companyId || null;
        const categoriesToInsert = category.subtypes.map(sub => ({
          id: sub.id,
          expense_type_id: category.id,
          name: sub.name,
          description: null,
          is_system: false,
          company_id: companyId
        }));
        await supabase.from('expense_categories').insert(categoriesToInsert);
      }

      console.log(`✅ Categoria ${category.name} atualizada no Supabase`);
    } catch (error) {
      console.warn('⚠️ Erro ao atualizar categoria no Supabase:', error);
    }
  },

  syncDeleteCategory: async (categoryId: string) => {
    try {
      await supabase.from('expense_categories').delete().eq('expense_type_id', categoryId);
      await supabase.from('expense_types').delete().eq('id', categoryId);
      console.log(`✅ Categoria deletada no Supabase`);
    } catch (error) {
      console.warn('⚠️ Erro ao deletar categoria no Supabase:', error);
    }
  },

  syncLoadFromSupabase: async () => {
    try {
      const [typesRes, catsRes] = await Promise.all([
        supabase.from('expense_types').select('*').order('id'),
        supabase.from('expense_categories').select('*').order('expense_type_id, name')
      ]);

      if (typesRes.error) throw typesRes.error;
      if (catsRes.error) throw catsRes.error;

      const typesMap = new Map<string, any>();
      (typesRes.data || []).forEach((type: any) => {
        typesMap.set(type.id, {
          id: type.id,
          name: type.name,
          type: (type.type_key as 'fixed' | 'variable' | 'administrative' | 'custom') || 'custom',
          color: type.color,
          subtypes: []
        });
      });

      (catsRes.data || []).forEach((cat: any) => {
        const type = typesMap.get(cat.expense_type_id);
        if (type) {
          type.subtypes.push({ id: cat.id, name: cat.name });
        }
      });

      return Array.from(typesMap.values());
    } catch (error) {
      console.warn('⚠️ Falha ao carregar categorias do Supabase:', error);
      return [];
    }
  }
};
