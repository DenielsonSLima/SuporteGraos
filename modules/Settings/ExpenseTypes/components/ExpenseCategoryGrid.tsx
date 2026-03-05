import React from 'react';
import {
  Receipt, Plus, Trash2, Search, X,
  AlertTriangle, Tags, Anchor, TrendingUp, Briefcase
} from 'lucide-react';
import SettingsSubPage from '../../components/SettingsSubPage';
import type { ExpenseCategory, ExpenseSubtype } from '../../../../services/expenseCategoryService';
import ActionConfirmationModal from '../../../../components/ui/ActionConfirmationModal';
import { SkeletonCards } from '../../../../components/ui/SkeletonCards';

interface ExpenseCategoryGridProps {
  categories: ExpenseCategory[];
  isLoading: boolean;
  searchTerm: string;
  subtypeToDelete: { cat: ExpenseCategory; sub: ExpenseSubtype } | null;
  categoryToDeleteId: string | null;
  onSearchChange: (term: string) => void;
  onAddNew: (preSelectedCategoryId?: string) => void;
  onDeleteSubtypeRequest: (cat: ExpenseCategory, sub: ExpenseSubtype) => void;
  onDeleteSubtypeConfirm: () => void;
  onDeleteSubtypeCancel: () => void;
  onDeleteCategoryRequest: (id: string) => void;
  onDeleteCategoryConfirm: () => void;
  onDeleteCategoryCancel: () => void;
  onBack: () => void;
}

const renderCategoryIcon = (type: string) => {
  switch (type) {
    case 'fixed':          return <Anchor size={18} />;
    case 'variable':       return <TrendingUp size={18} />;
    case 'administrative': return <Briefcase size={18} />;
    default:               return <Tags size={18} />;
  }
};

const ExpenseCategoryGrid: React.FC<ExpenseCategoryGridProps> = ({
  categories,
  isLoading,
  searchTerm,
  subtypeToDelete,
  categoryToDeleteId,
  onSearchChange,
  onAddNew,
  onDeleteSubtypeRequest,
  onDeleteSubtypeConfirm,
  onDeleteSubtypeCancel,
  onDeleteCategoryRequest,
  onDeleteCategoryConfirm,
  onDeleteCategoryCancel,
  onBack,
}) => {
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
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar despesa por nome..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>
        <button onClick={() => onAddNew()}
          className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700">
          <Plus size={18} />
          Nova Despesa
        </button>
      </div>

      {isLoading ? (
        <SkeletonCards count={3} cols={3} />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {categories.length === 0 ? (
            <div className="col-span-full py-10 text-center text-slate-500">
              Nenhuma categoria de despesa encontrada.
            </div>
          ) : (
            categories.map((cat) => (
              <div key={cat.id} className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
                <div className={`flex items-center justify-between border-b px-4 py-3 rounded-t-xl ${cat.color || 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2">
                    {renderCategoryIcon(cat.type)}
                    <h3 className="font-bold text-sm uppercase">{cat.name}</h3>
                  </div>
                  {!cat.isSystem && (
                    <button onClick={() => onDeleteCategoryRequest(cat.id)}
                      className="rounded p-1 hover:bg-white/50 text-current transition-colors"
                      title="Excluir Categoria Completa">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="p-2 flex-1 flex flex-col gap-1">
                  {cat.subtypes?.length ? (
                    cat.subtypes.map((sub) => (
                      <div key={sub.id}
                        className="group flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-slate-300 group-hover:bg-rose-400" />
                          <span>{sub.name}</span>
                        </div>
                        {!cat.isSystem && (
                          <button
                            onClick={() => onDeleteSubtypeRequest(cat, sub)}
                            className="opacity-0 transition-opacity p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 group-hover:opacity-100"
                            title="Remover item">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="py-4 text-center text-xs italic text-slate-400">
                      Nenhum subtipo cadastrado.
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 p-2">
                  <button onClick={() => onAddNew(cat.id)}
                    className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 py-1.5 text-[10px] font-black uppercase text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600">
                    <Plus size={14} />
                    Adicionar Item
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <ActionConfirmationModal
        isOpen={!!subtypeToDelete}
        onClose={onDeleteSubtypeCancel}
        onConfirm={onDeleteSubtypeConfirm}
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
        onClose={onDeleteCategoryCancel}
        onConfirm={onDeleteCategoryConfirm}
        title="Excluir Categoria?"
        description={
          <div className="space-y-3">
            <p>Tem certeza que deseja remover esta categoria personalizada?</p>
            <div className="p-3 bg-red-50 border border-red-100 rounded text-red-700 text-xs font-bold flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <p>Atenção: Isso removerá todos os subtipos associados.</p>
            </div>
          </div>
        }
        type="danger"
        confirmLabel="Sim, Excluir Categoria"
      />
    </SettingsSubPage>
  );
};

export default ExpenseCategoryGrid;
