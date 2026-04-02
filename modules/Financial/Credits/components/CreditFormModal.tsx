import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Save, TrendingUp, DollarSign, Calendar, 
  Wallet
} from 'lucide-react';
import type { Account } from '../../../../services/accountsService';
import { useAccounts } from '../../../../hooks/useAccounts';
import { getLocalDateString } from '../../../../utils/dateUtils';
import { useToast } from '../../../../contexts/ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
}

import ModalPortal from '../../../../components/ui/ModalPortal';

const CreditFormModal: React.FC<Props> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const { data: allBankAccounts = [] } = useAccounts();
  const bankAccounts = React.useMemo(() => allBankAccounts.sort((a, b) => a.account_name.localeCompare(b.account_name)), [allBankAccounts]);
  const { addToast } = useToast();
  
  const [formData, setFormData] = useState({
    date: getLocalDateString(),
    description: '',
    value: '',
    accountId: ''
  });

  const [displayValue, setDisplayValue] = useState('');

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
      if (initialData) {
        setFormData({
          date: initialData.issueDate ? initialData.issueDate.split('T')[0] : getLocalDateString(),
          description: initialData.description || '',
          value: (initialData.originalValue || 0).toString(),
          accountId: initialData.bankAccount || ''
        });
        setDisplayValue(formatBRL(initialData.originalValue || 0));
      } else {
        setFormData({
          date: getLocalDateString(),
          description: '',
          value: '',
          accountId: ''
        });
        setDisplayValue('');
      }

    }
  }, [isOpen, initialData]);

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = formatCurrencyInput(e.target.value);
    setFormData({ ...formData, value: num.toString() });
    setDisplayValue(formatBRL(num));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    const value = parseFloat(formData.value);

    if (!formData.description.trim()) return addToast('warning', 'Descrição é obrigatória');
    if (value <= 0) return addToast('warning', 'Valor deve ser maior que zero');
    if (!formData.accountId) return addToast('warning', 'Selecione uma conta bancária');

    const selectedAccount = bankAccounts.find(a => a.id === formData.accountId);

    setIsSubmitting(true);
    try {
      await onSubmit({
        date: formData.date,
        description: formData.description,
        value,
        accountId: formData.accountId,
        accountName: selectedAccount?.account_name || ''
      });
      onClose();
    } catch (error) {
      addToast('error', 'Erro ao salvar', 'Ocorreu um erro ao processar o crédito.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const labelClass = 'block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest ml-1';
  const inputClass = 'w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 bg-white placeholder:text-slate-300 focus:border-slate-800 outline-none transition-all text-sm shadow-sm';

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
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
                        {account.account_name} (Saldo: {formatBRL(account.balance || 0)})
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
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-2xl font-black uppercase tracking-wider transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:shadow-lg rounded-2xl font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save size={18} />
                {isSubmitting ? 'Salvando...' : (initialData ? 'Atualizar' : 'Criar')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default CreditFormModal;
