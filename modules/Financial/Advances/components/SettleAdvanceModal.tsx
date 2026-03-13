
import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Calendar, DollarSign, Wallet, FileText, ChevronDown } from 'lucide-react';
import ModalPortal from '../../../../components/ui/ModalPortal';
import { useAccounts } from '../../../../hooks/useAccounts';
import { useToast } from '../../../../contexts/ToastContext';
import { AdvanceTransaction } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { date: string; value: number; accountId: string; accountName: string; notes: string }) => void;
  advance: AdvanceTransaction;
}

const SettleAdvanceModal: React.FC<Props> = ({ isOpen, onClose, onSave, advance }) => {
  const { addToast } = useToast();
  const { data: allAccounts = [] } = useAccounts();
  const bankAccounts = useMemo(() =>
    allAccounts.filter(a => a.is_active !== false).sort((a, b) => a.account_name.localeCompare(b.account_name)),
    [allAccounts]
  );
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [displayValue, setDisplayValue] = useState('');
  const [numericValue, setNumericValue] = useState(0);
  const [accountId, setAccountId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDate(new Date().toISOString().split('T')[0]);
      setDisplayValue('');
      setNumericValue(0);
      setAccountId('');
      setNotes('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const amount = Number(rawValue) / 100;
    
    // Não permitir baixar mais do que o valor do adiantamento (opcional, mas bom senso)
    // No entanto, conforme o RPC, permitimos qualquer valor pois pode haver acréscimos/juros? 
    // Mantendo flexível mas informando o usuário se quiser.
    
    setNumericValue(amount);
    setDisplayValue(new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(amount));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (numericValue <= 0) {
        addToast('warning', 'Valor Inválido', 'O valor da baixa deve ser maior que zero.');
        return;
    }

    if (!accountId) {
        addToast('warning', 'Conta Obrigatória', 'Selecione a conta de movimentação bancária.');
        return;
    }

    const account = bankAccounts.find(a => a.id === accountId);

    onSave({
      date,
      value: numericValue,
      accountId,
      accountName: account?.account_name || 'Conta',
      notes: notes || `Baixa de Adiantamento - ${advance.partnerName}`
    });
  };

  const inputClass = 'block w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-slate-800 focus:outline-none transition-all placeholder:text-slate-300 font-bold shadow-sm';
  const labelClass = 'block mb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1';

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[95vh]">
          
          <div className="bg-emerald-950 px-8 py-6 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-emerald-900/50 rounded-2xl text-emerald-400 border border-emerald-700 shadow-inner">
                  <DollarSign size={24} />
               </div>
               <div>
                  <h3 className="font-black text-lg uppercase tracking-tighter italic leading-none text-emerald-50">Baixar Adiantamento</h3>
                  <p className="text-[10px] font-black uppercase text-emerald-500/80 tracking-widest mt-1.5">{advance.partnerName}</p>
               </div>
            </div>
            <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition-colors">
              <X size={28} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30 space-y-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Adiantamento em Aberto</p>
                <div className="flex justify-between items-end">
                    <p className="text-2xl font-black text-slate-800 tracking-tighter italic">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(advance.value)}
                    </p>
                    <div className="text-right">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Data Original</p>
                        <p className="text-xs font-black text-slate-600">{new Date(advance.date).toLocaleDateString('pt-BR')}</p>
                    </div>
                </div>
            </div>

            <form id="settle-form" onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Valor da Baixa (R$)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
                    <input 
                      type="text" 
                      required
                      className={`${inputClass} pl-12 text-lg text-emerald-700`}
                      placeholder="R$ 0,00"
                      value={displayValue}
                      onChange={handleValueChange}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Data do Pagamento</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
                    <input 
                      type="date" 
                      required 
                      className={`${inputClass} pl-12`}
                      value={date}
                      onChange={e => setDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>{advance.type === 'given' ? 'Conta de Entrada (Devolução)' : 'Conta de Saída (Pagamento)'}</label>
                <div className="relative">
                    <Wallet className={`absolute left-4 top-1/2 -translate-y-1/2 ${advance.type === 'given' ? 'text-emerald-400' : 'text-rose-400'}`} size={20} />
                    <select 
                        required 
                        value={accountId} 
                        onChange={e => setAccountId(e.target.value)} 
                        className={`${inputClass} pl-12 appearance-none pr-10`}
                    >
                        <option value="">Selecione a conta bancária...</option>
                        {bankAccounts.map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.account_name} (Saldo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(acc.balance)})</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Observações / Histórico</label>
                <div className="relative">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
                  <input 
                    type="text" 
                    className={`${inputClass} pl-12 font-medium`}
                    placeholder="Opcional: Detalhes da liquidação..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </form>
          </div>

          <div className="bg-white p-8 border-t border-slate-200 flex justify-end gap-4 shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
            <button 
              type="button" 
              onClick={onClose}
              className="px-8 py-3.5 border-2 border-slate-200 rounded-2xl text-slate-500 font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
            <button 
              form="settle-form"
              type="submit" 
              className="px-10 py-3.5 rounded-2xl text-white font-black shadow-xl flex items-center gap-2 transition-all active:scale-95 uppercase text-xs tracking-widest bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
            >
              <Save size={18} />
              Confirmar Baixa
            </button>
          </div>

        </div>
      </div>
    </ModalPortal>
  );
};

export default SettleAdvanceModal;
