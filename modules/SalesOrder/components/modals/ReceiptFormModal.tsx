import React, { useState, useEffect, useMemo } from 'react';
import { X, DollarSign, Calendar, Wallet, FileText, ArrowDown, TrendingUp } from 'lucide-react';
import type { Account } from '../../../../services/accountsService';
import { useAccounts } from '../../../../hooks/useAccounts';
import { useToast } from '../../../../contexts/ToastContext';
import ModalPortal from '../../../../components/ui/ModalPortal';
import { formatCurrency, formatAccountLabel } from '../../../../utils/formatters';

interface ReceiptData {
  date: string;
  amount: number;
  discount: number;
  accountId: string;
  accountName: string;
  notes: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: ReceiptData) => Promise<void>;
  totalPending: number;
  customerName?: string;
  initialData?: any;
}

const ReceiptFormModal: React.FC<Props> = ({ isOpen, onClose, onConfirm, totalPending, customerName, initialData }) => {
  const { addToast } = useToast();

  const getTodayLocal = () => new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(getTodayLocal());
  const [amount, setAmount] = useState('');
  const [discount, setDiscount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: allAccounts = [] } = useAccounts();
  const bankAccounts = useMemo(() =>
    allAccounts.filter((a: Account) => a.is_active !== false).sort((a: Account, b: Account) => a.account_name.localeCompare(b.account_name)),
    [allAccounts]
  );

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setDate(initialData.date || getTodayLocal());
        setAmount(initialData.value?.toString() || '');
        setDiscount(initialData.discountValue?.toString() || '');
        setAccountId(initialData.accountId || '');
        setNotes(initialData.notes || '');
      } else {
        setDate(getTodayLocal());
        setAmount(totalPending > 0 ? totalPending.toFixed(2) : '');
        setDiscount('');
        setAccountId('');
        setNotes('');
      }
    }
  }, [isOpen, totalPending, initialData]);

  if (!isOpen) return null;

  const valAmount = parseFloat(amount) || 0;
  const valDiscount = parseFloat(discount) || 0;
  const totalOperation = valAmount + valDiscount;
  const isCashMovement = valAmount > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalOperation <= 0) return addToast('warning', 'Informe valores');
    if (isCashMovement && !accountId) return addToast('warning', 'Conta Obrigatória');

    const selectedAccount = bankAccounts.find(a => a.id === accountId);

    setIsSubmitting(true);
    try {
      await onConfirm({
        date,
        amount: valAmount,
        discount: valDiscount,
        accountId: accountId,
        accountName: selectedAccount?.account_name || (isCashMovement ? 'Caixa' : 'ABATIMENTO'),
        notes: notes
      });
      onClose();
    } catch (err) {
      console.error('[ReceiptFormModal] Erro:', err);
      // O erro deve ser tratado pelo chamador ou mostrar toast aqui
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = 'w-full border-2 border-slate-200 rounded-xl bg-white text-slate-900 font-bold px-4 py-2.5 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-300 text-sm';
  const labelClass = 'block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest ml-1';

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 border border-white/20">
          <div className="px-6 py-4 flex justify-between items-center text-white bg-emerald-600">
            <div>
              <h3 className="font-black text-base flex items-center gap-2 uppercase italic tracking-tighter">
                <TrendingUp size={18} />
                {initialData ? 'Editar Recebimento' : 'Novo Recebimento'}
              </h3>
              <p className="text-[9px] font-bold opacity-80 uppercase tracking-widest mt-0.5">{customerName || 'Cliente'}</p>
            </div>
            <button onClick={onClose} className="hover:bg-white/20 p-1.5 rounded-full transition-colors"><X size={20} /></button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Pendente</span>
                <p className="text-2xl font-black text-slate-800">{formatCurrency(totalPending)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Data</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input type="date" required value={date} onChange={e => setDate(e.target.value)} className={`${inputClass} pl-10`} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Valor (R$)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={`${inputClass} pl-10 text-emerald-700`} placeholder="0,00" />
                </div>
              </div>
            </div>

            {isCashMovement && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className={labelClass}>Conta Bancária / Caixa</label>
                <div className="relative">
                  <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select required value={accountId} onChange={e => setAccountId(e.target.value)} className={`${inputClass} pl-12 appearance-none`}>
                    <option value="">Selecione...</option>
                    {bankAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{formatAccountLabel(acc.account_name, acc.owner, acc.balance)}</option>
                    ))}
                  </select>
                  <ArrowDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
              </div>
            )}

            {!isCashMovement && discount === '' && (
              <div className="p-3 bg-amber-50 rounded-xl text-center text-xs text-amber-600 font-medium italic animate-pulse">
                Informe um valor acima de zero ou use o campo de desconto abaixo.
              </div>
            )}

            <div>
              <label className={labelClass}>Desconto / Ajuste (opcional)</label>
              <div className="relative">
                <MinusCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="number" step="0.01" value={discount} onChange={e => setDiscount(e.target.value)} className={`${inputClass} pl-10 text-slate-500`} placeholder="0,00" />
              </div>
            </div>

            <div>
              <label className={labelClass}>Observações</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 text-slate-300" size={18} />
                <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className={`${inputClass} pl-10 text-xs font-medium`} placeholder="Notas do recebimento..." />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
              <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-500 font-black uppercase text-xs">Cancelar</button>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="px-8 py-3 rounded-xl bg-emerald-600 text-white font-black uppercase text-xs shadow-lg active:scale-95 transition-all flex items-center gap-2"
              >
                {isSubmitting ? 'Processando...' : 'Confirmar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default ReceiptFormModal;

import { MinusCircle } from 'lucide-react';
