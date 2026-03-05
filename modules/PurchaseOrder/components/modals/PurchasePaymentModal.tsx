
import React, { useState, useEffect, useMemo } from 'react';
import { X, DollarSign, Calendar, Wallet, FileText, ArrowDown, MinusCircle, AlertTriangle } from 'lucide-react';
import type { Account } from '../../../../services/accountsService';
import { useAccounts } from '../../../../hooks/useAccounts';
import { getLocalDateString } from '../../../../utils/dateUtils';
import { useToast } from '../../../../contexts/ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: any) => void;
  totalPending: number;
  recordDescription?: string;
  initialData?: any;
  isProcessing?: boolean;
}

const PurchasePaymentModal: React.FC<Props> = ({ isOpen, onClose, onConfirm, totalPending, recordDescription, initialData, isProcessing = false }) => {
  const { addToast } = useToast();

  const [date, setDate] = useState(getLocalDateString());
  const [displayAmount, setDisplayAmount] = useState('');
  const [numericAmount, setNumericAmount] = useState(0);
  const [displayDiscount, setDisplayDiscount] = useState('');
  const [numericDiscount, setNumericDiscount] = useState(0);
  const [accountId, setAccountId] = useState('');
  const [notes, setNotes] = useState('');

  const { data: allAccounts = [] } = useAccounts();
  const bankAccounts = useMemo(() =>
    allAccounts.filter((a: Account) => a.is_active !== false).sort((a: Account, b: Account) => a.account_name.localeCompare(b.account_name)),
    [allAccounts]
  );

  const formatBRL = (val: number) => {
    const normalized = Math.abs(val) < 0.01 ? 0 : val;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(normalized);
  };

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setDate(initialData.date?.split('T')[0] || getLocalDateString());
        const initAmount = Number(initialData.value) || 0;
        const initDiscount = Number(initialData.discountValue) || 0;
        setNumericAmount(initAmount);
        setDisplayAmount(formatBRL(initAmount));
        setNumericDiscount(initDiscount);
        setDisplayDiscount(formatBRL(initDiscount));
        setAccountId(initialData.accountId || '');
        setNotes(initialData.notes || '');
      } else {
        setDate(getLocalDateString());
        setNumericAmount(totalPending);
        setDisplayAmount(formatBRL(totalPending));
        setNumericDiscount(0);
        setDisplayDiscount(formatBRL(0));
        setAccountId('');
        setNotes('');
      }
    }
  }, [isOpen, totalPending, initialData]);

  if (!isOpen) return null;

  const valAmount = numericAmount || 0;
  const valDiscount = numericDiscount || 0;
  const totalOperation = valAmount + valDiscount;

  const isDiscountOnly = !accountId
    && valDiscount > 0
    && (valAmount <= 0 || Math.abs(valAmount - totalPending) < 0.01);

  const effectiveAmount = isDiscountOnly ? 0 : valAmount;
  const isCashMovement = effectiveAmount > 0;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = Number(raw) / 100;
    setNumericAmount(num);
    setDisplayAmount(formatBRL(num));
  };

  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = Number(raw) / 100;
    setNumericDiscount(num);
    setDisplayDiscount(formatBRL(num));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((effectiveAmount + valDiscount) <= 0) return addToast('warning', 'Valores Zerados');
    if (isCashMovement && !accountId) return addToast('warning', 'Conta Obrigatória');

    const selectedAccount = bankAccounts.find(a => a.id === accountId);

    // Foundation V2: O orquestrador cuidará do 'discount_virtual' se accountId for vazio/especial
    onConfirm({
      date,
      amount: effectiveAmount,
      discount: valDiscount,
      accountId: accountId, // Passa o ID real ou vazio se for apenas desconto
      accountName: selectedAccount?.account_name || (isCashMovement ? 'Caixa' : 'ABATIMENTO'),
      notes: notes,
      isAsset: false
    });
  };

  const inputClass = 'w-full border-2 border-slate-200 rounded-xl bg-white text-slate-900 font-bold px-4 py-2.5 focus:border-rose-600 outline-none transition-all placeholder:text-slate-300 text-sm';
  const labelClass = 'block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest ml-1';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 border border-white/20">
        <div className="px-8 py-5 flex justify-between items-center text-white bg-rose-600">
          <div>
            <h3 className="font-black text-lg flex items-center gap-2 uppercase tracking-tighter italic"><DollarSign size={20} />{initialData ? 'Editar Pagamento' : 'Novo Pagamento'}</h3>
            <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mt-0.5">{recordDescription || 'Fornecedor'}</p>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-5 bg-white">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
            <div><span className="text-[10px] font-black text-slate-400 uppercase">Saldo Devedor Atual</span><p className="text-2xl font-black text-slate-800">{formatBRL(totalPending)}</p></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Data Pagamento</label><input type="date" required value={date} onChange={e => setDate(e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Valor em Dinheiro (R$)</label><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" value={displayAmount} onChange={handleAmountChange} className={`${inputClass} pl-10 text-rose-700`} placeholder="R$ 0,00" /></div></div>
          </div>
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
            <label className={labelClass}>Desconto / Abatimento Comercial</label>
            <div className="relative"><MinusCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" size={18} /><input type="text" value={displayDiscount} onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, '');
              const num = Number(raw) / 100;
              setNumericDiscount(num);
              setDisplayDiscount(formatBRL(num));

              if (!initialData && num >= totalPending && !accountId) {
                setNumericAmount(0);
                setDisplayAmount(formatBRL(0));
              }
            }} className="w-full border-2 border-amber-200 rounded-lg bg-white px-4 py-2 pl-9 text-amber-800 font-bold outline-none text-sm" placeholder="R$ 0,00" /></div>
          </div>
          {isCashMovement ? (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className={labelClass}>Conta de Saída (Obrigatório)</label>
              <div className="relative"><Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><select required value={accountId} onChange={e => setAccountId(e.target.value)} className={`${inputClass} pl-12 appearance-none`}><option value="">Selecione a conta...</option>{bankAccounts.map(acc => (<option key={acc.id} value={acc.id}>{acc.account_name} (Saldo: {formatBRL(acc.balance)})</option>))}</select><ArrowDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} /></div>
            </div>
          ) : <div className="p-3 bg-slate-100 rounded-xl text-center text-xs text-slate-500 font-medium italic">Baixa via desconto operacional.</div>}
          <div><label className={labelClass}>Histórico / Observações</label><div className="relative"><FileText className="absolute left-3 top-3 text-slate-300" size={18} /><textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className={`${inputClass} pl-10 text-xs font-medium`} placeholder="Notas..." /></div></div>
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-500 font-black uppercase text-xs">Cancelar</button>
            <button type="submit" disabled={isProcessing} className="px-8 py-3 rounded-xl bg-rose-600 text-white font-black uppercase text-xs shadow-lg hover:bg-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">{isProcessing ? 'Processando...' : 'Confirmar Baixa'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PurchasePaymentModal;
