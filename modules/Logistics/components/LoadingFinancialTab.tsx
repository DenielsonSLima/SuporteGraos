import React, { useState } from 'react';
import { Loading, LoadingExtraExpense } from '../../Loadings/types';
import { 
  DollarSign, Plus, Minus, History, Wallet, Calculator, PlusCircle, AlertCircle,
  Receipt, Trash2, Calendar, CheckCircle2, X, MapPin
} from 'lucide-react';
import FreightPaymentModal from './modals/FreightPaymentModal';
import ExpenseModal from './modals/ExpenseModal';
import { financialActionService } from '../../../services/financialActionService';
import { useToast } from '../../../contexts/ToastContext';
import { loadingService } from '../../../services/loadingService';
import { invalidateLoadingCache } from '../../../services/loadingCache';

interface Props {
  loading: Loading;
  onUpdate: (updated: Loading) => void;
  onAddPayment: () => void;
}

const LoadingFinancialTab: React.FC<Props> = ({ loading, onUpdate }) => {
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editPayment, setEditPayment] = useState<any>(null);

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const totalAdditions = loading.extraExpenses?.filter(e => e.type === 'addition').reduce((acc, e) => acc + e.value, 0) || 0;
  const totalDeductions = loading.extraExpenses?.filter(e => e.type === 'deduction').reduce((acc, e) => acc + e.value, 0) || 0;
  const totalPaid = loading.freightPaid || 0;
  const totalDisc = loading.transactions?.reduce((acc, t) => acc + (t.discountValue || 0), 0) || 0;
  
  const netFreightTotal = loading.totalFreightValue + totalAdditions - totalDeductions;
  const balance = Math.max(0, netFreightTotal - totalPaid - totalDisc);
  const { addToast } = useToast();

  const handleConfirmPayment = async (data: any) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const tx = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'payment',
        date: data.date,
        value: parseFloat(data.amount) || 0,
        discountValue: parseFloat(data.discount) || 0,
        accountId: data.accountId,
        accountName: data.accountName,
        notes: data.notes
      };
      financialActionService.processRecord(`fr-${loading.id}`, data, 'freight');
      const updatedPaid = (loading.freightPaid || 0) + tx.value;
      const totalAdditions = loading.extraExpenses?.filter(e => e.type === 'addition').reduce((acc, e) => acc + e.value, 0) || 0;
      const totalDeductions = loading.extraExpenses?.filter(e => e.type === 'deduction').reduce((acc, e) => acc + e.value, 0) || 0;
      const netFreightTotal = loading.totalFreightValue + totalAdditions - totalDeductions;
      const totalDisc = loading.transactions?.reduce((acc, t) => acc + (t.discountValue || 0), 0) || 0;
      const newBalance = Math.max(0, netFreightTotal - updatedPaid - totalDisc);
      let newStatus = loading.status;
      if (newBalance < 0.05) {
        newStatus = 'completed';
      }
      const loadingAtualizado = { ...loading, freightPaid: updatedPaid, status: newStatus, transactions: [tx, ...(loading.transactions || [])] };
      
      // 1. Salva no serviço
      loadingService.update(loadingAtualizado);
      
      // 2. Invalida cache para forçar reload nos outros componentes
      invalidateLoadingCache();
      
      // 3. Dispara evento global de atualização
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('data:updated', { detail: { type: 'freight_payment', loadingId: loading.id } }));
      }
      
      // 4. Atualiza componente pai imediatamente
      onUpdate(loadingAtualizado);
      
      // 5. Fecha modal e exibe feedback
      setIsPayModalOpen(false);
      addToast('success', 'Pagamento registrado! Atualizando...');
      
      // 6. Força reload para garantir sincronização total (após pequeno delay para UX)
      setTimeout(() => {
        window.location.reload();
      }, 400);
    } catch (err) {
      console.error('Erro ao processar pagamento:', err);
      addToast('error', 'Erro ao processar pagamento');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddExpense = (expenseData: any) => {
    const expense: LoadingExtraExpense = {
      id: Math.random().toString(36).substr(2, 9),
      description: expenseData.description,
      value: expenseData.value,
      type: expenseData.type, // Usar o tipo selecionado no modal
      date: expenseData.date
    };

    // 1. Atualiza carregamento local
    onUpdate({
      ...loading,
      extraExpenses: [...(loading.extraExpenses || []), expense]
    });
    
    // 2. Registra no histórico financeiro geral
    financialActionService.processRecord(
      `expense-${loading.id}-${expense.id}`,
      {
        amount: expenseData.value,
        discount: expenseData.discount || 0,
        date: expenseData.date,
        accountId: expenseData.accountId,
        accountName: expenseData.accountName,
        notes: `${expenseData.description} - ${expenseData.type === 'deduction' ? 'Desconto' : 'Adicional'} Frete ${loading.vehiclePlate}${expenseData.notes ? ' | ' + expenseData.notes : ''}`
      },
      'freight'
    );
    
    // 3. Dispara evento global
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('data:updated', { detail: { type: 'expense_added', loadingId: loading.id } }));
    }
    
    setIsExpenseModalOpen(false);
    addToast('success', 'Despesa registrada! Atualizando...');
    setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  const handleEditPayment = (tx: any) => {
    setEditPayment(tx);
    setIsPayModalOpen(true);
  };

  const handleDeletePayment = (tx: any) => {
    const updatedTransactions = loading.transactions?.filter(t => t.id !== tx.id) || [];
    const updatedPaid = (loading.freightPaid || 0) - (tx.value || 0);
    
    // Remove do standaloneDb financeiro
    if (tx.id && financialActionService && typeof financialActionService.syncDeleteFromOrigin === 'function') {
      financialActionService.syncDeleteFromOrigin(tx.id);
    }
    
    const loadingAtualizado = { ...loading, transactions: updatedTransactions, freightPaid: updatedPaid };
    loadingService.update(loadingAtualizado);
    invalidateLoadingCache();
    
    // Dispara evento global
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('data:updated', { detail: { type: 'freight_payment', loadingId: loading.id } }));
    }
    
    onUpdate(loadingAtualizado);
    addToast('success', 'Pagamento excluído com sucesso!');
  };

  const inputClass = 'w-full border-2 border-slate-200 rounded-lg bg-white text-slate-950 font-bold px-3 py-2 focus:border-blue-500 outline-none text-sm';
  const labelClass = 'block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest';

  return (
    <div className="space-y-6 animate-in fade-in">
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className={labelClass}>Valor Bruto Frete</span>
          <p className="text-xl font-black text-slate-900">{currency(loading.totalFreightValue)}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className={labelClass}>Extras / Descontos</span>
          <p className="text-sm font-bold text-slate-700">+{currency(totalAdditions)} | -{currency(totalDeductions)}</p>
        </div>
        <div className="bg-slate-900 p-5 rounded-2xl text-white">
          <span className="text-[10px] font-black text-slate-400 uppercase">Líquido a Pagar</span>
          <p className="text-2xl font-black text-emerald-400">{currency(netFreightTotal)}</p>
        </div>
        <div className={`p-5 rounded-2xl border-2 ${balance > 0.05 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <span className={labelClass}>Saldo Pendente</span>
          <p className="text-2xl font-black">{currency(balance)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-black text-xs uppercase flex items-center gap-2"><Receipt size={18} className="text-blue-500" /> Despesas do Motorista</h3>
            <button onClick={() => setIsExpenseModalOpen(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase">Lançar Item</button>
          </div>
          <div className="p-6">
             <div className="space-y-2">
                {loading.extraExpenses && loading.extraExpenses.length > 0 ? (
                  loading.extraExpenses.map(e => (
                    <div key={e.id} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg">
                        <span className="font-bold">{e.description}</span>
                        <span className={e.type === 'deduction' ? 'text-rose-600' : 'text-emerald-600'}>{e.type === 'deduction' ? '-' : '+'}{currency(e.value)}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400 text-xs italic text-center py-4">Nenhuma despesa lançada.</div>
                )}
             </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-black text-xs uppercase flex items-center gap-2"><History size={18} className="text-emerald-500" /> Pagamentos Efetuados</h3>
            <button onClick={() => setIsPayModalOpen(true)} className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase">Baixar Frete</button>
          </div>
          <div className="p-6">
             <div className="space-y-2">
                {loading.transactions && loading.transactions.length > 0 ? (
                  loading.transactions.map(t => (
                    <div key={t.id} className="flex justify-between items-center text-xs p-2 border-b gap-2">
                        <span>{new Date(t.date).toLocaleDateString()} - {t.accountName}</span>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="font-black text-emerald-700">{currency(t.value)}</p>
                            {t.discountValue! > 0 && <p className="text-[8px] text-amber-600">Abatimento: {currency(t.discountValue!)}</p>}
                          </div>
                          <button title="Editar" onClick={() => handleEditPayment(t)} className="text-blue-500 hover:text-blue-700"><svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536M4 20h4.586a1 1 0 0 0 .707-.293l9.414-9.414a2 2 0 0 0 0-2.828l-3.172-3.172a2 2 0 0 0-2.828 0l-9.414 9.414A1 1 0 0 0 4 20z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                          <button title="Excluir" onClick={() => handleDeletePayment(t)} className="text-rose-500 hover:text-rose-700"><svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                        </div>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400 text-xs italic text-center py-4">Nenhum pagamento efetuado ainda.</div>
                )}
             </div>
          </div>
        </div>
      </div>

      <FreightPaymentModal 
        isOpen={isPayModalOpen} 
        onClose={() => { setIsPayModalOpen(false); setEditPayment(null); }} 
        onConfirm={data => {
          if (editPayment) {
            handleDeletePayment(editPayment);
            setTimeout(() => handleConfirmPayment(data), 100);
            setEditPayment(null);
          } else {
            handleConfirmPayment(data);
          }
        }} 
        totalPending={balance}
        recordDescription={`Frete Placa ${loading.vehiclePlate}`}
        initialData={editPayment}
        isProcessing={isProcessing}
      />
      
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onConfirm={handleAddExpense}
        vehiclePlate={loading.vehiclePlate}
      />
    </div>
  );
};

export default LoadingFinancialTab;