
import React, { useState, useMemo, useEffect } from 'react';
import { X, Save, Calendar, FileText, User, ArrowUpRight, ArrowDownLeft, Wallet, ChevronDown, DollarSign } from 'lucide-react';
import { AdvanceType } from '../types';
import { parceirosService } from '../../../../services/parceirosService';
import { useAccounts } from '../../../../hooks/useAccounts';
import { useToast } from '../../../../contexts/ToastContext';
import { Partner } from '../../../Partners/types';
import ModalPortal from '../../../../components/ui/ModalPortal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}

const AdvanceForm: React.FC<Props> = ({ isOpen, onClose, onSave }) => {
  const { addToast } = useToast();
  const [type, setType] = useState<AdvanceType>('given');
  const [partnerId, setPartnerId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  
  const [accountId, setAccountId] = useState('');
  const [displayValue, setDisplayValue] = useState('');
  const [numericValue, setNumericValue] = useState(0);
  
  const { data: allAccounts = [] } = useAccounts();
  const accounts = useMemo(() => allAccounts.filter(a => a.is_active !== false).sort((a, b) => a.account_name.localeCompare(b.account_name)), [allAccounts]);
  const [partners, setPartners] = useState<Partner[]>([]);

  useEffect(() => {
    if (isOpen) {
        parceirosService.getPartners({ page: 1, pageSize: 2000 })
          .then(({ data }) => setPartners(data || []))
          .catch(() => setPartners([]));
        
        // Reset form
        setPartnerId('');
        setDisplayValue('');
        setNumericValue(0);
        setAccountId('');
        setDescription('');
        setDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen]);

  useEffect(() => {
    const unsubscribe = parceirosService.subscribeRealtime(() => {
      if (!isOpen) return;
      parceirosService.getPartners({ page: 1, pageSize: 2000 })
        .then(({ data }) => setPartners(data || []))
        .catch(() => setPartners([]));
    });

    return unsubscribe;
  }, [isOpen]);

  if (!isOpen) return null;

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const amount = Number(rawValue) / 100;
    
    setNumericValue(amount);
    setDisplayValue(new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(amount));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sortedPartners = [...partners].sort((a, b) => a.name.localeCompare(b.name));
    const partner = sortedPartners.find(p => p.id === partnerId);
    
    if (!partner) {
        addToast('warning', 'Atenção', 'Selecione um parceiro.');
        return;
    }
    if (numericValue <= 0) {
        addToast('warning', 'Valor Inválido', 'O valor deve ser maior que zero.');
        return;
    }
    if (!accountId) {
        addToast('warning', 'Conta Obrigatória', 'Selecione a conta bancária de movimentação.');
        return;
    }

    const selectedAccount = accounts.find(a => a.id === accountId);

    onSave({
      partnerId,
      partnerName: partner.name,
      type,
      date,
      value: numericValue,
      description,
      accountId,
      accountName: selectedAccount?.account_name || 'Conta'
    });
    onClose();
  };

  const inputClass = 'block w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-slate-800 focus:outline-none transition-all placeholder:text-slate-300 font-bold shadow-sm';
  const labelClass = 'block mb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1';

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[95vh]">
          
          <div className="bg-slate-950 px-8 py-6 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-4">
               <div className={`p-3 rounded-2xl border shadow-inner ${type === 'given' ? 'bg-indigo-900/50 text-indigo-400 border-indigo-700' : 'bg-amber-900/50 text-amber-400 border-amber-700'}`}>
                  <Wallet size={24} />
               </div>
               <div>
                  <h3 className="font-black text-lg uppercase tracking-tighter italic leading-none">Novo Adiantamento</h3>
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-1.5">Registro de Fluxo de Crédito/Débito</p>
               </div>
            </div>
            <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition-colors">
              <X size={28} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30 space-y-6">
            <form id="advance-form" onSubmit={handleSubmit} className="space-y-6">
              
              <div className="flex bg-slate-200 p-1 rounded-2xl shadow-inner">
                <button
                  type="button"
                  onClick={() => setType('given')}
                  className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex flex-col items-center justify-center gap-1 ${type === 'given' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <div className="flex items-center gap-2">
                    <ArrowUpRight size={16} />
                    <span>Dinheiro Saindo</span>
                  </div>
                  <span className="text-[10px] opacity-70 font-bold">(Eu Paguei)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType('taken')}
                  className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex flex-col items-center justify-center gap-1 ${type === 'taken' ? 'bg-white shadow text-amber-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <div className="flex items-center gap-2">
                    <ArrowDownLeft size={16} />
                    <span>Dinheiro Entrando</span>
                  </div>
                  <span className="text-[10px] opacity-70 font-bold">(Eu Recebi)</span>
                </button>
              </div>

              <div className={`p-5 rounded-3xl text-xs font-bold border-2 animate-in slide-in-from-top-2 ${type === 'given' ? 'bg-indigo-50 text-indigo-800 border-indigo-100' : 'bg-amber-50 text-amber-800 border-amber-100'}`}>
                <p className="uppercase tracking-widest text-[9px] font-black mb-1 opacity-60">O que significa isso?</p>
                {type === 'given' 
                  ? 'A empresa está tirando dinheiro do caixa e enviando para o parceiro agora. Isso gera um crédito para a empresa usar no futuro.'
                  : 'O parceiro está enviando dinheiro para o caixa da empresa agora. Isso gera uma dívida que a empresa terá que abater no futuro.'
                }
              </div>

              <div>
                <label className={labelClass}>Parceiro Beneficiário</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
                  <select 
                    required 
                    className={`${inputClass} pl-12 appearance-none`}
                    value={partnerId}
                    onChange={e => setPartnerId(e.target.value)}
                  >
                    <option value="">Selecione o parceiro...</option>
                    {[...partners].sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Valor do Adiantamento</label>
                  <div className="relative">
                    <DollarSign className={`absolute left-4 top-1/2 -translate-y-1/2 ${type === 'given' ? 'text-indigo-400' : 'text-amber-400'}`} size={18} />
                    <input 
                      type="text" 
                      required
                      className={`${inputClass} pl-12 text-lg ${type === 'given' ? 'text-indigo-700' : 'text-amber-700'}`}
                      placeholder="R$ 0,00"
                      value={displayValue}
                      onChange={handleValueChange}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Data do Documento</label>
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

              <div className={`p-6 rounded-[2.5rem] border-2 transition-all bg-white border-slate-200 mt-2`}>
                <label className={labelClass}>{type === 'given' ? 'Conta Bancária (Saída de Recurso)' : 'Conta Bancária (Entrada de Recurso)'}</label>
                <div className="relative">
                    <Wallet className={`absolute left-4 top-1/2 -translate-y-1/2 ${type === 'given' ? 'text-rose-400' : 'text-emerald-400'}`} size={20} />
                    <select 
                        required 
                        value={accountId} 
                        onChange={e => setAccountId(e.target.value)} 
                        className={`${inputClass} pl-12 appearance-none pr-10`}
                    >
                        <option value="">Selecione a conta bancária...</option>
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.account_name} (Saldo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(acc.balance)})</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Motivo / Descrição Detalhada</label>
                <div className="relative">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
                  <input 
                    type="text" 
                    required
                    className={`${inputClass} pl-12`}
                    placeholder="Ex: Adiantamento p/ frete, Compra antecipada..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
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
              form="advance-form"
              type="submit" 
              className={`px-10 py-3.5 rounded-2xl text-white font-black shadow-xl flex items-center gap-2 transition-all active:scale-95 uppercase text-xs tracking-widest ${type === 'given' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'}`}
            >
              <Save size={18} />
              Salvar Registro
            </button>
          </div>

        </div>
      </div>
    </ModalPortal>
  );
};

export default AdvanceForm;
