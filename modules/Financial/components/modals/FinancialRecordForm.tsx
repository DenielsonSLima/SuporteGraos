
import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, DollarSign, FileText, Tag, User, ArrowRight, Wallet } from 'lucide-react';
import type { Account } from '../../../../services/accountsService';
import { useAccounts } from '../../../../hooks/useAccounts';
import ModalPortal from '../../../../components/ui/ModalPortal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: any) => void | Promise<void>;
  type: 'admin_expense' | 'transfer';
  initialData?: any;
}

const FinancialRecordForm: React.FC<Props> = ({ isOpen, onClose, onSave, type, initialData }) => {
  const { data: allAccounts = [] } = useAccounts();
  const accounts = React.useMemo(() => allAccounts.sort((a, b) => a.account_name.localeCompare(b.account_name)), [allAccounts]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generateUUID = (): string => crypto.randomUUID();
  
  const [formData, setFormData] = useState({
    description: type === 'transfer' ? 'Transferência entre contas' : '',
    entityName: '', 
    category: '', 
    originAccount: '', 
    destinationAccount: '', 
    date: new Date().toISOString().split('T')[0],
    value: '',
    notes: ''
  });

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);

  const formatValueInput = (val: string) => {
    // Remove tudo que não é número
    const numbers = val.replace(/\D/g, '');
    if (!numbers) return '';
    
    // Converte para número e formata com 2 casas decimais
    const numValue = (parseInt(numbers, 10) / 100).toFixed(2);
    
    // Formata no padrão brasileiro (1.234,56)
    return numValue.replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
  };

  const parseValueInput = (val: string): string => {
    // Remove separadores e converte vírgula em ponto para parseFloat
    return val.replace(/\./g, '').replace(',', '.');
  };

  useEffect(() => {
    if (isOpen) {
      const formatInitialValue = (raw: any): string => {
        const num = Number(raw || 0);
        if (!num) return '';
        const fixed = num.toFixed(2);
        return fixed.replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
      };

      if (initialData && type === 'transfer') {
        setFormData({
          description: initialData.description || 'Transferência entre contas',
          entityName: '',
          category: '',
          originAccount: initialData.fromAccountId || '',
          destinationAccount: initialData.toAccountId || '',
          date: initialData.transferDate || new Date().toISOString().split('T')[0],
          value: formatInitialValue(initialData.amount),
          notes: initialData.notes || ''
        });
        return;
      }
      
      setFormData({
        description: type === 'transfer' ? 'Transferência entre contas' : '',
        entityName: '',
        category: '',
        originAccount: '',
        destinationAccount: '',
        date: new Date().toISOString().split('T')[0],
        value: '',
        notes: ''
      });
    }
  }, [isOpen, initialData, type]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    const numValue = parseFloat(parseValueInput(formData.value));

    try {
      setIsSubmitting(true);

      if (type === 'admin_expense') {
        await Promise.resolve(onSave({
          ...formData,
          value: numValue,
          id: Math.random().toString(36).substr(2, 9),
          originalValue: numValue,
          paidValue: 0,
          status: 'pending',
          subType: 'admin'
        }));
      } else {
        await Promise.resolve(onSave({
          id: initialData?.id || generateUUID(),
          transferDate: formData.date,
          fromAccountId: formData.originAccount,
          toAccountId: formData.destinationAccount,
          amount: numValue,
          description: formData.description,
          notes: formData.notes || undefined
        }));
      }

      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = 'block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 placeholder:text-slate-400';
  const labelClass = 'block mb-1 text-xs font-bold text-slate-500 uppercase';

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95">
          
          <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white">
            <h3 className="font-bold text-lg">
              {type === 'admin_expense'
                ? (initialData ? 'Editar Despesa Administrativa' : 'Nova Despesa Administrativa')
                : (initialData ? 'Editar Transferência' : 'Nova Transferência')}
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
                    type="text" 
                    inputMode="numeric"
                    required
                    className={`${inputClass} pl-10 font-bold`}
                    placeholder="0,00"
                    value={formData.value}
                    onChange={e => setFormData({...formData, value: formatValueInput(e.target.value)})}
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
                  placeholder={type === 'admin_expense' ? "Ex: Conta de Luz" : "Transferência entre contas"}
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
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.account_name} | {acc.owner || 'Sem Dono'} (Saldo: {currency(acc.balance)})
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
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.account_name} | {acc.owner || 'Sem Dono'} (Saldo: {currency(acc.balance)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="pt-2 flex justify-end gap-3">
              <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium text-sm transition-colors disabled:opacity-50">Cancelar</button>
              <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-lg bg-slate-800 text-white font-bold shadow-sm hover:bg-slate-900 flex items-center gap-2 text-sm transition-colors disabled:opacity-50">
                <Save size={18} /> Confirmar
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default FinancialRecordForm;
