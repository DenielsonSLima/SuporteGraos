
import React, { useState, useEffect } from 'react';
import { 
  X, Save, Landmark, DollarSign, Calendar, 
  ArrowDownLeft, ArrowUpRight, Wallet, ChevronDown, FileText, TrendingUp, TrendingDown
} from 'lucide-react';
import type { Account } from '../../../../services/accountsService';
import { useAccounts } from '../../../../hooks/useAccounts';
import { useToast } from '../../../../contexts/ToastContext';
import ModalPortal from '../../../../components/ui/ModalPortal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (loan: any) => void;
  initialType?: 'taken' | 'granted';
}

const LoanFormModal: React.FC<Props> = ({ isOpen, onClose, onSave, initialType = 'taken' }) => {
  const { data: allBankAccounts = [] } = useAccounts();
  const bankAccounts = React.useMemo(() => allBankAccounts.sort((a, b) => a.account_name.localeCompare(b.account_name)), [allBankAccounts]);
  const [type, setType] = useState<'taken' | 'granted'>('taken');
  const { addToast } = useToast();
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    contractValue: '',
    remainingValue: '',
    accountId: ''
  });

  const [displayContractValue, setDisplayContractValue] = useState('');
  const [displayRemainingValue, setDisplayRemainingValue] = useState('');

  const formatBRL = (val: number) => {
    const normalized = Math.abs(val) < 0.01 ? 0 : val;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(normalized);
  };

  const formatCurrencyInput = (val: string) => {
    const raw = val.replace(/\D/g, '');
    const num = Number(raw) / 100;
    return num;
  };

  useEffect(() => {
    if (isOpen) {
      setType('taken');
      setFormData({
        date: new Date().toISOString().split('T')[0],
        description: '',
        contractValue: '',
        remainingValue: '',
        accountId: ''
      });
      setDisplayContractValue('');
      setDisplayRemainingValue('');
    }
  }, [isOpen, initialType]);

  const handleContractValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = formatCurrencyInput(e.target.value);
    setFormData({ ...formData, contractValue: num.toString() });
    setDisplayContractValue(formatBRL(num));
  };

  const handleRemainingValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = formatCurrencyInput(e.target.value);
    setFormData({ ...formData, remainingValue: num.toString() });
    setDisplayRemainingValue(formatBRL(num));
  };

  const selectedAccountData = bankAccounts.find(a => a.id === formData.accountId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const contractValue = parseFloat(formData.contractValue);
    const remainingValue = parseFloat(formData.remainingValue);

    if (!formData.description.trim()) return addToast('warning', 'Descrição é obrigatória');
    if (contractValue <= 0) return addToast('warning', 'Valor do contrato deve ser maior que zero');
    if (remainingValue <= 0) return addToast('warning', 'Valor a pagar deve ser maior que zero');
    if (remainingValue > contractValue) return addToast('warning', 'Valor a pagar não pode ser maior que o valor do contrato');
    if (!formData.accountId) return addToast('warning', 'Selecione uma conta bancária');

    const selectedAccount = bankAccounts.find(a => a.id === formData.accountId);

    onSave({
      date: formData.date,
      description: formData.description,
      contractValue,
      remainingValue,
      type,
      accountId: formData.accountId,
      accountName: selectedAccount?.account_name || ''
    });
    addToast('success', 'Empréstimo criado');
    onClose();
  };

  if (!isOpen) return null;

  const labelClass = 'block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest ml-1';
  const inputClass = 'w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 bg-white placeholder:text-slate-300 focus:border-slate-800 outline-none transition-all text-sm shadow-sm';

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 border border-white/20">
          
          <div className={`px-8 py-6 flex justify-between items-center text-white ${type === 'taken' ? 'bg-rose-600' : 'bg-emerald-600'}`}>
            <div className="flex items-center gap-4">
               <div className="p-3 bg-white/20 rounded-2xl"><Landmark size={24} /></div>
               <div>
                  <h3 className="font-black text-xl uppercase tracking-tighter italic leading-none">{type === 'taken' ? 'Novo Empréstimo Tomado' : 'Novo Empréstimo Cedido'}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest mt-1.5 opacity-80">Registro de Contrato Financeiro</p>
               </div>
            </div>
            <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors"><X size={28} /></button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto bg-slate-50/30">
            
            {/* Botões Tipo Tomado/Cedido */}
            <div className="flex bg-slate-200 p-1 rounded-2xl shadow-inner">
              <button 
                type="button" 
                onClick={() => setType('taken')} 
                className={`flex-1 py-3 text-xs font-black uppercase rounded-xl transition-all flex items-center justify-center gap-2 ${type === 'taken' ? 'bg-white shadow text-rose-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <ArrowDownLeft size={16} /> Tomado
              </button>
              <button 
                type="button" 
                onClick={() => setType('granted')} 
                className={`flex-1 py-3 text-xs font-black uppercase rounded-xl transition-all flex items-center justify-center gap-2 ${type === 'granted' ? 'bg-white shadow text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <ArrowUpRight size={16} /> Cedido
              </button>
            </div>

            {/* Seção Principal */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              
              {/* Data */}
              <div>
                <label className={labelClass}>Data do Contrato</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="date" 
                    required 
                    className={`${inputClass} pl-12`}
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                  />
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className={labelClass}>Descrição</label>
                <div className="relative">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="text" 
                    required 
                    className={`${inputClass} pl-12 uppercase`}
                    placeholder="Ex: BANCO DO BRASIL, EMPRÉSTIMO PESSOAL..."
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>
              </div>

              {/* Valores lado a lado */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Valor do Contrato</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="text" 
                      required 
                      className={`${inputClass} pl-12 text-slate-900 font-black text-lg`}
                      value={displayContractValue}
                      onChange={handleContractValueChange}
                      placeholder="R$ 0,00"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Valor a Pagar</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="text" 
                      required 
                      className={`${inputClass} pl-12 text-slate-900 font-black text-lg`}
                      value={displayRemainingValue}
                      onChange={handleRemainingValueChange}
                      placeholder="R$ 0,00"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Conta Bancária */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <label className={labelClass}>Conta Bancária</label>
              <div className="relative">
                <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <select 
                  required 
                  className={`${inputClass} pl-12 appearance-none`}
                  value={formData.accountId}
                  onChange={e => setFormData({...formData, accountId: e.target.value})}
                >
                  <option value="">Selecione a conta...</option>
                  {bankAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_name} (Saldo: {formatBRL(acc.balance ?? 0)})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
              <button 
                type="button" 
                onClick={onClose} 
                className="px-8 py-4 border-2 border-slate-200 rounded-2xl text-slate-500 font-black uppercase text-xs hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className={`px-10 py-4 rounded-2xl text-white font-black uppercase text-xs shadow-xl tracking-widest transition-all flex items-center gap-2 ${type === 'taken' ? 'bg-rose-600 hover:bg-rose-700 active:scale-95' : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'}`}
              >
                <Save size={18} /> Salvar
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default LoanFormModal;

