
import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Calendar, DollarSign, Wallet, FileText, Tag, CheckSquare, Square, ArrowDown, TrendingUp } from 'lucide-react';
import type { ExpenseCategory } from '../../../../../services/expenseCategoryService';
import type { Account } from '../../../../../services/accountsService';
import { useAccounts } from '../../../../../hooks/useAccounts';
import { useExpenseCategories } from '../../../../../hooks/useExpenseCategories';
import { getLocalDateString } from '../../../../../utils/dateUtils';
import { useToast } from '../../../../../contexts/ToastContext';
import ModalPortal from '../../../../../components/ui/ModalPortal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}

const ExpenseFormModal: React.FC<Props> = ({ isOpen, onClose, onSave }) => {
  const { addToast } = useToast();
  const { data: expenseCategories = [] } = useExpenseCategories();

  const { data: allAccounts = [] } = useAccounts();
  const bankAccounts = useMemo(() =>
    allAccounts.filter((a: Account) => a.is_active !== false).sort((a: Account, b: Account) => a.account_name.localeCompare(b.account_name)),
    [allAccounts]
  );
  
  // Estados de Seleção em Cascata
  const [selectedType, setSelectedType] = useState<'variable' | null>('variable');

  const [formData, setFormData] = useState({
    date: getLocalDateString(),
    value: '',
    accountId: '',
    notes: '',
    expenseSubtypeName: '',
    deductFromPartner: true
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        date: getLocalDateString(),
        value: '',
        accountId: '',
        notes: '',
        expenseSubtypeName: '',
        deductFromPartner: true
      });
      setSelectedType('variable'); 
    }
  }, [isOpen]);

  const filteredSubtypes = useMemo(() => {
    if (!selectedType) return [];
    const group = expenseCategories.find(c => c.type === selectedType);
    return group ? [...group.subtypes].sort((a, b) => a.name.localeCompare(b.name)) : [];
  }, [selectedType, expenseCategories]);

  if (!isOpen) return null;

  const formatBRL = (val: number) => {
    const normalized = Math.abs(val) < 0.01 ? 0 : val;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(normalized);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.value || !formData.accountId || !formData.expenseSubtypeName) {
        addToast('warning', 'Campos Obrigatórios', 'Preencha valor, conta e tipo de despesa.');
        return;
    }

    const account = bankAccounts.find(a => a.id === formData.accountId);
    const categoryGroup = expenseCategories.find(c => c.type === selectedType);
    const finalNotes = formData.notes ? `${categoryGroup?.name} - ${formData.expenseSubtypeName} | ${formData.notes}` : `${categoryGroup?.name} - ${formData.expenseSubtypeName}`;

    onSave({
      date: formData.date,
      value: parseFloat(formData.value),
      accountId: formData.accountId,
      accountName: account ? account.account_name : 'Caixa Central',
      notes: finalNotes,
      deductFromPartner: formData.deductFromPartner,
      type: 'expense'
    });

    onClose();
  };

  const inputClass = 'w-full px-4 py-3 border-2 border-slate-200 bg-white text-slate-950 font-bold rounded-xl focus:border-rose-500 focus:ring-0 outline-none transition-all placeholder:text-slate-300 text-sm';
  const labelClass = 'block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest ml-1';

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4 animate-in fade-in">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 border border-slate-100">
          
          <div className="bg-rose-600 px-6 py-5 flex justify-between items-center text-white">
            <h3 className="font-black uppercase tracking-tighter italic text-lg flex items-center gap-2">
              <Tag size={20}/> Lançar Despesa de Contrato
            </h3>
            <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors"><X size={20} /></button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            
            <div className="space-y-3">
              <label className={labelClass}>Natureza do Gasto</label>
              <div className="flex bg-slate-100 p-2 rounded-xl items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white shadow-sm border border-slate-200">
                   <TrendingUp size={16} className="text-amber-600" />
                   <div>
                     <p className="text-[9px] font-black uppercase text-slate-700 leading-tight">Variável</p>
                     <p className="text-[9px] text-slate-400 font-bold leading-tight">Despesas extras aceitam apenas variável</p>
                   </div>
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass}>Categoria do Plano de Contas</label>
              <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <select 
                      required 
                      value={formData.expenseSubtypeName} 
                      onChange={e => setFormData({...formData, expenseSubtypeName: e.target.value})} 
                      className={`${inputClass} appearance-none pl-10 pr-10`}
                  >
                      <option value="">{selectedType ? 'Escolha o item...' : 'Selecione a natureza acima'}</option>
                      {filteredSubtypes.map(sub => (
                          <option key={sub.id} value={sub.name}>{sub.name}</option>
                      ))}
                  </select>
                  <ArrowDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Data</label>
                  <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Valor (R$)</label>
                  <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="number" step="0.01" required value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} className={`${inputClass} pl-10 text-lg`} placeholder="0,00" />
                  </div>
                </div>
            </div>

            <div>
              <label className={labelClass}>Conta de Pagamento</label>
              <select required value={formData.accountId} onChange={e => setFormData({...formData, accountId: e.target.value})} className={`${inputClass} appearance-none pr-10`}>
                  <option value="">Selecione o Banco...</option>
                  {bankAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_name} (Saldo: {formatBRL(acc.balance)})
                    </option>
                  ))}
              </select>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                  <button type="button" onClick={() => setFormData({...formData, deductFromPartner: !formData.deductFromPartner})} className={`p-1 rounded-lg transition-colors ${formData.deductFromPartner ? 'text-amber-600' : 'text-slate-300 bg-white border border-slate-200'}`}>
                      {formData.deductFromPartner ? <CheckSquare size={24} /> : <Square size={24} />}
                  </button>
                  <div>
                      <p className="text-xs font-black text-amber-900 uppercase">Debitar do Produtor?</p>
                      <p className="text-[10px] text-amber-700 font-bold leading-tight mt-0.5">
                          {formData.deductFromPartner ? "SIM - Desconta do pagamento." : "NÃO - Custo operacional."}
                      </p>
                  </div>
              </label>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="px-6 py-3 border-2 border-slate-100 rounded-xl text-slate-400 font-black uppercase text-[10px] hover:bg-slate-50">Cancelar</button>
              <button type="submit" className="px-8 py-3 rounded-xl text-white bg-rose-600 hover:bg-rose-700 font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">Confirmar Lançamento</button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default ExpenseFormModal;
