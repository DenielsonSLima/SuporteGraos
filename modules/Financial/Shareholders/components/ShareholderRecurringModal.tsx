import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, DollarSign, Clock, RefreshCw, CheckCircle2, Info } from 'lucide-react';
import { Shareholder } from '../../../../services/shareholderService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (config: { active: boolean; amount: number; day: number }) => void;
  shareholder: Shareholder;
}

const ShareholderRecurringModal: React.FC<Props> = ({ isOpen, onClose, onConfirm, shareholder }) => {
  const [active, setActive] = useState(false);
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('1');

  useEffect(() => {
    if (isOpen) {
      const config = shareholder.financial.recurrence || { active: false, amount: 0, day: 1 };
      setActive(config.active);
      setAmount(config.amount > 0 ? config.amount.toString() : '');
      setDay(config.day.toString());
    }
  }, [isOpen, shareholder]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      active,
      amount: parseFloat(amount) || 0,
      day: parseInt(day)
    });
  };

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        
        <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <RefreshCw size={20} className="animate-spin-slow" />
            <div>
              <h3 className="font-bold text-lg leading-none">Recorrência Mensal</h3>
              <p className="text-[10px] opacity-80 font-bold uppercase tracking-widest mt-0.5">{shareholder.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Toggle Switch */}
          <div 
             className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${active ? 'bg-indigo-50 border-indigo-500' : 'bg-slate-50 border-slate-200'}`}
             onClick={() => setActive(!active)}
          >
             <div>
                <p className={`font-black uppercase text-xs tracking-widest ${active ? 'text-indigo-700' : 'text-slate-500'}`}>Status da Automação</p>
                <p className="text-sm font-bold text-slate-800">{active ? 'ATIVADO' : 'DESATIVADO'}</p>
             </div>
             <div className={`w-12 h-6 rounded-full p-1 transition-colors ${active ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${active ? 'translate-x-6' : 'translate-x-0'}`} />
             </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor do Crédito (Mensal)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                <input 
                  type="number" step="0.01" 
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  disabled={!active}
                  className="w-full pl-9 pr-3 py-3 border-2 border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:outline-none font-black text-lg text-indigo-900 disabled:bg-slate-50 disabled:text-slate-400"
                  placeholder="0,00"
                />
              </div>
            </div>

            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dia do Lançamento</label>
               <div className="grid grid-cols-3 gap-2">
                  {[1, 5, 10, 15, 20, 25].map(d => (
                    <button
                        key={d}
                        type="button"
                        onClick={() => setDay(d.toString())}
                        disabled={!active}
                        className={`py-2 rounded-lg text-sm font-bold border-2 transition-all ${
                            parseInt(day) === d 
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                            : 'border-slate-100 bg-white text-slate-500 hover:border-slate-300'
                        } disabled:opacity-50`}
                    >
                        Dia {d}
                    </button>
                  ))}
               </div>
            </div>
          </div>
          
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] text-slate-600 leading-relaxed font-medium">
             <Info size={14} className="inline mr-1 text-blue-500 mb-0.5" />
             O sistema lançará automaticamente um crédito de <strong>{amount ? currency(parseFloat(amount)) : 'R$ 0,00'}</strong> no dia <strong>{day}</strong> de cada mês. Este valor ficará como "Saldo a Pagar" até que uma retirada seja registrada.
          </div>

          <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg text-slate-500 font-bold text-xs uppercase tracking-widest hover:bg-slate-50">Cancelar</button>
            <button type="submit" className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 transition-colors">
              <Save size={16} /> Salvar Configuração
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default ShareholderRecurringModal;