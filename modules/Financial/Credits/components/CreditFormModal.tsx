import React, { useState, useEffect } from 'react';
import { 
  X, Save, TrendingUp, DollarSign, Calendar, 
  Wallet
} from 'lucide-react';
import { financialService, BankAccountWithBalance } from '../../../../services/financialService';
import { useToast } from '../../../../contexts/ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
}

const CreditFormModal: React.FC<Props> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [bankAccounts, setBankAccounts] = useState<BankAccountWithBalance[]>([]);
  const { addToast } = useToast();
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    value: '',
    accountId: ''
  });

  const [displayValue, setDisplayValue] = useState('');

  const formatBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatCurrencyInput = (val: string) => {
    const raw = val.replace(/\D/g, '');
    const num = Number(raw) / 100;
    return num;
  };

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          date: new Date(initialData.issueDate).toISOString().split('T')[0],
          description: initialData.description || '',
          value: (initialData.originalValue || 0).toString(),
          accountId: initialData.bankAccount || ''
        });
        setDisplayValue(formatBRL(initialData.originalValue || 0));
      } else {
        setFormData({
          date: new Date().toISOString().split('T')[0],
          description: '',
          value: '',
          accountId: ''
        });
        setDisplayValue('');
      }

      const accounts = financialService.getBankAccountsWithBalances()
        .filter(acc => acc.active !== false)
        .sort((a, b) => a.bankName.localeCompare(b.bankName));
      setBankAccounts(accounts);
    }
  }, [isOpen, initialData]);

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = formatCurrencyInput(e.target.value);
    setFormData({ ...formData, value: num.toString() });
    setDisplayValue(formatBRL(num));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const value = parseFloat(formData.value);

    if (!formData.description.trim()) return addToast('warning', 'Descrição é obrigatória');
    if (value <= 0) return addToast('warning', 'Valor deve ser maior que zero');
    if (!formData.accountId) return addToast('warning', 'Selecione uma conta bancária');

    const selectedAccount = bankAccounts.find(a => a.id === formData.accountId);

    onSubmit({
      date: formData.date,
      description: formData.description,
      value,
      accountId: formData.accountId,
      accountName: selectedAccount?.bankName || ''
    });
    onClose();
  };

  if (!isOpen) return null;

  const labelClass = 'block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest ml-1';
  const inputClass = 'w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 bg-white placeholder:text-slate-300 focus:border-slate-800 outline-none transition-all text-sm shadow-sm';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 border border-white/20">
        
        <div className="px-8 py-6 flex justify-between items-center text-white bg-emerald-600">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-white/20 rounded-2xl"><TrendingUp size={24} /></div>
             <div>
                <h3 className="font-black text-xl uppercase tracking-tighter italic leading-none">{initialData ? 'Editar Crédito' : 'Novo Crédito'}</h3>
                <p className="text-[10px] font-black uppercase tracking-widest mt-1.5 opacity-80">Aplicação Financeira</p>
             </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors"><X size={28} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto bg-slate-50/30">
          
          {/* Seção Principal */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            
            {/* Data */}
            <div>
              <label className={labelClass}>Data</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-3.5 text-slate-400" size={18} />
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className={`${inputClass} pl-12`}
                />
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label className={labelClass}>Descrição *</label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                className={inputClass}
                placeholder="Ex: CDB Banco X"
              />
            </div>

            {/* Valor */}
            <div>
              <label className={labelClass}>Valor *</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-3.5 text-slate-400" size={18} />
                <input
                  type="text"
                  name="value"
                  value={displayValue}
                  onChange={handleValueChange}
                  required
                  className={`${inputClass} pl-12`}
                  placeholder="R$ 0,00"
                />
              </div>
            </div>

            {/* Conta Bancária */}
            <div>
              <label className={labelClass}>Conta Bancária *</label>
              <div className="relative">
                <Wallet className="absolute left-4 top-3.5 text-emerald-400" size={18} />
                <select
                  name="accountId"
                  value={formData.accountId}
                  onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                  required
                  className={`${inputClass} pl-12 appearance-none bg-white`}
                >
                  <option value="">Selecione uma conta...</option>
                  {bankAccounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.bankName} - {account.owner || 'Sem titular'} (Saldo: {formatBRL(account.currentBalance || 0)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-2xl font-black uppercase tracking-wider transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:shadow-lg rounded-2xl font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {initialData ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreditFormModal;
