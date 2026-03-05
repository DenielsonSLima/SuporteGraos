
import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, Wallet, FileText, CheckCircle2, ArrowDown, MinusCircle, Calculator, TrendingUp } from 'lucide-react';
import { FinancialRecord } from '../../types';
import type { Account } from '../../../../services/accountsService';
import { useAccounts } from '../../../../hooks/useAccounts';
import { getLocalDateString } from '../../../../utils/dateUtils';
import { useToast } from '../../../../contexts/ToastContext';

export interface PaymentData {
  date: string;
  amount: number;
  discount: number;
  accountId: string;
  accountName: string;
  notes: string;
  isAsset: boolean;
  assetName: string;
  entityName?: string;
}

interface Props {
  record: FinancialRecord | null;
  bulkTotal?: number;
  bulkCount?: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: PaymentData) => void;
  initialData?: any;
}

const FinancialPaymentModal: React.FC<Props> = ({ record, bulkTotal, bulkCount, isOpen, onClose, onConfirm, initialData }) => {
  const { addToast } = useToast();

  // Contas bancárias via TanStack Query (cache + realtime)
  const { data: rawAccounts = [] } = useAccounts();
  const bankAccounts = rawAccounts
    .filter(acc => acc.is_active !== false)
    .sort((a, b) => a.account_name.localeCompare(b.account_name));
  const [displayAmount, setDisplayAmount] = useState('');
  const [numericAmount, setNumericAmount] = useState(0);
  const [displayDiscount, setDisplayDiscount] = useState('');
  const [numericDiscount, setNumericDiscount] = useState(0);
  
  const [date, setDate] = useState(getLocalDateString());
  const [accountId, setAccountId] = useState('');
  const [notes, setNotes] = useState('');

  const debtTotal = bulkTotal || (record ? (record.remainingValue || 0) : 0);
  const isReceipt = record?.subType === 'sales_order' || record?.subType === 'receipt' || record?.category === 'Venda de Ativo';

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);
  };

  useEffect(() => {
    if (isOpen) {
      const initialVal = initialData?.value || debtTotal;
      const initialDisc = initialData?.discountValue || 0;
      
      setNumericAmount(initialVal);
      setDisplayAmount(formatBRL(initialVal));
      setNumericDiscount(initialDisc);
      setDisplayDiscount(formatBRL(initialDisc));
      
      setDate(initialData?.date?.split('T')[0] || getLocalDateString());
      setNotes(initialData?.notes || '');
      setAccountId(initialData?.accountId || '');
    }
  }, [isOpen, debtTotal, initialData]);

  if (!isOpen) return null;

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numericAmount <= 0 && numericDiscount <= 0) return addToast('warning', 'Atenção', 'Informe um valor.');
    if (numericAmount > 0 && !accountId) return addToast('warning', 'Conta Obrigatória', 'Selecione uma conta bancária.');

    const selectedAccount = bankAccounts.find(a => a.id === accountId);
    onConfirm({
      date,
      amount: numericAmount,
      discount: numericDiscount,
      accountId: accountId || 'discount_virtual',
      accountName: selectedAccount?.account_name || 'ABATIMENTO',
      notes,
      isAsset: false,
      assetName: '',
      entityName: record?.entityName
    });
  };

  const labelClass = 'block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-widest ml-1';
  const inputClass = 'w-full border-2 border-slate-200 rounded-2xl bg-white text-slate-950 font-black px-4 py-3 focus:border-primary-500 outline-none transition-all text-sm';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20">
        <div className={`px-8 py-6 flex justify-between items-center text-white ${isReceipt ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          <div>
            <h3 className="font-black text-xl flex items-center gap-2 uppercase tracking-tighter italic">
              {isReceipt ? <TrendingUp size={24}/> : <Calculator size={24}/>}
              {bulkTotal ? `Baixa em Lote` : `Baixa de Título`}
            </h3>
            <p className="text-[10px] font-black opacity-80 uppercase tracking-widest mt-0.5">{record?.description || 'Liquidação Financeira'}</p>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors"><X size={28} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 flex justify-between items-center shadow-inner">
            <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Devedor Atual</span>
                <p className="text-3xl font-black text-slate-900 tracking-tighter">{formatBRL(debtTotal)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Data da Baixa</label>
              <input type="date" required value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Valor em Dinheiro (Caixa)</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" value={displayAmount} onChange={handleAmountChange} className={`${inputClass} pl-10 text-lg border-blue-100`} placeholder="R$ 0,00" />
              </div>
            </div>
          </div>

          <div className="bg-amber-50 p-5 rounded-3xl border border-amber-100">
             <label className={labelClass}>Desconto / Abatimento Comercial</label>
             <div className="relative">
                <MinusCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-400" size={18} />
                <input type="text" value={displayDiscount} onChange={handleDiscountChange} className={`${inputClass} pl-12 border-amber-200 text-amber-700`} placeholder="R$ 0,00" />
             </div>
          </div>

          <div>
            <label className={labelClass}>Conta Bancária de Movimentação</label>
            <select required={numericAmount > 0} value={accountId} onChange={e => setAccountId(e.target.value)} className={`${inputClass} appearance-none`}>
                <option value="">Selecione o Banco...</option>
                {bankAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.account_name} (Saldo: {formatBRL(acc.balance)})
                  </option>
                ))}
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-8 py-4 border-2 border-slate-200 rounded-2xl text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">Cancelar</button>
            <button type="submit" className={`px-10 py-4 rounded-2xl text-white font-black shadow-xl flex items-center justify-center gap-3 text-xs uppercase tracking-widest transition-all active:scale-95 ${isReceipt ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
              Efetivar Baixa Financeira
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FinancialPaymentModal;
