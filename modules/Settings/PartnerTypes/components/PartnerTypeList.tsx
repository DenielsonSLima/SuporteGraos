import React from 'react';
import {
  Tags, Plus, Pencil, Trash2, Search,
  Lock, ShieldCheck
} from 'lucide-react';
import SettingsSubPage from '../../components/SettingsSubPage';
import type { PartnerType } from '../../../../services/classificationService';
import { SkeletonTableRows } from '../../../../components/ui/SkeletonTable';

interface PartnerTypeListProps {
  types: PartnerType[];
  isLoading: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onAddNew: () => void;
  onEdit: (type: PartnerType) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

const PartnerTypeList: React.FC<PartnerTypeListProps> = ({
  types,
  isLoading,
  searchTerm,
  onSearchChange,
  onAddNew,
  onEdit,
  onDelete,
  onBack,
}) => {
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
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar categorias..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
        <button
          onClick={onAddNew}
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
            {isLoading ? (
              <SkeletonTableRows rows={5} cols={4} />
            ) : types.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                  Nenhum tipo encontrado.
                </td>
              </tr>
            ) : (
              types.map((type) => (
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
                        onClick={() => onEdit(type)}
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
                          onClick={() => onDelete(type.id)}
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

export default PartnerTypeList;
