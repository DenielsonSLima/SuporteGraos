
import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, Wallet, FileText, ArrowDown, MinusCircle, AlertTriangle, Truck, Coins } from 'lucide-react';
import { financialService, BankAccountWithBalance } from '../../../../services/financialService';
import { advanceService } from '../../../Financial/Advances/services/advanceService';
import { BankAccount } from '../../../Financial/types';
import { useToast } from '../../../../contexts/ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: any) => void;
  totalPending: number; 
  recordDescription?: string;
  initialData?: any; 
  type?: 'payment' | 'advance';
  isProcessing?: boolean;
}

const FreightPaymentModal: React.FC<Props> = ({ isOpen, onClose, onConfirm, totalPending, recordDescription, initialData, type = 'payment', isProcessing = false }) => {
  const { addToast } = useToast();
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState(''); 
  const [discount, setDiscount] = useState(''); 
  const [accountId, setAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [bankAccounts, setBankAccounts] = useState<BankAccountWithBalance[]>([]);
  
  const [availableCredit, setAvailableCredit] = useState(0);
  const [useAdvanceBalance, setUseAdvanceBalance] = useState(false);

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

      if (recordDescription) {
        const summary = advanceService.getSummaries().find(s => recordDescription.includes(s.partnerName));
        if (summary && summary.netBalance > 0) setAvailableCredit(summary.netBalance);
        else setAvailableCredit(0);
      }

      if (initialData) {
        setDate(initialData.date);
        setAmount(initialData.value?.toString() || '');
        setDiscount(initialData.discountValue?.toString() || '');
        setAccountId(initialData.accountId || '');
        setNotes(initialData.notes || '');
      } else {
        setDate(new Date().toISOString().split('T')[0]);
        setAmount(totalPending > 0 ? totalPending.toFixed(2) : '');
        setDiscount('');
        setAccountId('');
        setNotes('');
        setUseAdvanceBalance(false);
      }
    }
  }, [isOpen, totalPending, initialData, recordDescription]);

  if (!isOpen) return null;

  const valAmount = parseFloat(amount) || 0;
  const valDiscount = parseFloat(discount) || 0;
  const totalOperation = valAmount + valDiscount;
  const isCashMovement = valAmount > 0 && !useAdvanceBalance;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalOperation <= 0) return addToast('warning', 'Valores Zerados');
    if (useAdvanceBalance && valAmount > availableCredit) return addToast('error', 'Saldo Insuficiente');
    if (isCashMovement && !accountId) return addToast('warning', 'Conta Obrigatória');

    const selectedAccount = bankAccounts.find(a => a.id === accountId);
    const finalAccountId = isCashMovement ? accountId : (useAdvanceBalance ? 'advance_virtual' : 'discount_virtual');
    const finalAccountName = isCashMovement ? (selectedAccount?.bankName || 'Caixa') : (useAdvanceBalance ? 'SALDO ADIANTAMENTO' : 'ABATIMENTO/QUEBRA');

    onConfirm({ date, amount: valAmount, discount: valDiscount, accountId: finalAccountId, accountName: finalAccountName, notes: notes, isAsset: false, useAdvanceBalance });
  };

  const inputClass = 'w-full border-2 border-slate-200 rounded-xl bg-white text-slate-900 font-bold px-4 py-2.5 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 text-sm';
  const labelClass = 'block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest ml-1';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 border border-white/20">
        <div className={`px-8 py-5 flex justify-between items-center text-white ${type === 'advance' ? 'bg-amber-600' : 'bg-blue-600'}`}>
          <div><h3 className="font-black text-lg flex items-center gap-2 uppercase italic tracking-tighter"><Truck size={20}/>{initialData ? 'Editar Lançamento' : (type === 'advance' ? 'Adiantar Frete' : 'Pagar Saldo Frete')}</h3><p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mt-0.5">{recordDescription || 'Transportador'}</p></div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-5 bg-white">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
             <div><span className="text-[10px] font-black text-slate-400 uppercase">Saldo Pendente</span><p className="text-2xl font-black text-slate-800">{formatBRL(totalPending)}</p></div>
          </div>
          {availableCredit > 0 && type === 'payment' && (
             <div className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${useAdvanceBalance ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100'}`} onClick={() => setUseAdvanceBalance(!useAdvanceBalance)}>
                <div className="flex items-center gap-3"><div className={`w-5 h-5 rounded border flex items-center justify-center ${useAdvanceBalance ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>{useAdvanceBalance && <Coins size={14} />}</div><div><p className="text-xs font-black text-slate-700 uppercase">Usar Crédito de Adiantamento</p><p className="text-[10px] text-slate-500">Saldo Disponível: <strong className="text-emerald-600">{formatBRL(availableCredit)}</strong></p></div></div>
             </div>
          )}
          <div className="grid grid-cols-2 gap-4">
             <div><label className={labelClass}>Data</label><input type="date" required value={date} onChange={e => setDate(e.target.value)} className={inputClass} /></div>
             <div><label className={labelClass}>Valor (R$)</label><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={`${inputClass} pl-10 text-blue-700`} placeholder="0,00" /></div></div>
          </div>
          {!useAdvanceBalance && valAmount > 0 && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className={labelClass}>Conta de Pagamento (Saldo Real)</label>
                <div className="relative"><Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><select required value={accountId} onChange={e => setAccountId(e.target.value)} className={`${inputClass} pl-12 appearance-none`}><option value="">Selecione o Banco...</option>{bankAccounts.map(acc => (<option key={acc.id} value={acc.id}>{acc.bankName} - {acc.owner} (Saldo: {formatBRL(acc.currentBalance)})</option>))}</select><ArrowDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} /></div>
              </div>
          )}
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
             <div className="flex items-center justify-between mb-2"><label className={labelClass}><MinusCircle size={12} className="inline mr-1" /> Desconto / Quebra?</label></div>
             <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 font-bold">R$</span><input type="number" step="0.01" value={discount} onChange={e => setDiscount(e.target.value)} className="w-full border-2 border-amber-200 rounded-lg bg-white px-4 py-2 pl-9 text-amber-800 font-bold outline-none text-sm" placeholder="0,00" /></div>
          </div>
          <div><label className={labelClass}>Observações</label><div className="relative"><FileText className="absolute left-3 top-3 text-slate-300" size={18} /><textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className={`${inputClass} pl-10 text-xs font-medium`} placeholder="Notas..." /></div></div>
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-500 font-black uppercase text-xs">Cancelar</button>
            <button type="submit" className={`px-8 py-3 rounded-xl text-white font-black uppercase text-xs shadow-lg active:scale-95 transition-all ${type === 'advance' ? 'bg-amber-600' : 'bg-blue-600'}`}>Confirmar {type === 'advance' ? 'Adiantamento' : 'Pagamento'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FreightPaymentModal;
