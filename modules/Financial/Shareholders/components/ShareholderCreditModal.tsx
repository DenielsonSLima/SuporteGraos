
import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Calendar, DollarSign, FileText, TrendingUp, Pencil, CheckSquare, Square, Wallet, ArrowDown, User } from 'lucide-react';
import type { Account } from '../../../../services/accountsService';
import { useAccounts } from '../../../../hooks/useAccounts';
import { getLocalDateString } from '../../../../utils/dateUtils';
import type { Shareholder } from '../../../../services/shareholderService';
import { useToast } from '../../../../contexts/ToastContext';
import ModalPortal from '../../../../components/ui/ModalPortal';
import { formatAccountLabel } from '../../../../utils/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { shareholderId: string; date: string; value: number; description: string; payImmediately?: boolean; accountId?: string; accountName?: string }) => void;
  shareholderName?: string;
  shareholders?: Shareholder[]; 
  initialData?: {
    date: string;
    value: number;
    description: string;
  };
}

const ShareholderCreditModal: React.FC<Props> = ({ isOpen, onClose, onConfirm, shareholderName, shareholders = [], initialData }) => {
  const { addToast } = useToast();
  
  const [selectedShareholderId, setSelectedShareholderId] = useState('');
  const [date, setDate] = useState(getLocalDateString());
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('Pro-labore Mensal');
  const [payImmediately, setPayImmediately] = useState(false);
  const [accountId, setAccountId] = useState('');
  const { data: allBankAccounts = [] } = useAccounts();
  const bankAccounts = React.useMemo(() => allBankAccounts.sort((a, b) => a.account_name.localeCompare(b.account_name)), [allBankAccounts]);

  const formatBRL = (val: number) => {
    const normalized = Math.abs(val) < 0.01 ? 0 : val;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(normalized);
  };

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setDate(initialData.date?.split('T')[0] || getLocalDateString());
        setValue(initialData.value.toString());
        setDescription(initialData.description);
        setPayImmediately(false);
      } else {
        setDate(getLocalDateString());
        setValue('');
        setDescription('Pro-labore Mensal');
        setPayImmediately(false);
        setAccountId('');
        setSelectedShareholderId('');
      }

    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const finalId = shareholderName 
      ? shareholders.find(s => s.name === shareholderName)?.id 
      : selectedShareholderId;

    if (!finalId) return addToast('warning', 'Sócio Obrigatório');
    const val = parseFloat(value);
    if (!val || val <= 0) return addToast('warning', 'Valor Inválido');
    if (payImmediately && !accountId) return addToast('warning', 'Conta Obrigatória');

    const account = bankAccounts.find(a => a.id === accountId);
    
    setIsSubmitting(true);
    try {
      await onConfirm({
        shareholderId: finalId, 
        date, 
        value: val, 
        description, 
        payImmediately,
        accountId: payImmediately ? accountId : undefined,
        accountName: payImmediately ? (account?.account_name || 'Conta') : undefined
      });
      onClose();
    } catch (error) {
       addToast('error', 'Erro ao salvar', 'Ocorreu um erro ao processar o crédito do sócio.');
    } finally {
       setIsSubmitting(false);
    }
  };

  const inputClass = 'w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-2xl bg-white text-slate-900 font-black focus:border-indigo-500 focus:ring-0 outline-none transition-all placeholder:text-slate-300 text-sm';
  const labelClass = 'block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-widest ml-1';

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 border border-white/20">
        <div className="bg-indigo-600 px-8 py-6 flex justify-between items-center text-white">
          <h3 className="font-black text-xl flex items-center gap-2 uppercase italic tracking-tighter"><TrendingUp size={24} />{initialData ? 'Editar Crédito' : 'Lançar Novo Crédito'}</h3>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors"><X size={28} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-slate-50/30">
          {!shareholderName && !initialData && (
            <div>
              <label className={labelClass}>Sócio Favorecido</label>
              <div className="relative"><User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} /><select required className={`${inputClass} appearance-none`} value={selectedShareholderId} onChange={e => setSelectedShareholderId(e.target.value)}><option value="">Escolha um sócio...</option>{shareholders.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}</select><ArrowDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} /></div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Data Ref.</label><input type="date" required value={date} onChange={e => setDate(e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Valor</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-black">R$</span><input type="number" step="0.01" required value={value} onChange={e => setValue(e.target.value)} className={`${inputClass} pl-9 text-lg text-emerald-700`} placeholder="0,00" /></div></div>
          </div>
          <div><label className={labelClass}>Histórico</label><textarea rows={2} required value={description} onChange={e => setDescription(e.target.value)} className={`${inputClass} pl-10 h-20 py-3 resize-none font-bold italic`} placeholder="Motivo..." /></div>
          {!initialData && (
            <div className={`p-5 rounded-3xl border-2 transition-all ${payImmediately ? 'bg-indigo-50 border-indigo-300 shadow-md' : 'bg-white border-slate-200'}`}>
                <label className="flex items-start gap-4 cursor-pointer select-none" onClick={() => setPayImmediately(!payImmediately)}><div className={`p-1 rounded-lg transition-colors ${payImmediately ? 'text-indigo-600' : 'text-slate-300'}`}>{payImmediately ? <CheckSquare size={24} /> : <Square size={24} />}</div><div className="flex-1"><p className="text-sm font-black text-slate-800 uppercase leading-none">Pagar Imediatamente?</p><p className="text-[10px] text-slate-500 font-bold mt-1.5 uppercase leading-tight">Registra a saída bancária agora.</p></div></label>
                {payImmediately && (
                  <div className="mt-5 space-y-2 animate-in slide-in-from-top-2">
                     <label className={labelClass}>Conta Bancária (Saldo em Tempo Real)</label>
                     <div className="relative"><Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} /><select required value={accountId} onChange={e => setAccountId(e.target.value)} className={`${inputClass} pl-10 appearance-none`}><option value="">Selecione a Conta...</option>{bankAccounts.map(acc => (<option key={acc.id} value={acc.id}>{formatAccountLabel(acc.account_name, acc.owner, acc.balance)}</option>))}</select><ArrowDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} /></div>
                  </div>
                )}
            </div>
          )}
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={isSubmitting}
              className="px-8 py-3.5 border-2 border-slate-200 rounded-2xl text-slate-500 font-black uppercase text-xs disabled:opacity-50"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-10 py-3.5 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={18} /> {isSubmitting ? 'Salvando...' : (payImmediately ? 'Confirmar e Pagar' : 'Confirmar Lançamento')}
            </button>
          </div>
        </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default ShareholderCreditModal;
