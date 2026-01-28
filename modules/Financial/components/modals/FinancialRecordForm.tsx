
import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, DollarSign, FileText, Tag, User, ArrowRight, Wallet } from 'lucide-react';
import { financialService, BankAccountWithBalance } from '../../../../services/financialService';
import { BankAccount } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: any) => void;
  type: 'admin_expense' | 'transfer';
}

const FinancialRecordForm: React.FC<Props> = ({ isOpen, onClose, onSave, type }) => {
  const [bankAccounts, setBankAccounts] = useState<BankAccountWithBalance[]>([]);
  
  const [formData, setFormData] = useState({
    description: '',
    entityName: '', 
    category: '', 
    originAccount: '', 
    destinationAccount: '', 
    date: new Date().toISOString().split('T')[0],
    value: '',
    notes: ''
  });

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  useEffect(() => {
    if (isOpen) {
      const sorted = financialService.getBankAccountsWithBalances()
        .filter(acc => acc.active !== false)
        .sort((a, b) => a.bankName.localeCompare(b.bankName));
      setBankAccounts(sorted);
      
      setFormData({
        description: '',
        entityName: '',
        category: '',
        originAccount: '',
        destinationAccount: '',
        date: new Date().toISOString().split('T')[0],
        value: '',
        notes: ''
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (type === 'admin_expense') {
      onSave({
        ...formData,
        value: parseFloat(formData.value),
        id: Math.random().toString(36).substr(2, 9),
        originalValue: parseFloat(formData.value),
        paidValue: 0,
        status: 'pending',
        subType: 'admin'
      });
    } else {
      onSave({
        id: Math.random().toString(36).substr(2, 9),
        date: formData.date,
        originAccount: formData.originAccount,
        destinationAccount: formData.destinationAccount,
        value: parseFloat(formData.value),
        description: formData.description,
        user: 'Admin'
      });
    }
    
    onClose();
  };

  const inputClass = 'block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 placeholder:text-slate-400';
  const labelClass = 'block mb-1 text-xs font-bold text-slate-500 uppercase';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white">
          <h3 className="font-bold text-lg">
            {type === 'admin_expense' ? 'Nova Despesa Administrativa' : 'Nova Transferência'}
          </h3>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Valor (R$)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="number" 
                  step="0.01" 
                  required
                  className={`${inputClass} pl-10 font-bold`}
                  placeholder="0,00"
                  value={formData.value}
                  onChange={e => setFormData({...formData, value: e.target.value})}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Data</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="date" 
                  required
                  className={`${inputClass} pl-10`}
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>Descrição / Motivo</label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                required
                className={`${inputClass} pl-10`}
                placeholder={type === 'admin_expense' ? "Ex: Conta de Luz" : "Ex: Aporte para Investimento"}
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>
          </div>

          {type === 'admin_expense' ? (
            <>
              <div>
                <label className={labelClass}>Fornecedor / Entidade</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    required
                    className={`${inputClass} pl-10`} 
                    placeholder="Ex: Energisa, Papelaria..."
                    value={formData.entityName}
                    onChange={e => setFormData({...formData, entityName: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Categoria</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select 
                    required
                    className={`${inputClass} pl-10 appearance-none bg-white`}
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  >
                    <option value="">Selecione...</option>
                    <option value="Aluguel">Aluguel</option>
                    <option value="Energia">Energia</option>
                    <option value="Internet">Internet</option>
                    <option value="Salários">Salários</option>
                    <option value="Manutenção">Manutenção</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                <div>
                  <label className={labelClass}>Conta de Origem (Saiu de)</label>
                  <div className="relative">
                    <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400" size={18} />
                    <select 
                      required
                      className={`${inputClass} pl-10 appearance-none bg-white`}
                      value={formData.originAccount}
                      onChange={e => setFormData({...formData, originAccount: e.target.value})}
                    >
                      <option value="">Selecione a conta...</option>
                      {bankAccounts.map(acc => (
                        <option key={acc.id} value={acc.bankName}>
                          {acc.bankName} - {acc.owner} (Bal: {currency(acc.currentBalance)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-center">
                  <ArrowRight className="text-slate-300" />
                </div>

                <div>
                  <label className={labelClass}>Conta de Destino (Entrou em)</label>
                  <div className="relative">
                    <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" size={18} />
                    <select 
                      required
                      className={`${inputClass} pl-10 appearance-none bg-white`}
                      value={formData.destinationAccount}
                      onChange={e => setFormData({...formData, destinationAccount: e.target.value})}
                    >
                      <option value="">Selecione a conta...</option>
                      {bankAccounts.map(acc => (
                        <option key={acc.id} value={acc.bankName}>
                          {acc.bankName} - {acc.owner} (Bal: {currency(acc.currentBalance)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium text-sm transition-colors">Cancelar</button>
            <button type="submit" className="px-6 py-2 rounded-lg bg-slate-800 text-white font-bold shadow-sm hover:bg-slate-900 flex items-center gap-2 text-sm transition-colors">
              <Save size={18} /> Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FinancialRecordForm;
