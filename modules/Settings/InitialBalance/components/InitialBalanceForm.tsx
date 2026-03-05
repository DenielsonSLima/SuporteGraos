
import React, { useState, useEffect } from 'react';
import { Save, Landmark, DollarSign, Calendar, ArrowDown } from 'lucide-react';
import { BankAccount } from '../../../Financial/types';
import { getLocalDateString } from '../../../../utils/dateUtils';

interface Props {
  accounts: BankAccount[];
  onSave: (data: { accountId: string; date: string; value: number }) => void;
  onCancel: () => void;
}

const InitialBalanceForm: React.FC<Props> = ({ accounts, onSave, onCancel }) => {
  const [formData, setFormData] = useState({ 
    accountId: '', 
    date: getLocalDateString() // Usa utilitário local
  });
  const [displayValue, setDisplayValue] = useState('');
  const [numericValue, setNumericValue] = useState(0);

  const formatBRL = (val: number) => {
    const normalized = Math.abs(val) < 0.01 ? 0 : val;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(normalized);
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = Number(raw) / 100;
    setNumericValue(num);
    setDisplayValue(formatBRL(num));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.accountId || numericValue <= 0) return;
    onSave({ ...formData, value: numericValue });
  };

  // Classes de Contraste Máximo: Fundo Branco, Texto Preto nítido
  const inputClass = 'w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 font-bold text-slate-900 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all placeholder:text-slate-300 text-sm shadow-sm';
  const labelClass = 'block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest ml-1';

  return (
    <div className="max-w-2xl bg-white p-1 rounded-[2.5rem] animate-in fade-in slide-in-from-top-2">
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-slate-50 border-2 border-slate-100 p-8 rounded-[2rem] shadow-inner grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="md:col-span-2">
            <label className={labelClass}>Selecione a Conta Bancária</label>
            <div className="relative group">
               <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors" size={18} />
               <select 
                  required 
                  value={formData.accountId} 
                  onChange={e => setFormData({...formData, accountId: e.target.value})} 
                  className={`${inputClass} pl-12 appearance-none pr-10`}
               >
                  <option value="">Selecione a conta...</option>
                  {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.bankName} - {acc.owner}</option>)}
               </select>
               <ArrowDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Data do Marco Zero (Brasil)</label>
            <div className="relative group">
               <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors" size={18} />
               <input 
                  type="date" 
                  required 
                  value={formData.date} 
                  onChange={e => setFormData({...formData, date: e.target.value})} 
                  className={`${inputClass} pl-12`} 
               />
            </div>
          </div>

          <div>
            <label className={labelClass}>Valor de Abertura</label>
            <div className="relative group">
               <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
               <input 
                  type="text" 
                  required 
                  value={displayValue} 
                  onChange={handleValueChange} 
                  className={`${inputClass} pl-12 font-black text-slate-900 text-lg`} 
                  placeholder="R$ 0,00" 
               />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
           <button 
              type="button" 
              onClick={onCancel}
              className="px-8 py-4 rounded-2xl border-2 border-slate-200 bg-white text-slate-500 font-black uppercase text-[10px] tracking-[0.2em] hover:bg-slate-50 transition-all active:scale-95"
           >
              Cancelar
           </button>
           <button 
              type="submit" 
              className="px-10 py-4 rounded-2xl bg-slate-900 text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-2"
           >
              <Save size={18} /> Efetivar Saldo Inicial
           </button>
        </div>
      </form>
    </div>
  );
};

export default InitialBalanceForm;
