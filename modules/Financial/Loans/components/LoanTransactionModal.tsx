
import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, DollarSign, Wallet, FileText, ArrowDown, CheckSquare, Square, MinusCircle, HelpCircle } from 'lucide-react';
import type { Account } from '../../../../services/accountsService';
import { useAccounts } from '../../../../hooks/useAccounts';
import { useToast } from '../../../../contexts/ToastContext';
import { LoanTransaction } from '../../types';
import ModalPortal from '../../../../components/ui/ModalPortal';
import { formatAccountLabel } from '../../../../utils/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
   onSave: (tx: Omit<LoanTransaction, 'id'> & { id?: string }) => void;
  loanType: 'taken' | 'granted';
   initialTx?: (Omit<LoanTransaction, 'id'> & { id?: string });
}

const LoanTransactionModal: React.FC<Props> = ({ isOpen, onClose, onSave, loanType, initialTx }) => {
   const { data: bankAccounts = [] } = useAccounts();
   const { addToast } = useToast();
  const [type, setType] = useState<'increase' | 'decrease'>('decrease');
  const [isAdjustment, setIsAdjustment] = useState(false); // NOVO: Flag para Desconto/Ajuste
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState('');
  const [isHistorical, setIsHistorical] = useState(false);

   const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);

   const formatCurrencyInput = (val: string) => {
      const raw = val.replace(/\D/g, '');
      if (!raw) return '';
      const num = Number(raw) / 100;
      return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
   };

   const parseCurrencyInput = (val: string) => {
      const normalized = val.replace(/\./g, '').replace(',', '.');
      const num = parseFloat(normalized);
      return Number.isNaN(num) ? 0 : num;
   };

   useEffect(() => {
      if (isOpen) {
         if (initialTx) {
            setType(initialTx.type);
            setIsAdjustment(!!initialTx.isHistorical);
            setValue(formatCurrencyInput(String(initialTx.value ?? '')));
            setDescription(initialTx.description || '');
            setAccountId(initialTx.accountId || '');
            setIsHistorical(!!initialTx.isHistorical);
            setDate(initialTx.date || new Date().toISOString().split('T')[0]);
         } else {
            setType('decrease');
            setIsAdjustment(false);
            setValue('');
            setDescription('');
            setAccountId('');
            setIsHistorical(false);
            setDate(new Date().toISOString().split('T')[0]);
         }
      }
   }, [isOpen, initialTx]);

  if (!isOpen) return null;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

      const val = parseCurrencyInput(value);
      if (!val || val <= 0) {
         addToast('warning', 'Valor inválido');
         return;
      }
    
    // Se não for ajuste e não for histórico, exige banco
   if (!isAdjustment && !isHistorical && !accountId) {
      addToast('warning', 'Conta bancária obrigatória');
      return;
   }

    const account = bankAccounts.find(a => a.id === accountId);

    setIsSubmitting(true);
    try {
      await onSave({
        id: initialTx?.id,
        date,
        type,
        value: val,
        description: description || (isAdjustment ? 'Ajuste / Abatimento de Saldo' : (type === 'increase' ? 'Reforço de Capital' : 'Pagamento de Parcela')),
        accountId: (isHistorical || isAdjustment) ? undefined : accountId,
        accountName: (isHistorical || isAdjustment) ? undefined : account?.account_name,
        isHistorical: isHistorical || isAdjustment // Ajustes funcionam como históricos (não geram caixa)
      });
    } catch (error) {
       addToast('error', 'Erro ao salvar', 'Ocorreu um erro ao processar o lançamento.');
    } finally {
       setIsSubmitting(false);
    }
  };

  const inputClass = 'w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 bg-white placeholder:text-slate-300 focus:border-slate-800 outline-none transition-all text-sm';
  const labelClass = 'block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest ml-1';

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
          <div className="bg-slate-900 text-white px-8 py-6 flex justify-between items-center">
              <h3 className="font-black uppercase tracking-tighter italic text-lg">Novo Lançamento no Contrato</h3>
              <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors"><X size={24} /></button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            
            <div className="flex bg-slate-100 p-1 rounded-xl">
               <button type="button" onClick={() => setType('decrease')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${type === 'decrease' ? 'bg-white shadow text-emerald-600' : 'text-slate-400'}`}>Amortização / Baixa</button>
               <button type="button" onClick={() => setType('increase')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${type === 'increase' ? 'bg-white shadow text-amber-600' : 'text-slate-400'}`}>Reforço / Aporte</button>
            </div>

            {/* SELETOR DE MODO: CAIXA OU AJUSTE */}
            <div className="grid grid-cols-2 gap-2">
               <button 
                  type="button" 
                  onClick={() => setIsAdjustment(false)}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${!isAdjustment ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-400'}`}
               >
                  <DollarSign size={16} />
                  <span className="text-[10px] font-black uppercase">Via Caixa</span>
               </button>
               <button 
                  type="button" 
                  onClick={() => { setIsAdjustment(true); setAccountId(''); }}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${isAdjustment ? 'border-amber-500 bg-amber-50 text-amber-600' : 'border-slate-100 text-slate-400'}`}
               >
                  <MinusCircle size={16} />
                  <span className="text-[10px] font-black uppercase">Abatimento</span>
               </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className={labelClass}>Data</label>
                  <input type="date" required value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
               </div>
               <div>
                  <label className={labelClass}>Valor (R$)</label>
                  <input type="text" inputMode="decimal" required value={value} onChange={e => setValue(formatCurrencyInput(e.target.value))} className={`${inputClass} ${isAdjustment ? 'text-amber-600' : 'text-slate-900'}`} placeholder="0,00" />
               </div>
            </div>

            <div>
               <label className={labelClass}>Descrição do Lançamento</label>
               <input type="text" className={inputClass} value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Pagamento 03/12, Juros Mensais..." />
            </div>

            {!isAdjustment && (
              <div className="pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                 <div className="flex items-center justify-between mb-4">
                    <span className={labelClass}>Vínculo Bancário</span>
                    <label className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setIsHistorical(!isHistorical)}>
                        <div className={isHistorical ? 'text-blue-600' : 'text-slate-300'}>
                            {isHistorical ? <CheckSquare size={18}/> : <Square size={18}/>}
                        </div>
                        <span className="text-[9px] font-black text-slate-400 uppercase">Lançamento Histórico</span>
                    </label>
                 </div>

                 {!isHistorical && (
                    <div>
                        <label className={labelClass}>{type === 'decrease' ? (loanType === 'taken' ? 'Conta de Saída' : 'Conta de Entrada') : (loanType === 'taken' ? 'Conta de Entrada' : 'Conta de Saída')}</label>
                                   <select required value={accountId} onChange={e => setAccountId(e.target.value)} className={`${inputClass} appearance-none`}>
                                         <option value="">Selecione a conta ativa...</option>
                                         {bankAccounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>
                                               {formatAccountLabel(acc.account_name, acc.owner, acc.balance)}
                                            </option>
                                         ))}
                                   </select>
                    </div>
                 )}
              </div>
            )}

            {isAdjustment && (
               <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                  <HelpCircle className="text-amber-600 shrink-0" size={18} />
                  <p className="text-[10px] text-amber-800 font-bold leading-relaxed uppercase">
                      Este lançamento irá apenas alterar o saldo do contrato, sem gerar entrada ou saída real no seu caixa bancário.
                  </p>
               </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button 
                type="button" 
                onClick={onClose} 
                disabled={isSubmitting}
                className="px-6 py-3 border-2 border-slate-200 rounded-xl text-slate-400 font-black uppercase text-xs disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className={`px-8 py-3 rounded-xl text-white font-black uppercase text-xs shadow-lg transition-all active:scale-95 disabled:opacity-50 ${isAdjustment ? 'bg-amber-600' : 'bg-slate-900'}`}
              >
                {isSubmitting ? 'Salvando...' : 'Confirmar Lançamento'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default LoanTransactionModal;
