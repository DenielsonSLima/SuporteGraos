import React from 'react';
import {
  Landmark, Plus, Pencil, Trash2, Search, Power,
  ShieldCheck, ShieldAlert, AlertTriangle
} from 'lucide-react';
import SettingsSubPage from '../../components/SettingsSubPage';
import type { Account } from '../../../../hooks/useAccounts';
import ActionConfirmationModal from '../../../../components/ui/ActionConfirmationModal';
import { SkeletonTableRows } from '../../../../components/ui/SkeletonTable';

interface BankAccountListProps {
  accounts: Account[];
  isLoading: boolean;
  searchTerm: string;
  accountToDelete: Account | null;
  onSearchChange: (term: string) => void;
  onAddNew: () => void;
  onEdit: (account: Account) => void;
  onToggleStatus: (account: Account) => void;
  onDeleteRequest: (account: Account) => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onBack: () => void;
}

const BankAccountList: React.FC<BankAccountListProps> = ({
  accounts,
  isLoading,
  searchTerm,
  accountToDelete,
  onSearchChange,
  onAddNew,
  onEdit,
  onToggleStatus,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
  onBack,
}) => {
  return (
    <SettingsSubPage title="Contas Bancárias" description="Cadastro de bancos, agências e contas correntes." icon={Landmark} color="bg-cyan-500" onBack={onBack}>
      <div className="mb-6 flex items-center justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="text" value={searchTerm} onChange={e => onSearchChange(e.target.value)} placeholder="Buscar banco ou titular..." className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 focus:border-cyan-500 outline-none" />
        </div>
        <button onClick={onAddNew} className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700">
          <Plus size={18} /> Nova Conta
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-6 py-4">Instituição / Status</th>
              <th className="px-6 py-4">Agência / Conta</th>
              <th className="px-6 py-4">Titular</th>
              <th className="px-6 py-4">Saldo Negativo</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <SkeletonTableRows rows={4} cols={5} />
            ) : accounts.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-500">Nenhuma conta encontrada.</td></tr>
            ) : accounts.map(a => {
              const isActive = a.is_active !== false;
              return (
                <tr key={a.id} className={`hover:bg-slate-50 transition-colors ${!isActive ? 'opacity-60 bg-slate-50' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isActive ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-200 text-slate-400'}`}>
                        <Landmark size={16} />
                      </div>
                      <div>
                        <span className={`font-semibold ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>{a.account_name}</span>
                        {!isActive && <span className="ml-2 text-[9px] font-black uppercase bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded">Inativa</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-600">
                    {a.agency || a.account_number ? (
                      <>
                        {a.agency && <span>Ag: {a.agency}</span>}
                        {a.agency && a.account_number && <span className="mx-2 text-slate-300">|</span>}
                        {a.account_number && <span>CC: {a.account_number}</span>}
                      </>
                    ) : <span className="text-slate-400 italic">Não informado</span>}
                  </td>
                  <td className="px-6 py-4">{a.owner || <span className="text-slate-400 italic">-</span>}</td>
                  <td className="px-6 py-4">
                    {a.allows_negative ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                        <ShieldAlert size={12} /> Permitido
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        <ShieldCheck size={12} /> Bloqueado
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => onToggleStatus(a)} className={`rounded-lg p-2 transition-colors ${isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`} title={isActive ? 'Desativar' : 'Ativar'}>
                        <Power size={18} />
                      </button>
                      <button onClick={() => onEdit(a)} className="rounded p-1 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors" title="Editar">
                        <Pencil size={18} />
                      </button>
                      <button onClick={() => onDeleteRequest(a)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Excluir">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ActionConfirmationModal
        isOpen={!!accountToDelete}
        onClose={onDeleteCancel}
        onConfirm={onDeleteConfirm}
        title="Excluir Conta Bancária?"
        description={
          <div className="space-y-3">
            <p>Tem certeza que deseja desativar a conta <strong>{accountToDelete?.account_name}</strong>?</p>
            <div className="p-3 bg-red-50 border border-red-100 rounded text-red-700 text-xs font-bold flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <p>A conta será desativada e não aparecerá mais nos registros financeiros.</p>
            </div>
          </div>
        }
        type="danger"
        confirmLabel="Sim, Desativar"
      />
    </SettingsSubPage>
  );
};

export default BankAccountList;
