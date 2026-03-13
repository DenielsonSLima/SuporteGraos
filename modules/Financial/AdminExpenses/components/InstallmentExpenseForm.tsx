
import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Calendar, DollarSign, FileText, Tag, User, Layers, Calculator, Clock, Wallet, CheckCircle2, Anchor, TrendingUp, Briefcase, ChevronDown } from 'lucide-react';
import ModalPortal from '../../../../components/ui/ModalPortal';
import type { ExpenseCategory } from '../../../../services/expenseCategoryService';
import type { Account } from '../../../../services/accountsService';
import { useAccounts } from '../../../../hooks/useAccounts';
import { useExpenseCategories } from '../../../../hooks/useExpenseCategories';
import { FinancialRecord } from '../../types';
import { useToast } from '../../../../contexts/ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (records: any[]) => void;
  onUpdate?: (record: FinancialRecord) => void;
  initialData?: FinancialRecord | null;
}

const InstallmentExpenseForm: React.FC<Props> = ({ isOpen, onClose, onSave, onUpdate, initialData }) => {
  const { addToast } = useToast();
  const isEditing = !!initialData;
  const formContainerRef = React.useRef<HTMLDivElement | null>(null);
  const { data: categories = [] } = useExpenseCategories();
  const { data: allBankAccounts = [] } = useAccounts();
  const bankAccounts = React.useMemo(() => allBankAccounts.filter(a => a.is_active !== false).sort((a, b) => a.account_name.localeCompare(b.account_name)), [allBankAccounts]);
  
  // Form State
  const [mode, setMode] = useState<'single' | 'installment'>('single');
  const [isPaidNow, setIsPaidNow] = useState(false);
  const [accountId, setAccountId] = useState('');

  // Estados de Seleção em Cascata
  const [selectedType, setSelectedType] = useState<'fixed' | 'variable' | 'administrative' | 'custom' | null>(null);
  
  const [description, setDescription] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [firstDueDate, setFirstDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalValue, setTotalValue] = useState('');
  const [installments, setInstallments] = useState(2);
  const [notes, setNotes] = useState('');

  const formatBRL = (val: number) => {
    const normalized = Math.abs(val) < 0.01 ? 0 : val;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(normalized);
  };

  useEffect(() => {
    if (isOpen) {
      if (formContainerRef.current) {
        formContainerRef.current.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      }
      
      // Reset form
      setDescription('');
      setCategoryName('');
      setSelectedType(null);
      setIssueDate(new Date().toISOString().split('T')[0]);
      setFirstDueDate(new Date().toISOString().split('T')[0]);
      setTotalValue('');
      setInstallments(2);
      setNotes('');
      setMode('single');
      setIsPaidNow(false);
      setAccountId('');

      // Edição: preencher dados
      if (initialData) {
        const categoryGroup = categories
          .find(c => c.subtypes.some(s => s.name === initialData.category));
        setSelectedType((categoryGroup?.type as any) || null);
        setCategoryName(initialData.category || '');
        setDescription(initialData.description || '');
        setIssueDate(initialData.issueDate || new Date().toISOString().split('T')[0]);
        setFirstDueDate(initialData.dueDate || new Date().toISOString().split('T')[0]);
        setTotalValue(String(initialData.originalValue || 0));
        setNotes(initialData.notes || '');
        setMode('single');
        setIsPaidNow(initialData.status === 'paid');

        const accounts = bankAccounts.filter(acc => acc.is_active !== false);
        const matched = accounts.find(a => a.id === initialData.bankAccount || a.account_name === initialData.bankAccount);
        setAccountId(matched?.id || '');
      }
    }
  }, [isOpen, initialData]);

  // Filtra as subcategorias com base no tipo selecionado
  const filteredSubtypes = useMemo(() => {
    if (!selectedType) return [];
    const categoryGroup = categories.find(c => c.type === selectedType);
    return categoryGroup ? [...categoryGroup.subtypes].sort((a, b) => a.name.localeCompare(b.name)) : [];
  }, [selectedType, categories]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(totalValue);
    if (!value || value <= 0) {
      addToast('warning', 'Valor inválido');
      return;
    }
    if (!description || !categoryName) {
      addToast('warning', 'Preencha todos os campos obrigatórios');
      return;
    }
    if (isPaidNow && !accountId) {
      addToast('warning', 'Selecione a conta bancária para realizar a baixa');
      return;
    }

    const recordsToCreate = [];
    const selectedAccount = bankAccounts.find(a => a.id === accountId);

    if (initialData && onUpdate) {
      const updatedRecord: FinancialRecord = {
        ...initialData,
        description,
        category: categoryName,
        dueDate: firstDueDate,
        issueDate: issueDate,
        originalValue: value,
        paidValue: isPaidNow ? value : (initialData.paidValue || 0),
        status: isPaidNow ? 'paid' : 'pending',
        subType: 'admin',
        bankAccount: isPaidNow ? (accountId || initialData.bankAccount) : undefined,
        notes
      };

      onUpdate(updatedRecord);
      addToast('success', 'Despesa atualizada com sucesso');
      onClose();
      return;
    }

    if (mode === 'single') {
      recordsToCreate.push({
        id: crypto.randomUUID(),
        description,
        entityName: 'DESPESA DIRETA', 
        category: categoryName,
        dueDate: firstDueDate,
        issueDate: issueDate,
        originalValue: value,
        paidValue: isPaidNow ? value : 0,
        status: isPaidNow ? 'paid' : 'pending',
        subType: 'admin',
        bankAccount: isPaidNow ? accountId : undefined,
        notes: isPaidNow ? `[BAIXA IMEDIATA] ${notes}` : notes
      });
    } else {
      const installmentValue = value / installments;
      const baseDate = new Date(firstDueDate);

      for (let i = 0; i < installments; i++) {
        const nextDueDate = new Date(baseDate);
        nextDueDate.setMonth(baseDate.getMonth() + i);
        
        recordsToCreate.push({
          id: crypto.randomUUID(),
          description: `${description} (${i + 1}/${installments})`,
          entityName: 'DESPESA PARCELADA',
          category: categoryName,
          dueDate: nextDueDate.toISOString().split('T')[0],
          issueDate: issueDate,
          originalValue: parseFloat(installmentValue.toFixed(2)),
          paidValue: 0,
          status: 'pending',
          subType: 'admin',
          notes: `${notes} - Parcela ${i + 1} de ${installments}`
        });
      }
    }

    onSave(recordsToCreate);
    addToast('success', mode === 'installment' ? `Parcelamento criado com ${installments} parcelas` : 'Despesa lançada com sucesso');
    onClose();
  };

  const inputClass = 'block w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-slate-800 focus:outline-none transition-all placeholder:text-slate-300 font-bold shadow-sm';
  const labelClass = 'block mb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1';

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[95vh]">
        
        <div className="bg-slate-950 px-8 py-6 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-slate-800 rounded-2xl text-blue-400 border border-slate-700 shadow-inner">
                <FileText size={24} />
             </div>
             <div>
                <h3 className="font-black text-lg uppercase tracking-tighter italic leading-none">Novo Lançamento de Despesa</h3>
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-1.5">Saída de Estrutura ou Administrativa</p>
             </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition-colors">
            <X size={28} />
          </button>
        </div>

        <div ref={formContainerRef} className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
          <form id="expense-form" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="flex bg-slate-200 p-1 rounded-2xl shadow-inner">
              <button
                type="button"
                onClick={() => !isEditing && setMode('single')}
                disabled={isEditing}
                className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${mode === 'single' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <FileText size={16} /> Único
              </button>
              <button
                type="button"
                onClick={() => !isEditing && setMode('installment')}
                disabled={isEditing}
                className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${mode === 'installment' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Layers size={16} /> Parcelado
              </button>
            </div>

            <div className="space-y-3">
              <label className={labelClass}>1. Natureza da Despesa</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'fixed', label: 'Fixa', icon: Anchor, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { id: 'variable', label: 'Variável', icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
                  { id: 'administrative', label: 'Adm.', icon: Briefcase, color: 'text-slate-600', bg: 'bg-slate-50' }
                ].map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => { setSelectedType(type.id as any); setCategoryName(''); }}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${selectedType === type.id ? `border-slate-800 bg-white shadow-md` : 'border-transparent bg-white/50 hover:bg-white'}`}
                  >
                    <type.icon size={20} className={selectedType === type.id ? 'text-slate-900' : 'text-slate-300'} />
                    <span className={`text-[10px] font-black uppercase tracking-tighter ${selectedType === type.id ? 'text-slate-900' : 'text-slate-400'}`}>{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={`transition-all duration-300 ${!selectedType ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
              <label className={labelClass}>2. Categoria (Plano de Contas)</label>
              <div className="relative">
                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <select 
                  required 
                  className={`${inputClass} pl-12 appearance-none`}
                  value={categoryName}
                  onChange={e => setCategoryName(e.target.value)}
                >
                  <option value="">{selectedType ? 'Selecione o item...' : 'Aguardando Natureza...'}</option>
                  {filteredSubtypes.map(sub => (
                    <option key={sub.id} value={sub.name}>{sub.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
                <div>
                  <label className={labelClass}>Descrição / Identificação do Gasto</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="text" required className={`${inputClass} pl-10`} 
                      placeholder="Ex: Aluguel Unidade I, Conta Luz Jan..."
                      value={description} onChange={e => setDescription(e.target.value)}
                    />
                  </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Data Emissão</label>
                <input type="date" required className={inputClass} value={issueDate} onChange={e => setIssueDate(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>{mode === 'installment' ? '1º Vencimento' : 'Vencimento'}</label>
                <input type="date" required className={inputClass} value={firstDueDate} onChange={e => setFirstDueDate(e.target.value)} />
              </div>
            </div>

            <div className={`p-6 rounded-[2rem] border-2 transition-all ${mode === 'installment' ? 'bg-indigo-50 border-indigo-200 shadow-inner' : 'bg-white border-slate-200'}`}>
              <div className="grid grid-cols-2 gap-4">
                <div className={mode === 'single' ? 'col-span-2' : ''}>
                  <label className={labelClass}>Valor Total (R$)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      required 
                      className={`${inputClass} pl-10 text-lg`} 
                      placeholder="0,00" 
                      value={totalValue ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(totalValue) || 0) : ''} 
                      onChange={e => {
                        const numValue = e.target.value.replace(/\D/g, '');
                        setTotalValue(numValue ? (parseFloat(numValue) / 100).toString() : '');
                      }}
                      onBlur={e => {
                        const val = parseFloat(totalValue) || 0;
                        e.target.value = val ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) : '';
                      }}
                    />
                  </div>
                </div>
                {mode === 'installment' && (
                  <div>
                    <label className={labelClass}>Parcelas</label>
                    <input type="number" min="2" max="60" required className={inputClass} value={installments} onChange={e => setInstallments(parseInt(e.target.value))} />
                  </div>
                )}
              </div>
            </div>

            {mode === 'single' && (
              <div className={`p-5 rounded-3xl border-2 transition-all ${isPaidNow ? 'bg-emerald-50 border-emerald-300 shadow-md' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                 <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input type="checkbox" className="w-6 h-6 rounded-lg border-slate-300 text-emerald-600 focus:ring-0" checked={isPaidNow} onChange={e => setIsPaidNow(e.target.checked)} />
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-800 uppercase leading-none">Já está pago? (Baixa Imediata)</p>
                      <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase">Registra a saída do banco hoje.</p>
                    </div>
                 </label>
                 {isPaidNow && (
                   <div className="mt-4 space-y-2 animate-in slide-in-from-top-2">
                      <label className={labelClass}>Conta de Pagamento (Saldo Real)</label>
                      <select required={isPaidNow} className={inputClass} value={accountId} onChange={e => setAccountId(e.target.value)}>
                          <option value="">Selecione a conta bancária...</option>
                          {bankAccounts.map(acc => (
                            <option key={acc.id} value={acc.id}>
                              {acc.account_name} (Saldo: {formatBRL(acc.balance)})
                            </option>
                          ))}
                      </select>
                   </div>
                 )}
              </div>
            )}
          </form>
        </div>

        <div className="bg-white p-6 border-t border-slate-200 flex justify-end gap-3 shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
          <button type="button" onClick={onClose} className="px-8 py-3.5 border-2 border-slate-200 rounded-2xl text-slate-500 font-black uppercase text-xs tracking-widest hover:bg-slate-50">Cancelar</button>
          <button form="expense-form" type="submit" className="px-10 py-3.5 rounded-2xl text-white font-black shadow-xl flex items-center gap-2 transition-all active:scale-95 bg-slate-950 hover:bg-slate-800 uppercase text-xs tracking-widest">
            <Save size={18} />
            {mode === 'installment' ? 'Gerar Parcelamento' : 'Salvar Despesa'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <ModalPortal>
      {modalContent}
    </ModalPortal>
  );
};

export default InstallmentExpenseForm;
