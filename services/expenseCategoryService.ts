import { logService } from './logService';
import { authService } from './authService';
import { Persistence } from './persistence';
import { supabase } from './supabase';
import { ExpenseCategory, ExpenseSubtype, DEFAULT_CATEGORIES_DATA } from './expenseCategory/types';
import { getCategoryIcon, sortCategoriesByType } from './expenseCategory/utils';
import { expenseCategorySupabaseSync } from './expenseCategory/supabaseSyncService';

export type { ExpenseCategory, ExpenseSubtype } from './expenseCategory/types';
export { getCategoryIcon } from './expenseCategory/utils';

const categoriesDb = new Persistence<Omit<ExpenseCategory, 'icon'>>('expense_categories', DEFAULT_CATEGORIES_DATA);
let _isSupabaseCategoriesLoaded = false;
let _realtimeStarted = false;

// ============================================================================
// REALTIME
// ============================================================================

const startRealtime = () => {
  if (_realtimeStarted) return;
  _realtimeStarted = true;

  supabase
    .channel('realtime:expense_categories')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'expense_types' }, () => {
      console.log('🔔 Realtime expense_types: mudança detectada');
      _isSupabaseCategoriesLoaded = false;
      void loadFromSupabase();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'expense_categories' }, () => {
      console.log('🔔 Realtime expense_categories: mudança detectada');
      _isSupabaseCategoriesLoaded = false;
      void loadFromSupabase();
    })
    .subscribe(status => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime expense_categories ativo');
      }
    });
};

const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return { userId: user?.id || 'system', userName: user?.name || 'Sistema' };
};

const loadFromSupabase = async () => {
  try {
    // Busca dados FRESCOS diretamente do Supabase (não usa cache do initService)
    const freshData = await expenseCategorySupabaseSync.syncLoadFromSupabase();
    if (freshData && freshData.length > 0) {
      const categories = sortCategoriesByType(freshData);
      categoriesDb.setAll(categories);
      _isSupabaseCategoriesLoaded = true;
      console.log('✅ ExpenseCategoryService: Dados frescos carregados do Supabase:', categories.length, 'categorias');
    }
  } catch (error) {
    console.warn('⚠️ ExpenseCategoryService: Erro ao carregar do Supabase:', error);
    _isSupabaseCategoriesLoaded = false;
  }
};

// ❌ NÃO inicializar automaticamente - aguardar autenticação via supabaseInitService
// void loadFromSupabase();


export const expenseCategoryService = {
  loadFromSupabase,
  startRealtime,
  subscribe: (callback: (items: ExpenseCategory[]) => void) => categoriesDb.subscribe(callback),

  getExpenseCategories: (): ExpenseCategory[] => {
    try {
      const rawData = categoriesDb.getAll();
      if (!Array.isArray(rawData) || rawData.length === 0) {
        console.warn('⚠️ Nenhuma categoria carregada, usando padrões');
        return DEFAULT_CATEGORIES_DATA.map(c => ({
          ...c,
          icon: getCategoryIcon(c.type),
          subtypes: Array.isArray(c.subtypes) ? [...c.subtypes].sort((a, b) => a.name.localeCompare(b.name)) : []
        }));
      }

      // Retorna categorias SEMPRE ORDENADAS por tipo (fixed > variable > administrative > custom)
      const sorted = sortCategoriesByType(rawData);
      return sorted.map(cat => ({
        ...cat,
        id: cat.id || Math.random().toString(),
        name: cat.name || 'Categoria Sem Nome',
        type: cat.type || 'custom',
        subtypes: Array.isArray(cat.subtypes)
          ? [...cat.subtypes].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
          : [],
        icon: getCategoryIcon(cat.type || 'custom')
      }));
    } catch (error) {
      console.error("❌ Erro crítico ao carregar categorias:", error);
      return DEFAULT_CATEGORIES_DATA.map(c => ({
        ...c,
        icon: getCategoryIcon(c.type),
        subtypes: Array.isArray(c.subtypes) ? [...c.subtypes] : []
      }));
    }
  },

  addCategory: (category: ExpenseCategory) => {
    const all = categoriesDb.getAll();
    const normalizedName = category.name.trim().toLowerCase();

    if (all.some(c => c.name.trim().toLowerCase() === normalizedName)) {
      throw new Error(`Já existe uma categoria chamada "${category.name}".`);
    }

    const { icon, ...dataToSave } = category;
    if (!dataToSave.subtypes) dataToSave.subtypes = [];

    // Salva localmente PRIMEIRO (retorna instantaneamente)
    categoriesDb.add(dataToSave as ExpenseCategory);

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId, userName, action: 'create', module: 'Configurações',
      description: `Criou nova categoria de despesa: ${category.name}`,
      entityId: category.id
    });

    // Sincroniza com Supabase em background (não-bloqueante)
    Promise.resolve().then(() => {
      expenseCategorySupabaseSync.syncInsertCategory(category).catch(err =>
        console.error('❌ Erro crítico ao sincronizar categoria:', err)
      );
    });
  },

  updateCategory: (updatedCategory: ExpenseCategory) => {
    const all = categoriesDb.getAll();
    const normalizedName = updatedCategory.name.trim().toLowerCase();

    if (all.some(c => c.id !== updatedCategory.id && c.name.trim().toLowerCase() === normalizedName)) {
      throw new Error(`Já existe outra categoria chamada "${updatedCategory.name}".`);
    }

    const subtypeNames = (updatedCategory.subtypes || []).map(s => s.name.trim().toLowerCase());
    const hasInternalDupes = subtypeNames.some((name, index) => subtypeNames.indexOf(name) !== index);
    if (hasInternalDupes) {
      throw new Error("Não é permitido ter dois itens com o mesmo nome dentro da mesma categoria.");
    }

    const { icon, ...dataToSave } = updatedCategory;
    // Atualiza localmente PRIMEIRO (retorna instantaneamente)
    categoriesDb.update(dataToSave as ExpenseCategory);

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId, userName, action: 'update', module: 'Configurações',
      description: `Atualizou categoria de despesa: ${updatedCategory.name}`,
      entityId: updatedCategory.id
    });

    // Sincroniza com Supabase em background (não-bloqueante)
    Promise.resolve().then(() => {
      expenseCategorySupabaseSync.syncUpdateCategory(updatedCategory).catch(err =>
        console.error('❌ Erro crítico ao sincronizar atualização:', err)
      );
    });
  },

  deleteCategory: (id: string) => {
    const category = categoriesDb.getById(id);
    if (!category) throw new Error('Categoria não encontrada.');

    if (expenseCategoryService.isExpenseSubtypeInUse(category.name)) {
      throw new Error('Esta categoria está em uso e não pode ser removida.');
    }

    // Deleta localmente PRIMEIRO (retorna instantaneamente)
    categoriesDb.delete(id);

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId, userName, action: 'delete', module: 'Configurações',
      description: `Deletou categoria de despesa: ${category.name}`,
      entityId: id
    });

    // Sincroniza com Supabase em background (não-bloqueante)
    Promise.resolve().then(() => {
      expenseCategorySupabaseSync.syncDeleteCategory(id).catch(err =>
        console.error('❌ Erro crítico ao sincronizar deleção:', err)
      );
    });
  },

  isExpenseSubtypeInUse: (subtypeName: string): boolean => {
    // Verifica se subtipo está em uso em alguma transação
    return false; // Placeholder
  },

  importData: (data: ExpenseCategory[]) => {
    categoriesDb.setAll(data);
    // Sync em background
    Promise.resolve().then(() => {
      data.forEach(cat => {
        expenseCategorySupabaseSync.syncInsertCategory(cat).catch(() => { });
      });
    });
  }
};
