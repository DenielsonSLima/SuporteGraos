
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Landmark, 
  Plus, 
  Pencil, 
  Trash2, 
  Save, 
  Search,
  Building,
  CreditCard,
  User,
  Hash,
  Power,
  AlertTriangle,
  ShieldAlert
} from 'lucide-react';
import SettingsSubPage from '../components/SettingsSubPage';
import { financialService } from '../../../services/financialService';
import { BankAccount } from '../../Financial/types';
import ActionConfirmationModal from '../../../components/ui/ActionConfirmationModal';
import { useToast } from '../../../contexts/ToastContext';

const uuidv4 = () => {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    const hex = Array.from(bytes, toHex).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  }
  // Fallback (não criptográfico, apenas para ambientes sem crypto)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

interface Props {
  onBack: () => void;
}

const BankAccountsSettings: React.FC<Props> = ({ onBack }) => {
  const { addToast } = useToast();
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for deletion
  const [accountToDelete, setAccountToDelete] = useState<BankAccount | null>(null);

  // Data from Service
  const [accounts, setAccounts] = useState<BankAccount[]>([]);

  useEffect(() => {
    const unsubscribe = financialService.subscribeBankAccounts(items => setAccounts(items));
    
    setAccounts(financialService.getBankAccounts());
    
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const refreshList = () => {
    setAccounts(financialService.getBankAccounts());
  };

  const initialFormState = {
    bankName: '',
    owner: '',
    agency: '',
    accountNumber: '',
    active: true
  };

  const [formData, setFormData] = useState(initialFormState);

  // Actions
  const handleAddNew = () => {
    setFormData(initialFormState);
    setEditingId(null);
    setViewMode('form');
  };

  const handleEdit = (account: BankAccount) => {
    setFormData({
      bankName: account.bankName,
      owner: account.owner || '',
      agency: account.agency || '',
      accountNumber: account.accountNumber || '',
      active: account.active !== false
    });
    setEditingId(account.id);
    setViewMode('form');
  };

  const confirmDelete = async () => {
    if (accountToDelete) {
      try {
        await financialService.deleteBankAccount(accountToDelete.id);
        refreshList();
        addToast('success', 'Conta Removida', 'A conta bancária foi excluída com sucesso.');
      } catch (error: any) {
        addToast('error', 'Erro ao Excluir', error.message);
      }
      setAccountToDelete(null);
    }
  };

  const handleToggleStatus = async (account: BankAccount) => {
    const newStatus = account.active === false ? true : false;
    try {
      await financialService.updateBankAccount({ ...account, active: newStatus });
      refreshList();
      addToast(
        newStatus ? 'success' : 'info', 
        newStatus ? 'Conta Ativada' : 'Conta Desativada', 
        `A conta ${account.bankName} foi ${newStatus ? 'ativada' : 'desativada'}.`
      );
    } catch (error: any) {
      addToast('error', 'Erro ao Atualizar', error.message);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        await financialService.updateBankAccount({ ...formData, id: editingId });
        addToast('success', 'Cadastro Atualizado', 'Conta bancária salva com sucesso.');
      } else {
        const newAccount = { 
          ...formData, 
          id: uuidv4(),
          active: true
        };
        await financialService.addBankAccount(newAccount);
        addToast('success', 'Conta Cadastrada', 'Conta bancária criada com sucesso.');
      }
      
      refreshList();
      setViewMode('list');
    } catch (error: any) {
      addToast('error', 'Erro ao Salvar', error.message);
    }
  };

  // --- LOGIC: FILTER & ALPHABETICAL SORT ---
  const filteredAccounts = useMemo(() => {
    return accounts
      .filter(a => 
        a.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.owner && a.owner.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .sort((a, b) => a.bankName.localeCompare(b.bankName));
  }, [accounts, searchTerm]);

  // --- RENDER FORM ---
  if (viewMode === 'form') {
    return (
      <SettingsSubPage
        title={editingId ? "Editar Conta Bancária" : "Nova Conta Bancária"}
        description="Cadastre as contas onde serão realizados os lançamentos financeiros."
        icon={Landmark}
        color="bg-cyan-500"
        onBack={() => setViewMode('list')}
      >
        <form onSubmit={handleSave} className="max-w-2xl space-y-6">
          
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800 border-b border-slate-200 pb-2">
              <Building size={18} className="text-slate-500" />
              Dados da Conta
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Nome do Banco / Identificação <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.bankName}
                  onChange={e => setFormData({...formData, bankName: e.target.value})}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  placeholder="Ex: Banco do Brasil, Bradesco, Cofre..."
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Titular da Conta (Opcional)</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={formData.owner}
                    onChange={e => setFormData({...formData, owner: e.target.value})}
                    className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2 text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    placeholder="Nome do titular"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Agência (Opcional)</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={formData.agency}
                      onChange={e => setFormData({...formData, agency: e.target.value})}
                      className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2 text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      placeholder="0000"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Conta Corrente (Opcional)</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={formData.accountNumber}
                      onChange={e => setFormData({...formData, accountNumber: e.target.value})}
                      className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2 text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      placeholder="00000-0"
                    />
                  </div>
                </div>
              </div>
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
              className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
            >
              <Save size={18} />
              Salvar Conta
            </button>
          </div>
        </form>
      </SettingsSubPage>
    );
  }

  // --- RENDER LIST ---
  return (
    <SettingsSubPage
      title="Contas Bancárias"
      description="Cadastro de bancos, agências e contas correntes."
      icon={Landmark}
      color="bg-cyan-500"
      onBack={onBack}
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar banco ou titular..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <button 
          onClick={handleAddNew}
          className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-700"
        >
          <Plus size={18} />
          Nova Conta
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-6 py-4">Instituição / Status</th>
              <th className="px-6 py-4">Agência / Conta</th>
              <th className="px-6 py-4">Titular</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAccounts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                  Nenhuma conta encontrada.
                </td>
              </tr>
            ) : (
              filteredAccounts.map((account) => {
                const isActive = account.active !== false;
                const inUse = financialService.isAccountInUse(account.id);
                return (
                  <tr key={account.id} className={`hover:bg-slate-50 transition-colors ${!isActive ? 'opacity-60 bg-slate-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isActive ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-200 text-slate-400'}`}>
                          <Landmark size={16} />
                        </div>
                        <div>
                          <span className={`font-semibold ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>{account.bankName}</span>
                          {!isActive && <span className="ml-2 text-[9px] font-black uppercase bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded">Inativa</span>}
                          {inUse && <span className="ml-2 text-[8px] font-bold uppercase text-slate-400 border border-slate-200 px-1 rounded">C/ Histórico</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600">
                      {account.agency || account.accountNumber ? (
                        <>
                          {account.agency && <span>Ag: {account.agency}</span>}
                          {account.agency && account.accountNumber && <span className="mx-2 text-slate-300">|</span>}
                          {account.accountNumber && <span>CC: {account.accountNumber}</span>}
                        </>
                      ) : (
                        <span className="text-slate-400 italic">Não informado</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                       {account.owner || <span className="text-slate-400 italic">-</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleToggleStatus(account)}
                          className={`rounded-lg p-2 transition-colors ${isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                          title={isActive ? "Desativar Conta" : "Ativar Conta"}
                        >
                          <Power size={18} />
                        </button>
                        <button 
                          onClick={() => handleEdit(account)}
                          className="rounded p-1 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={18} />
                        </button>
                        <button 
                          onClick={() => setAccountToDelete(account)}
                          className={`rounded p-1 transition-colors ${inUse ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:bg-red-50 hover:text-red-600'}`}
                          disabled={inUse}
                          title={inUse ? "Não pode ser excluída pois tem movimentações" : "Excluir"}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <ActionConfirmationModal 
        isOpen={!!accountToDelete}
        onClose={() => setAccountToDelete(null)}
        onConfirm={confirmDelete}
        title="Excluir Conta Bancária?"
        description={
          <div className="space-y-3">
             <p>Tem certeza que deseja remover a conta <strong>{accountToDelete?.bankName}</strong>?</p>
             <div className="p-3 bg-red-50 border border-red-100 rounded text-red-700 text-xs font-bold flex items-start gap-2">
               <AlertTriangle size={16} className="shrink-0" />
               <p>Esta ação apagará o registro da conta.</p>
             </div>
          </div>
        }
        type="danger"
        confirmLabel="Sim, Excluir"
      />
    </SettingsSubPage>
  );
};

export default BankAccountsSettings;
