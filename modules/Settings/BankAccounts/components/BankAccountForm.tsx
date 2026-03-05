import React from 'react';
import {
  Landmark, Save,
  Building, User, Hash,
  ShieldCheck, ShieldAlert
} from 'lucide-react';
import SettingsSubPage from '../../components/SettingsSubPage';

interface BankAccountFormData {
  account_name: string;
  owner: string;
  agency: string;
  account_number: string;
  is_active: boolean;
  allows_negative: boolean;
}

interface BankAccountFormProps {
  formData: BankAccountFormData;
  editingId: string | null;
  onChange: (data: BankAccountFormData) => void;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
}

const BankAccountForm: React.FC<BankAccountFormProps> = ({
  formData,
  editingId,
  onChange,
  onSave,
  onCancel,
}) => {
  return (
    <SettingsSubPage title={editingId ? 'Editar Conta' : 'Nova Conta'} description="Cadastre as contas onde serão realizados os lançamentos financeiros." icon={Landmark} color="bg-cyan-500" onBack={onCancel}>
      <form onSubmit={onSave} className="max-w-2xl space-y-6">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800 border-b border-slate-200 pb-2">
            <Building size={18} className="text-slate-500" /> Dados da Conta
          </h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nome do Banco / Identificação <span className="text-red-500">*</span></label>
              <input type="text" required value={formData.account_name} onChange={e => onChange({ ...formData, account_name: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-cyan-500 outline-none" placeholder="Ex: Banco do Brasil, Bradesco, Cofre..." />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Titular (Opcional)</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="text" value={formData.owner} onChange={e => onChange({ ...formData, owner: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2 text-slate-900 focus:border-cyan-500 outline-none" placeholder="Nome do titular" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Agência (Opcional)</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={formData.agency} onChange={e => onChange({ ...formData, agency: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2 text-slate-900 focus:border-cyan-500 outline-none" placeholder="0000" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Nº Conta (Opcional)</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={formData.account_number} onChange={e => onChange({ ...formData, account_number: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2 text-slate-900 focus:border-cyan-500 outline-none" placeholder="00000-0" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Política de Saldo Negativo ── */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800 border-b border-slate-200 pb-2">
            {formData.allows_negative ? <ShieldAlert size={18} className="text-amber-500" /> : <ShieldCheck size={18} className="text-emerald-500" />}
            Política de Saldo Negativo
          </h3>
          <div className="flex items-start gap-4">
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={formData.allows_negative}
                onChange={e => onChange({ ...formData, allows_negative: e.target.checked })}
                className="peer sr-only"
              />
              <div className="h-6 w-11 rounded-full bg-slate-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-amber-500 peer-checked:after:translate-x-full" />
            </label>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {formData.allows_negative ? 'Permite saldo negativo' : 'Bloqueia saldo negativo'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {formData.allows_negative
                  ? 'Transações que resultem em saldo negativo serão permitidas, mas o sistema exibirá um aviso.'
                  : 'Transações que resultem em saldo negativo serão bloqueadas automaticamente.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button>
          <button type="submit" className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"><Save size={18} /> Salvar Conta</button>
        </div>
      </form>
    </SettingsSubPage>
  );
};

export default BankAccountForm;
