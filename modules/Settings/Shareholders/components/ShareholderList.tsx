import React from 'react';
import {
  Handshake, Plus, Pencil, Trash2, Search,
  User, Phone, Mail, MapPin, AlertTriangle
} from 'lucide-react';
import SettingsSubPage from '../../components/SettingsSubPage';
import type { Shareholder } from '../../../../services/shareholderService';
import ActionConfirmationModal from '../../../../components/ui/ActionConfirmationModal';
import { SkeletonTableRows } from '../../../../components/ui/SkeletonTable';

interface ShareholderListProps {
  shareholders: Shareholder[];
  isLoading: boolean;
  searchTerm: string;
  shareholderToDelete: Shareholder | null;
  onSearchChange: (term: string) => void;
  onAddNew: () => void;
  onEdit: (shareholder: Shareholder) => void;
  onDeleteRequest: (shareholder: Shareholder) => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onBack: () => void;
}

const ShareholderList: React.FC<ShareholderListProps> = ({
  shareholders,
  isLoading,
  searchTerm,
  shareholderToDelete,
  onSearchChange,
  onAddNew,
  onEdit,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
  onBack,
}) => {
  return (
    <SettingsSubPage
      title="Sócios"
      description="Gerencie os sócios da empresa. Estes dados podem ser utilizados em contratos e assinaturas."
      icon={Handshake}
      color="bg-emerald-500"
      onBack={onBack}
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar sócio por nome ou CPF..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <button
          onClick={onAddNew}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          <Plus size={18} />
          Novo Sócio
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-6 py-4">Nome / CPF</th>
              <th className="px-6 py-4">Contato</th>
              <th className="hidden px-6 py-4 md:table-cell">Endereço</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <SkeletonTableRows rows={5} cols={4} />
            ) : shareholders.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                  {searchTerm ? 'Nenhum sócio corresponde à busca.' : 'Nenhum sócio cadastrado. Clique em "Novo Sócio" para começar.'}
                </td>
              </tr>
            ) : (
              shareholders.map((socio) => (
                <tr key={socio.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <User size={16} />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{socio.name}</div>
                        <div className="text-xs text-slate-500">{socio.cpf}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <Phone size={14} className="text-slate-400" />
                        <span>{socio.phone || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Mail size={14} className="text-slate-400" />
                        <span className="truncate max-w-[150px]">{socio.email || '-'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-6 py-4 md:table-cell">
                    <div className="flex items-start gap-1.5">
                      <MapPin size={14} className="mt-0.5 text-slate-400 shrink-0" />
                      <span className="line-clamp-2">
                        {socio.address.city}/{socio.address.state}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEdit(socio)}
                        className="rounded p-1 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => onDeleteRequest(socio)}
                        className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <ActionConfirmationModal
        isOpen={!!shareholderToDelete}
        onClose={onDeleteCancel}
        onConfirm={onDeleteConfirm}
        title="Excluir Sócio?"
        description={
          <div className="space-y-3">
            <p>Tem certeza que deseja remover o cadastro de <strong>{shareholderToDelete?.name}</strong>?</p>
            <div className="p-3 bg-red-50 border border-red-100 rounded text-red-700 text-xs font-bold flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <p>Atenção: Isso removerá o registro cadastral, mas transações financeiras históricas já realizadas podem ser mantidas para auditoria do caixa.</p>
            </div>
          </div>
        }
        type="danger"
        confirmLabel="Sim, Excluir"
      />
    </SettingsSubPage>
  );
};

export default ShareholderList;
