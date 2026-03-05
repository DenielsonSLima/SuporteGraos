import React, { useState, useEffect, useMemo } from 'react';
import { X, DollarSign, Calendar, Wallet, FileText, ArrowDown } from 'lucide-react';
import type { Account } from '../../../../services/accountsService';
import { useAccounts } from '../../../../hooks/useAccounts';
import { getLocalDateString } from '../../../../utils/dateUtils';
import { useToast } from '../../../../contexts/ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: any) => void;
  vehiclePlate?: string;
}

const ExpenseModal: React.FC<Props> = ({ isOpen, onClose, onConfirm, vehiclePlate = '' }) => {
  const { addToast } = useToast();
  
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(getLocalDateString());
  const [amount, setAmount] = useState('');
  const [discount, setDiscount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [expenseType, setExpenseType] = useState<'deduction' | 'addition'>('deduction');

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
      setDescription('');
      setDate(getLocalDateString());
      setAmount('');
      setDiscount('');
      setAccountId('');
      setNotes('');
      setExpenseType('deduction');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const valAmount = parseFloat(amount) || 0;
  const valDiscount = parseFloat(discount) || 0;
  const totalOperation = valAmount + valDiscount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return addToast('warning', 'Descrição obrigatória');
    if (valAmount <= 0) return addToast('warning', 'Valor deve ser maior que zero');
    if (!accountId) return addToast('warning', 'Conta bancária obrigatória');

    const selectedAccount = bankAccounts.find(a => a.id === accountId);
    const accountName = selectedAccount?.account_name || 'Caixa';

    onConfirm({ 
      description, 
      date, 
      value: valAmount, 
      discountValue: valDiscount,
      type: expenseType,
      accountId,
      accountName,
      notes 
    });
    onClose();
  };

  const inputClass = 'w-full border-2 border-slate-200 rounded-xl bg-white text-slate-900 font-bold px-4 py-2.5 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 text-sm';
  const labelClass = 'block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest ml-1';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 border border-white/20">
        <div className="px-8 py-5 flex justify-between items-center text-white bg-blue-600">
          <div>
            <h3 className="font-black text-lg flex items-center gap-2 uppercase italic tracking-tighter">
              <FileText size={20}/>Lançar Despesa do Motorista
            </h3>
            <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mt-0.5">Placa: {vehiclePlate}</p>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors"><X size={24} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-5 bg-white">
          <div>
            <label className={labelClass}>Descrição da Despesa</label>
            <input 
              type="text" 
              placeholder="Ex: Vale Diesel, Combustível, Pedágio" 
              value={description}
              onChange={e => setDescription(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Data</label>
              <input 
                type="date" 
                required 
                value={date} 
                onChange={e => setDate(e.target.value)} 
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Valor (R$)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="number" 
                  step="0.01" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)} 
                  className={`${inputClass} pl-10 text-blue-700`} 
                  placeholder="0,00"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>Conta Bancária (Débito)</label>
            <div className="relative">
              <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select 
                required 
                value={accountId} 
                onChange={e => setAccountId(e.target.value)} 
                className={`${inputClass} pl-12 appearance-none`}
              >
                <option value="">Selecione o Banco...</option>
                {bankAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.account_name} (Saldo: {formatBRL(acc.balance)})
                  </option>
                ))}
              </select>
              <ArrowDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Aplicar Despesa Como</label>
            <div className="flex gap-2">
              <label className="flex items-center gap-2 flex-1 p-3 bg-white border-2 border-slate-200 rounded-xl cursor-pointer hover:border-blue-300 transition-colors" onClick={() => setExpenseType('deduction')}>
                <input type="radio" name="expense-type" value="deduction" checked={expenseType === 'deduction'} onChange={() => setExpenseType('deduction')} className="w-4 h-4" />
                <span className="text-xs font-bold text-slate-700">Descontar do Frete</span>
              </label>
              <label className="flex items-center gap-2 flex-1 p-3 bg-white border-2 border-slate-200 rounded-xl cursor-pointer hover:border-emerald-300 transition-colors" onClick={() => setExpenseType('addition')}>
                <input type="radio" name="expense-type" value="addition" checked={expenseType === 'addition'} onChange={() => setExpenseType('addition')} className="w-4 h-4" />
                <span className="text-xs font-bold text-slate-700">Somar ao Frete</span>
              </label>
            </div>
          </div>

          <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
            <label className={labelClass}>Desconto / Quebra?</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 font-bold">R$</span>
              <input 
                type="number" 
                step="0.01" 
                value={discount} 
                onChange={e => setDiscount(e.target.value)} 
                className="w-full border-2 border-amber-200 rounded-lg bg-white px-4 py-2 pl-9 text-amber-800 font-bold outline-none text-sm" 
                placeholder="0,00"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Observações</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-slate-300" size={18} />
              <textarea 
                rows={2} 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                className={`${inputClass} pl-10 text-xs font-medium`} 
                placeholder="Notas adicionais..."
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-6 py-3 rounded-xl border border-slate-200 text-slate-500 font-black uppercase text-xs hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="px-8 py-3 rounded-xl bg-blue-600 text-white font-black uppercase text-xs shadow-lg active:scale-95 transition-all hover:bg-blue-700"
            >
              Confirmar Despesa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseModal;
