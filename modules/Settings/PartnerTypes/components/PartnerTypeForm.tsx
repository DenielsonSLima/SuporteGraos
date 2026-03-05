import React from 'react';
import { Tags, Save, Lock } from 'lucide-react';
import SettingsSubPage from '../../components/SettingsSubPage';

interface PartnerTypeFormData {
  name: string;
  description: string;
}

interface PartnerTypeFormProps {
  formData: PartnerTypeFormData;
  editingId: string | null;
  isEditingSystemType: boolean;
  onChange: (data: PartnerTypeFormData) => void;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
}

const PartnerTypeForm: React.FC<PartnerTypeFormProps> = ({
  formData,
  editingId,
  isEditingSystemType,
  onChange,
  onSave,
  onCancel,
}) => {
  return (
    <SettingsSubPage
      title={editingId ? "Editar Tipo" : "Novo Tipo de Parceiro"}
      description="Defina a categoria para classificar seus parceiros comerciais."
      icon={Tags}
      color="bg-violet-500"
      onBack={onCancel}
    >
      <form onSubmit={onSave} className="max-w-2xl space-y-6">

        {isEditingSystemType && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex items-start gap-3">
            <Lock className="shrink-0 mt-0.5" size={18} />
            <div>
              <p className="font-bold">Registro de Sistema</p>
              <p>O nome desta categoria é protegido e não pode ser alterado para garantir a integridade dos relatórios, mas você pode editar a descrição.</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nome da Categoria</label>
            <input
              type="text"
              name="name"
              required
              disabled={isEditingSystemType}
              value={formData.name}
              onChange={e => onChange({ ...formData, name: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 disabled:bg-slate-100 disabled:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              placeholder="Ex: Consultor Agrícola"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Descrição</label>
            <textarea
              name="description"
              rows={3}
              value={formData.description}
              onChange={e => onChange({ ...formData, description: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              placeholder="Descreva a finalidade desta categoria..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            <Save size={18} />
            Salvar
          </button>
        </div>
      </form>
    </SettingsSubPage>
  );
};

export default PartnerTypeForm;
