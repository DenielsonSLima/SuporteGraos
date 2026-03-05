import React, { useState } from 'react';
import { Loading, LoadingExtraExpense } from '../../Loadings/types';
import {
  DollarSign, Plus, Minus, History, Wallet, Calculator, PlusCircle, AlertCircle,
  Receipt, Trash2, Calendar, CheckCircle2, X, MapPin
} from 'lucide-react';
import FreightPaymentModal from './modals/FreightPaymentModal';
import ExpenseModal from './modals/ExpenseModal';
import { useToast } from '../../../contexts/ToastContext';
import { useLoadingFinancialTab } from '../hooks/useLoadingFinancialTab';

interface Props {
  loading: Loading;
  onUpdate: (updated: Loading) => void;
  onAddPayment: () => void;
}

const LoadingFinancialTab: React.FC<Props> = ({ loading, onUpdate }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);
  const { addToast } = useToast();
  const {
    totals,
    isExpenseModalOpen,
    setIsExpenseModalOpen,
    isPayModalOpen,
    setIsPayModalOpen,
    isProcessing,
    editPayment,
    setEditPayment,
    handleConfirmPayment,
    handleAddExpense,
    handleEditPayment,
    handleUpdatePayment,
    handleDeletePayment,
  } = useLoadingFinancialTab({ loading, onUpdate, addToast });

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
          <p className="text-sm font-bold text-slate-700">+{currency(totals.totalAdditions)} | -{currency(totals.totalDeductions)}</p>
        </div>
        <div className="bg-slate-900 p-5 rounded-2xl text-white">
          <span className="text-[10px] font-black text-slate-400 uppercase">Líquido a Pagar</span>
          <p className="text-2xl font-black text-emerald-400">{currency(totals.netFreightTotal)}</p>
        </div>
        <div className={`p-5 rounded-2xl border-2 ${totals.balance > 0.05 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <span className={labelClass}>Saldo Pendente</span>
          <p className="text-2xl font-black">{currency(totals.balance)}</p>
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
                      <button title="Editar" onClick={() => handleEditPayment(t)} className="text-blue-500 hover:text-blue-700"><svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536M4 20h4.586a1 1 0 0 0 .707-.293l9.414-9.414a2 2 0 0 0 0-2.828l-3.172-3.172a2 2 0 0 0-2.828 0l-9.414 9.414A1 1 0 0 0 4 20z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
                      <button title="Excluir" onClick={() => handleDeletePayment(t)} className="text-rose-500 hover:text-rose-700"><svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
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
            void handleUpdatePayment(data);
          } else {
            void handleConfirmPayment(data);
          }
        }}
        totalPending={totals.balance}
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