
import React, { useState, useEffect } from 'react';
import { 
  Tags, 
  Plus, 
  Pencil, 
  Trash2, 
  Save, 
  X, 
  Search,
  Lock,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import SettingsSubPage from '../components/SettingsSubPage';
import { classificationService, PartnerType } from '../../../services/classificationService';

interface Props {
  onBack: () => void;
}

const PartnerTypesSettings: React.FC<Props> = ({ onBack }) => {
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Initial Data now comes from Service
  const [types, setTypes] = useState<PartnerType[]>([]);

  useEffect(() => {
    setTypes(classificationService.getPartnerTypes());
  }, []);

  const refreshList = () => {
    setTypes(classificationService.getPartnerTypes());
  };

  const initialFormState = {
    name: '',
    description: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  // Actions
  const handleAddNew = () => {
    setFormData(initialFormState);
    setEditingId(null);
    setViewMode('form');
  };

  const handleEdit = (type: PartnerType) => {
    setFormData({
      name: type.name,
      description: type.description
    });
    setEditingId(type.id);
    setViewMode('form');
  };

  const handleDelete = async (id: string) => {
    const type = types.find(t => t.id === id);
    if (type?.isSystem) {
      alert('Este é um registro padrão do sistema e não pode ser excluído.');
      return;
    }
    if (window.confirm('Tem certeza que deseja remover este tipo de parceiro?')) {
      await classificationService.deletePartnerType(id);
      refreshList();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      // Update existing
      const existing = types.find(t => t.id === editingId);
      if (existing) {
        await classificationService.updatePartnerType({ 
          ...existing, 
          name: existing.isSystem ? existing.name : formData.name,
          description: formData.description
        });
      }
    } else {
      // Create new
      await classificationService.addPartnerType({
        ...formData,
        id: Math.random().toString(36).substr(2, 9),
        isSystem: false
      });
    }

    refreshList();
    setViewMode('list');
  };

  const handleCancel = () => {
    setViewMode('list');
  };

  const isEditingSystemType = editingId ? types.find(t => t.id === editingId)?.isSystem : false;

  const filteredTypes = types.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- RENDER FORM ---
  if (viewMode === 'form') {
    return (
      <SettingsSubPage
        title={editingId ? "Editar Tipo" : "Novo Tipo de Parceiro"}
        description="Defina a categoria para classificar seus parceiros comerciais."
        icon={Tags}
        color="bg-violet-500"
        onBack={handleCancel}
      >
        <form onSubmit={handleSave} className="max-w-2xl space-y-6">
          
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
                disabled={!!isEditingSystemType}
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
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
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                placeholder="Descreva a finalidade desta categoria..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCancel}
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
  }

  // --- RENDER LIST ---
  return (
    <SettingsSubPage
      title="Tipos de Parceiros"
      description="Categorização de clientes, fornecedores e transportadoras."
      icon={Tags}
      color="bg-violet-500"
      onBack={onBack}
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar categorias..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
        <button 
          onClick={handleAddNew}
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700"
        >
          <Plus size={18} />
          Novo Tipo
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-6 py-4">Nome</th>
              <th className="px-6 py-4">Descrição</th>
              <th className="px-6 py-4">Tipo</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTypes.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                  Nenhum tipo encontrado.
                </td>
              </tr>
            ) : (
              filteredTypes.map((type) => (
                <tr key={type.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {type.name}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {type.description}
                  </td>
                  <td className="px-6 py-4">
                    {type.isSystem ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                        <ShieldCheck size={12} />
                        Padrão
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                        Personalizado
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleEdit(type)}
                        className="rounded p-1 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={18} />
                      </button>
                      
                      {type.isSystem ? (
                        <div className="p-1 text-slate-300" title="Protegido pelo sistema">
                          <Lock size={18} />
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleDelete(type.id)}
                          className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </SettingsSubPage>
  );
};

export default PartnerTypesSettings;
