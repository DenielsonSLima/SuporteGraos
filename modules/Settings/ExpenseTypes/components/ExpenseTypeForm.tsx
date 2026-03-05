import React from 'react';
import { Receipt, Save, Tags } from 'lucide-react';
import SettingsSubPage from '../../components/SettingsSubPage';
import type { ExpenseCategory } from '../../../../services/expenseCategoryService';

interface ExpenseTypeFormData {
  categoryId: string;
  newCategoryName: string;
  subtypeName: string;
}

interface ExpenseTypeFormProps {
  formData: ExpenseTypeFormData;
  categories: ExpenseCategory[];
  saving: boolean;
  onChange: (data: ExpenseTypeFormData) => void;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
}

const ExpenseTypeForm: React.FC<ExpenseTypeFormProps> = ({
  formData,
  categories,
  saving,
  onChange,
  onSave,
  onCancel,
}) => {
  return (
    <SettingsSubPage
      title="Nova Despesa"
      description="Cadastre categorias e subcategorias para o plano de contas."
      icon={Receipt}
      color="bg-rose-500"
      onBack={onCancel}
    >
      <form onSubmit={onSave} className="max-w-xl space-y-6">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Categoria (Tipo)</label>
            <select
              required
              value={formData.categoryId}
              onChange={e => onChange({ ...formData, categoryId: e.target.value })}
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
                onChange={e => onChange({ ...formData, newCategoryName: e.target.value })}
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
              onChange={e => onChange({ ...formData, subtypeName: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              placeholder="Ex: Manutenção de Ar-condicionado"
            />
            <p className="mt-1 text-xs text-slate-500">
              Este é o nome que aparecerá na hora de lançar a conta a pagar.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button type="button" onClick={onCancel}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 shadow-sm disabled:opacity-60">
            <Save size={18} />
            {saving ? 'Salvando...' : 'Salvar Item'}
          </button>
        </div>
      </form>
    </SettingsSubPage>
  );
};

export default ExpenseTypeForm;
