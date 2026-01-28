
import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, DollarSign, Wallet, FileText, Tags, CheckSquare, Square, ArrowDown, MinusCircle, AlertTriangle } from 'lucide-react';
import { TransactionType } from '../../types';
import { financialService, ExpenseCategory } from '../../../../services/financialService';
import { BankAccount } from '../../../../Financial/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { date: string; value: number; discountValue: number; accountId: string; accountName: string; notes: string; deductFromPartner?: boolean; expenseSubtypeId?: string }) => void;
  type: TransactionType;
  title: string;
}

const TransactionModal: React.FC<Props> = ({ isOpen, onClose, onSave, type, title }) => {
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
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
        date: new Date().toISOString().split('T')[0],
        amount: '',
        discount: '',
        accountId: '',
        notes: '',
        expenseSubtypeId: '',
        deductFromPartner: false
      });
      // CRITICAL: Filter only ACTIVE accounts AND SORT ALPHABETICALLY
      const sorted = financialService.getBankAccounts()
        .filter(acc => acc.active !== false)
        .sort((a, b) => a.bankName.localeCompare(b.bankName));
      setBankAccounts(sorted);
      
      if (type === 'expense') {
        const variableExpenses = financialService.getExpenseCategories().filter(cat => cat.type === 'variable');
        setExpenseCategories(variableExpenses);
      }
    }
  }, [isOpen, type]);

  if (!isOpen) return null;

  const valAmount = parseFloat(formData.amount) || 0;
  const valDiscount = parseFloat(formData.discount) || 0;
  const totalOperation = valAmount + valDiscount;
  const isCashMovement = valAmount > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (totalOperation <= 0) {
        // Se for despesa, só precisa de valor se não for tracking. Mas aqui assumimos financeiro.
        // Alert handled by HTML5 required usually, but custom check:
        return; 
    }

    if (isCashMovement && !formData.accountId) return; // Conta required if cash involved

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
    const finalAccountName = isCashMovement ? (account?.bankName || 'Caixa Central') : 'ABATIMENTO/ACORDO';
    
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 border border-slate-100 max-h-[90vh] flex flex-col">
        <div className={`${getColor()} px-6 py-5 flex justify-between items-center text-white shrink-0`}>
          <h3 className="font-black uppercase tracking-tighter italic text-lg">{title}</h3>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors"><X size={20} /></button>
        </div>
        
        <div className="overflow-y-auto p-8 flex-1">
          <form id="tx-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Data</label>
                  <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                      <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className={`${inputClass} pl-10`} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Valor em Dinheiro</label>
                  <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                      <input 
                        type="number" step="0.01" 
                        value={formData.amount} 
                        onChange={e => setFormData({...formData, amount: e.target.value})} 
                        className={`${inputClass} pl-8 text-lg`} 
                        placeholder="0,00" 
                      />
                  </div>
                </div>
            </div>

            {/* SEÇÃO DE DESCONTO (APENAS SE NÃO FOR DESPESA GENÉRICA, OU SE FOR COMISSÃO) */}
            {(type === 'commission' || type === 'payment' || type === 'receipt') && (
               <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                  <div className="flex items-center justify-between mb-2">
                     <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-1">
                        <MinusCircle size={12} /> Desconto / Abatimento?
                     </label>
                  </div>
                  <div className="relative">
                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 font-bold">R$</span>
                     <input 
                        type="number" step="0.01"
                        value={formData.discount}
                        onChange={e => setFormData({...formData, discount: e.target.value})}
                        className="w-full border-2 border-amber-200 rounded-lg bg-white px-4 py-2 pl-9 text-amber-800 font-bold focus:border-amber-500 outline-none text-sm"
                        placeholder="0,00 (Opcional)"
                     />
                  </div>
                  <p className="text-[9px] text-amber-600 mt-1 font-medium leading-tight">Valor que será deduzido do saldo sem saída de caixa.</p>
               </div>
            )}

            {/* SELETOR DE CONTA - SÓ SE TIVER DINHEIRO */}
            {isCashMovement ? (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className={labelClass}>Conta de Pagamento (Obrigatório)</label>
                  <div className="relative">
                      <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <select required value={formData.accountId} onChange={e => setFormData({...formData, accountId: e.target.value})} className={`${inputClass} pl-10 appearance-none pr-10`}>
                          <option value="">Selecione o Banco...</option>
                          {bankAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.bankName} - {acc.owner}</option>)}
                      </select>
                      <ArrowDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
                  </div>
                </div>
            ) : (
                 (valDiscount > 0) && (
                    <div className="p-3 bg-slate-100 rounded-xl text-center text-xs text-slate-500 font-medium border border-slate-200 italic animate-in fade-in">
                        Nenhuma movimentação bancária necessária para abatimentos puros.
                    </div>
                 )
            )}

            {/* CAMPOS ESPECÍFICOS DE DESPESA */}
            {type === 'expense' && (
              <div className="animate-in slide-in-from-top-2">
                  <label className={labelClass}>Tipo de Despesa</label>
                  <select 
                      required 
                      value={formData.expenseSubtypeId} 
                      onChange={e => setFormData({...formData, expenseSubtypeId: e.target.value})} 
                      className={`${inputClass} appearance-none pr-10 mb-4`}
                  >
                      <option value="">Selecione...</option>
                      {expenseCategories.map(cat => (
                          <optgroup key={cat.id} label={cat.name}>
                              {cat.subtypes.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                          </optgroup>
                      ))}
                  </select>
              </div>
            )}

            {(type === 'expense' || type === 'commission') && (
                <div className={`p-4 rounded-xl border ${type === 'commission' ? 'bg-violet-50 border-violet-200' : 'bg-amber-50 border-amber-200'}`}>
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                        <button type="button" onClick={() => setFormData({...formData, deductFromPartner: !formData.deductFromPartner})} className={`p-1 rounded-lg transition-colors ${formData.deductFromPartner ? (type === 'commission' ? 'text-violet-600' : 'text-amber-600') : 'text-slate-300'}`}>
                            {formData.deductFromPartner ? <CheckSquare size={24} /> : <Square size={24} />}
                        </button>
                        <div>
                            <p className={`text-xs font-black uppercase ${type === 'commission' ? 'text-violet-900' : 'text-amber-900'}`}>
                                {type === 'commission' ? 'Debitar Comissão do Produtor?' : 'Debitar do Saldo do Produtor?'}
                            </p>
                            <p className={`text-[10px] font-bold leading-tight ${type === 'commission' ? 'text-violet-700' : 'text-amber-700'}`}>
                                {formData.deductFromPartner 
                                  ? "SIM - Desconta do saldo a pagar ao fornecedor."
                                  : "NÃO - A empresa assume este custo."}
                            </p>
                        </div>
                    </label>
                </div>
            )}

            <div>
              <label className={labelClass}>Anotações</label>
              <div className="relative">
                  <FileText className="absolute left-3 top-3 text-slate-300" size={18} />
                  <textarea rows={2} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className={`${inputClass} pl-10 text-[11px] font-bold h-20 resize-none`} placeholder="Detalhes adicionais..." />
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-white shrink-0">
            <button type="button" onClick={onClose} className="px-6 py-3 border-2 border-slate-100 rounded-xl text-slate-400 font-black uppercase text-[10px] hover:bg-slate-50">Cancelar</button>
            <button type="submit" form="tx-form" className={`px-8 py-3 rounded-xl text-white font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all ${getColor()}`}>Confirmar Lançamento</button>
        </div>
      </div>
    </div>
  );
};

export default TransactionModal;
