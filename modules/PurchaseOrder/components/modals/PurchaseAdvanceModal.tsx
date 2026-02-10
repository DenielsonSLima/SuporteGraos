
import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, Wallet, FileText, ArrowRight, ArrowDownLeft } from 'lucide-react';
import { financialService, BankAccountWithBalance } from '../../../../services/financialService';
import { getLocalDateString } from '../../../../utils/dateUtils';
import { BankAccount } from '../../../Financial/types';
import { useToast } from '../../../../contexts/ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: any) => void;
  partnerName: string;
}

const PurchaseAdvanceModal: React.FC<Props> = ({ isOpen, onClose, onConfirm, partnerName }) => {
  const { addToast } = useToast();
  
  const [date, setDate] = useState(getLocalDateString());
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [bankAccounts, setBankAccounts] = useState<BankAccountWithBalance[]>([]);

  const formatBRL = (val: number) => {
    const normalized = Math.abs(val) < 0.01 ? 0 : val;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(normalized);
  };

  useEffect(() => {
    if (isOpen) {
      const sorted = financialService.getBankAccountsWithBalances()
        .filter(acc => acc.active !== false)
        .sort((a, b) => a.bankName.localeCompare(b.bankName));
      setBankAccounts(sorted);
      setAmount('');
      setAccountId('');
      setNotes('');
      setDate(getLocalDateString());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valAmount = parseFloat(amount);
    if (!valAmount || valAmount <= 0) return addToast('warning', 'Valor Inválido');
    if (!accountId) return addToast('warning', 'Conta Obrigatória');

    const selectedAccount = bankAccounts.find(a => a.id === accountId);
    onConfirm({ date, value: valAmount, accountId, accountName: selectedAccount?.bankName || 'Caixa', notes: notes || 'Adiantamento de Compra' });
  };

  const inputClass = 'w-full border-2 border-slate-200 rounded-xl bg-white text-slate-900 font-bold px-4 py-2.5 focus:border-amber-500 outline-none transition-all placeholder:text-slate-300 text-sm';
  const labelClass = 'block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest ml-1';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 border border-white/20">
        <div className="px-8 py-5 flex justify-between items-center text-white bg-amber-600">
          <div><h3 className="font-black text-lg flex items-center gap-2 uppercase italic tracking-tighter"><ArrowDownLeft size={20}/>Novo Adiantamento</h3><p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mt-0.5">{partnerName}</p></div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-5 bg-white">
          <div className="grid grid-cols-2 gap-4">
             <div><label className={labelClass}>Data</label><input type="date" required value={date} onChange={e => setDate(e.target.value)} className={inputClass} /></div>
             <div><label className={labelClass}>Valor (R$)</label><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={`${inputClass} pl-10 text-amber-600`} placeholder="0,00" required /></div></div>
          </div>
          <div>
            <label className={labelClass}>Conta de Saída (Saldo em Tempo Real)</label>
            <div className="relative"><Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><select required value={accountId} onChange={e => setAccountId(e.target.value)} className={`${inputClass} pl-12 appearance-none`}><option value="">Selecione o banco...</option>{bankAccounts.map(acc => (<option key={acc.id} value={acc.id}>{acc.bankName} - {acc.owner} (Saldo: {formatBRL(acc.currentBalance)})</option>))}</select><ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} /></div>
          </div>
          <div><label className={labelClass}>Histórico / Observações</label><div className="relative"><FileText className="absolute left-3 top-3 text-slate-300" size={18} /><textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className={`${inputClass} pl-10 text-xs font-medium`} placeholder="Notas..." /></div></div>
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-500 font-black uppercase text-xs">Cancelar</button>
            <button type="submit" className="px-8 py-3 rounded-xl bg-amber-600 text-white font-black uppercase text-xs shadow-lg transition-all active:scale-95">Confirmar Adiantamento</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PurchaseAdvanceModal;
