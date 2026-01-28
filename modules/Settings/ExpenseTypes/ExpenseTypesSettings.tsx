
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Receipt, 
  Plus, 
  Trash2, 
  Save, 
  Tags, 
  X,
  Search,
  AlertTriangle,
  Lock,
  Anchor, 
  TrendingUp, 
  Briefcase
} from 'lucide-react';
import SettingsSubPage from '../components/SettingsSubPage';
import { financialService, expenseCategoryService, ExpenseCategory, ExpenseSubtype } from '../../../services/financialService';
import ActionConfirmationModal from '../../../components/ui/ActionConfirmationModal';
import { useToast } from '../../../contexts/ToastContext';

interface Props {
  onBack: () => void;
}

const ExpenseTypesSettings: React.FC<Props> = ({ onBack }) => {
  const { addToast } = useToast();
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // States for deletion modals
  const [subtypeToDelete, setSubtypeToDelete] = useState<{ catId: string, sub: ExpenseSubtype } | null>(null);
  const [categoryToDeleteId, setCategoryToDeleteId] = useState<string | null>(null);

  // Initial Load
  useEffect(() => {
    const unsubscribe = expenseCategoryService.subscribe(items => setCategories(items));
    
    loadCategories();
    
    return () => unsubscribe();
  }, []);

  const loadCategories = () => {
    const data = financialService.getExpenseCategories();
    setCategories(data);
  };

  // Form State
  const [formData, setFormData] = useState({
    categoryId: '',
    newCategoryName: '', 
    subtypeName: ''
  });

  const renderCategoryIcon = (type: string) => {
    switch (type) {
      case 'fixed': return <Anchor size={18} />;
      case 'variable': return <TrendingUp size={18} />;
      case 'administrative': return <Briefcase size={18} />;
      default: return <Tags size={18} />;
    }
  };

  const handleAddNew = (preSelectedCategoryId?: string) => {
    setFormData({
      categoryId: preSelectedCategoryId || '',
      newCategoryName: '',
      subtypeName: ''
    });
    setViewMode('form');
  };

  const confirmDeleteSubtype = async () => {
    if (subtypeToDelete) {
      const { catId, sub } = subtypeToDelete;
      
      if (financialService.isExpenseSubtypeInUse(sub.name)) {
        addToast('error', 'Item em Uso', `O item "${sub.name}" possui lançamentos financeiros e não pode ser removido.`);
        setSubtypeToDelete(null);
        return;
      }

      try {
        const category = categories.find(c => c.id === catId);
        if (category) {
          category.subtypes = (category.subtypes || []).filter(s => s.id !== sub.id);
          await financialService.updateCategory(category);
          loadCategories();
          addToast('success', 'Item Removido');
        }
      } catch (error: any) {
        addToast('error', 'Erro ao Excluir', error.message || 'Falha ao remover item.');
      }
      setSubtypeToDelete(null);
    }
  };

  const confirmDeleteCategory = async () => {
    if (categoryToDeleteId) {
      try {
        await financialService.deleteCategory(categoryToDeleteId);
        loadCategories();
        addToast('success', 'Categoria Removida');
      } catch (error: any) {
        addToast('error', 'Erro ao Excluir', error.message);
      }
      setCategoryToDeleteId(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.categoryId && !formData.newCategoryName) {
      addToast('warning', 'Dados Incompletos', 'Selecione uma categoria existente ou crie uma nova.');
      return;
    }
    if (!formData.subtypeName) {
      addToast('warning', 'Dados Incompletos', 'O nome do subtipo é obrigatório.');
      return;
    }

    try {
      const newSubtype: ExpenseSubtype = {
        id: Math.random().toString(36).substr(2, 9),
        name: formData.subtypeName
      };

      if (formData.categoryId && formData.categoryId !== 'new') {
        const category = categories.find(c => c.id === formData.categoryId);
        if (category) {
          if (!category.subtypes) category.subtypes = [];
          category.subtypes.push(newSubtype);
          await financialService.updateCategory(category);
        }
      } 
      else if (formData.newCategoryName) {
        const newCategory: ExpenseCategory = {
          id: Math.random().toString(36).substr(2, 9),
          name: formData.newCategoryName,
          type: 'custom',
          color: 'bg-violet-50 text-violet-700 border-violet-200',
          subtypes: [newSubtype]
        } as ExpenseCategory;
        await financialService.addCategory(newCategory);
      }

      loadCategories();
      setViewMode('list');
      addToast('success', 'Salvo com Sucesso');
    } catch (err: any) {
      addToast('error', 'Atenção', err.message);
    }
  };

  const filteredCategories = useMemo(() => {
    return categories.filter(cat => {
      if (!cat) return false;
      const search = (searchTerm || '').toLowerCase();
      const catName = (cat.name || '').toLowerCase();
      
      const matchCategory = catName.includes(search);
      const matchSubtype = (cat.subtypes || []).some(s => 
         s && s.name && s.name.toLowerCase().includes(search)
      );
      
      return matchCategory || matchSubtype;
    });
  }, [categories, searchTerm]);

  if (viewMode === 'form') {
    return (
      <SettingsSubPage
        title="Nova Despesa"
        description="Cadastre categorias e subcategorias para o plano de contas."
        icon={Receipt}
        color="bg-rose-500"
        onBack={() => setViewMode('list')}
      >
        <form onSubmit={handleSave} className="max-w-xl space-y-6">
          
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Categoria (Tipo)</label>
              <select
                required
                value={formData.categoryId}
                onChange={e => setFormData({...formData, categoryId: e.target.value})}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                <option value="">Selecione...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
                <option value="new">+ Criar Nova Categoria</option>
              </select>
            </div>

            {formData.categoryId === 'new' && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Nome da Nova Categoria</label>
                <input
                  type="text"
                  required
                  value={formData.newCategoryName}
                  onChange={e => setFormData({...formData, newCategoryName: e.target.value})}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  placeholder="Ex: Despesas Financeiras"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Subtipo (Item de Despesa)</label>
              <input
                type="text"
                required
                value={formData.subtypeName}
                onChange={e => setFormData({...formData, subtypeName: e.target.value})}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                placeholder="Ex: Manutenção de Ar-condicionado"
              />
              <p className="mt-1 text-xs text-slate-500">
                Este é o nome que aparecerá na hora de lançar a conta a pagar.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 shadow-sm"
            >
              <Save size={18} />
              Salvar Item
            </button>
          </div>
        </form>
      </SettingsSubPage>
    );
  }

  return (
    <SettingsSubPage
      title="Tipos de Despesas"
      description="Plano de contas e categorização de custos (Fixos, Variáveis, etc)."
      icon={Receipt}
      color="bg-rose-500"
      onBack={onBack}
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar despesa por nome..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>
        <button 
          onClick={() => handleAddNew()}
          className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700"
        >
          <Plus size={18} />
          Nova Despesa
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredCategories.length === 0 ? (
          <div className="col-span-full py-10 text-center text-slate-500">
            Nenhuma categoria de despesa encontrada.
          </div>
        ) : (
          filteredCategories.map((cat) => (
            <div key={cat.id} className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
              <div className={`flex items-center justify-between border-b px-4 py-3 rounded-t-xl ${cat.color || 'bg-gray-50'}`}>
                <div className="flex items-center gap-2">
                  {renderCategoryIcon(cat.type)}
                  <h3 className="font-bold text-sm uppercase">{cat.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  {cat.type === 'custom' && (
                    <button 
                      onClick={() => setCategoryToDeleteId(cat.id)}
                      className="rounded p-1 hover:bg-white/50 text-current transition-colors"
                      title="Excluir Categoria Completa"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="p-2 flex-1 flex flex-col gap-1">
                {(cat.subtypes && cat.subtypes.length > 0) ? (
                  cat.subtypes.map((sub) => {
                    const inUse = financialService.isExpenseSubtypeInUse(sub.name);
                    return (
                      <div 
                        key={sub.id} 
                        className="group flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-slate-300 group-hover:bg-rose-400"></div>
                          <span className={inUse ? 'font-medium' : ''}>{sub.name}</span>
                          {inUse && <Lock size={10} className="text-slate-300" title="Item em uso no financeiro" />}
                        </div>
                        <button
                          onClick={() => setSubtypeToDelete({ catId: cat.id, sub })}
                          className={`opacity-0 transition-opacity p-1 rounded hover:bg-red-50 ${inUse ? 'text-slate-200 cursor-not-allowed group-hover:opacity-100' : 'text-slate-400 hover:text-red-600 group-hover:opacity-100'}`}
                          disabled={inUse}
                          title={inUse ? "Item em uso - não pode ser excluído" : "Remover item"}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-4 text-center text-xs italic text-slate-400">
                    Nenhum subtipo cadastrado.
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 p-2">
                <button
                  onClick={() => handleAddNew(cat.id)}
                  className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 py-1.5 text-[10px] font-black uppercase text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Plus size={14} />
                  Adicionar Item
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <ActionConfirmationModal 
        isOpen={!!subtypeToDelete}
        onClose={() => setSubtypeToDelete(null)}
        onConfirm={confirmDeleteSubtype}
        title="Remover Item de Despesa?"
        description={
          <div className="space-y-2">
            <p>Deseja excluir o item <strong>{subtypeToDelete?.sub.name}</strong> do seu plano de contas?</p>
            <p className="text-xs text-slate-400 italic">Esta ação é permitida apenas para itens sem histórico financeiro.</p>
          </div>
        }
        type="danger"
        confirmLabel="Sim, Remover"
      />

      <ActionConfirmationModal 
        isOpen={!!categoryToDeleteId}
        onClose={() => setCategoryToDeleteId(null)}
        onConfirm={confirmDeleteCategory}
        title="Excluir Categoria?"
        description={
          <div className="space-y-3">
             <p>Tem certeza que deseja remover esta categoria personalizada?</p>
             <div className="p-3 bg-red-50 border border-red-100 rounded text-red-700 text-xs font-bold flex items-start gap-2">
               <AlertTriangle size={16} className="shrink-0" />
               <p>Atenção: Isso removerá todos os subtipos associados. Se algum estiver em uso, a ação será bloqueada.</p>
             </div>
          </div>
        }
        type="danger"
        confirmLabel="Sim, Excluir Categoria"
      />
    </SettingsSubPage>
  );
};

export default ExpenseTypesSettings;
