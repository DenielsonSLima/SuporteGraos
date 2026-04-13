
import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Calendar, DollarSign, Wallet, FileText, Tags, CheckSquare, Square, ArrowDown, MinusCircle, AlertTriangle } from 'lucide-react';
import { TransactionType } from '../../types';
import type { ExpenseCategory } from '../../../../services/expenseCategoryService';
import { getLocalDateString } from '../../../../utils/dateUtils';
import type { Account } from '../../../../services/accountsService';
import { useAccounts } from '../../../../hooks/useAccounts';
import { useExpenseCategories } from '../../../../hooks/useExpenseCategories';
import { useToast } from '../../../../contexts/ToastContext';
import ModalPortal from '../../../../components/ui/ModalPortal';
import { formatAccountLabel } from '../../../../utils/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { date: string; value: number; discountValue: number; accountId: string; accountName: string; notes: string; deductFromPartner?: boolean; expenseSubtypeId?: string }) => void;
  type: TransactionType;
  title: string;
}

const TransactionModal: React.FC<Props> = ({ isOpen, onClose, onSave, type, title }) => {
  const { addToast } = useToast();
  const { data: allExpenseCategories = [] } = useExpenseCategories();

  // Filtra categorias variáveis para despesas de pedido
  const expenseCategories = useMemo(
    () => allExpenseCategories.filter(cat => cat.type === 'variable'),
    [allExpenseCategories]
  );

  const { data: allAccounts = [] } = useAccounts();
  const bankAccounts = useMemo(() =>
    allAccounts.filter((a: Account) => a.is_active !== false).sort((a: Account, b: Account) => a.account_name.localeCompare(b.account_name)),
    [allAccounts]
  );
  
  const [formData, setFormData] = useState({
    date: getLocalDateString(),
    amount: '', // Valor em Dinheiro
    discount: '', // Valor do Desconto
    accountId: '',
    notes: '',
    expenseSubtypeId: '',
    deductFromPartner: false
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        date: getLocalDateString(),
        amount: '',
        discount: '',
        accountId: '',
        notes: '',
        expenseSubtypeId: '',
        deductFromPartner: false
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const valAmount = parseFloat(formData.amount) || 0;
  const valDiscount = parseFloat(formData.discount) || 0;
  const totalOperation = valAmount + valDiscount;
  const isCashMovement = valAmount > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (totalOperation <= 0) {
        return; 
    }

    if (isCashMovement && !formData.accountId) return;

    const account = bankAccounts.find(a => a.id === formData.accountId);
    let finalNotes = formData.notes;

    if (type === 'expense' && formData.expenseSubtypeId) {
      let subtypeName = '';
      expenseCategories.forEach(cat => {
        const sub = cat.subtypes.find(s => s.id === formData.expenseSubtypeId);
        if (sub) subtypeName = `${cat.name} - ${sub.name}`;
      });
      if (subtypeName) {
        finalNotes = finalNotes ? `${subtypeName} | ${finalNotes}` : subtypeName;
      }
    }

    // Lógica para conta virtual de abatimento
    const finalAccountId = isCashMovement ? formData.accountId : 'discount_virtual';
    const finalAccountName = isCashMovement ? (account?.account_name || 'Caixa Central') : 'ABATIMENTO/ACORDO';
    
    if (!isCashMovement && valDiscount > 0 && !finalNotes) {
        finalNotes = `Abatimento / Desconto Comercial`;
    }

    onSave({
      date: formData.date,
      value: valAmount,
      discountValue: valDiscount,
      accountId: finalAccountId,
      accountName: finalAccountName,
      notes: finalNotes,
      deductFromPartner: formData.deductFromPartner,
      expenseSubtypeId: formData.expenseSubtypeId
    });
  };

  const getColor = () => {
    switch(type) {
      case 'advance': return 'bg-amber-600';
      case 'expense': return 'bg-rose-600';
      case 'commission': return 'bg-violet-600';
      default: return 'bg-emerald-600';
    }
  };

  const inputClass = 'w-full px-4 py-3 border-2 border-slate-200 bg-white text-slate-950 font-black rounded-xl focus:border-blue-500 focus:ring-0 outline-none transition-all placeholder:text-slate-300';
  const labelClass = 'block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest ml-1';

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20 max-h-[90vh] flex flex-col">
          <div className={`${getColor()} px-8 py-6 flex justify-between items-center text-white shrink-0`}>
            <div>
              <h3 className="font-black text-xl flex items-center gap-2 uppercase italic tracking-tighter">
                <AlertTriangle size={24} />
                {title}
              </h3>
              <p className="text-[10px] font-black opacity-80 uppercase tracking-widest mt-0.5">Gestão Financeira do Lote</p>
            </div>
            <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors"><X size={28} /></button>
          </div>

          <div className="overflow-y-auto p-8 flex-1 space-y-6">
            <form id="tx-form" onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Data da Operação</label>
                  <input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Valor em Dinheiro (R$)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="number" step="0.01" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} className={`${inputClass} pl-10 text-lg border-blue-50 focus:border-blue-500`} placeholder="0,00" />
                  </div>
                </div>
              </div>

              {(type === 'commission' || type === 'payment' || type === 'receipt') && (
                <div className="bg-amber-50/50 p-6 rounded-[2rem] border border-amber-100">
                  <label className={labelClass}><MinusCircle size={12} className="inline mr-1" /> Desconto / Abatimento?</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500 font-bold">R$</span>
                    <input type="number" step="0.01" value={formData.discount} onChange={e => setFormData({ ...formData, discount: e.target.value })} className={`${inputClass} pl-12 border-amber-50 text-amber-800 focus:border-amber-500`} placeholder="0,00" />
                  </div>
                </div>
              )}

              {isCashMovement ? (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className={labelClass}>Conta de Movimentação (Obrigatório)</label>
                  <div className="relative">
                    <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select required value={formData.accountId} onChange={e => setFormData({ ...formData, accountId: e.target.value })} className={`${inputClass} pl-12 appearance-none`}>
                      <option value="">Selecione o Banco...</option>
                      {bankAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {formatAccountLabel(acc.account_name, acc.owner, acc.balance)}
                        </option>
                      ))}
                    </select>
                    <ArrowDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  </div>
                </div>
              ) : (valDiscount > 0 && (
                <div className="p-4 bg-slate-50 rounded-2xl text-center text-[10px] text-slate-500 font-black uppercase tracking-widest italic border border-slate-100">Baixa via desconto operacional.</div>
              ))}

              {type === 'expense' && (
                <div className="animate-in slide-in-from-top-2">
                  <label className={labelClass}>Categoria da Despesa</label>
                  <div className="relative">
                    <Tags className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select required value={formData.expenseSubtypeId} onChange={e => setFormData({ ...formData, expenseSubtypeId: e.target.value })} className={`${inputClass} pl-12 appearance-none`}>
                      <option value="">Selecione...</option>
                      {expenseCategories.map(cat => (
                        <optgroup key={cat.id} label={cat.name}>
                          {cat.subtypes.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {(type === 'expense' || type === 'commission') && (
                <div className={`p-6 rounded-[2rem] border-2 transition-all cursor-pointer ${formData.deductFromPartner ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`} onClick={() => setFormData({ ...formData, deductFromPartner: !formData.deductFromPartner })}>
                  <div className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${formData.deductFromPartner ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg' : 'border-slate-300 bg-white'}`}>
                      {formData.deductFromPartner && <CheckSquare size={14} />}
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-700 uppercase tracking-tight">{type === 'commission' ? 'Debitar Comissão do Produtor?' : 'Debitar do Saldo do Produtor?'}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{formData.deductFromPartner ? "Saldo devedor será deduzido." : "Empresa assume este custo."}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className={labelClass}>Observações / Memo</label>
                <div className="relative">
                  <FileText className="absolute left-4 top-3 text-slate-300" size={18} />
                  <textarea rows={2} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className={`${inputClass} pl-12 text-xs font-medium py-3`} placeholder="Detalhes..." />
                </div>
              </div>
            </form>
          </div>

          <div className="p-8 border-t border-slate-100 flex justify-end gap-3 bg-white shrink-0">
            <button type="button" onClick={onClose} className="px-8 py-4 rounded-2xl border border-slate-100 text-slate-500 font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all">Cancelar</button>
            <button type="submit" form="tx-form" className={`px-10 py-4 rounded-2xl text-white font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95 ${getColor()}`}>Confirmar Lançamento</button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default TransactionModal;
