
import React, { useState } from 'react';
import { DollarSign, CreditCard, Plus, Calendar, CheckCircle2, Trash2, Landmark, Info, Pencil, Wallet } from 'lucide-react';
import { OrderTransaction } from '../../types';
import { formatCurrency } from '../../../../utils/formatters';
import { formatDateBR } from '../../../../utils/dateUtils';
import TransactionManagementModal from '../../../Financial/components/modals/TransactionManagementModal';
import { purchaseService } from '../../../../services/purchaseService';
import { useAccounts } from '../../../../hooks/useAccounts';

interface Props {
  orderId: string;
  transactions: OrderTransaction[];
  paidValue: number;    // Valor pago (Backend-driven)
  balanceValue: number; // Saldo pendente (Backend-driven)
  deliveredValue: number; // NOVO: Valor entregue/faturado
  contractValue: number;  // NOVO: Valor total do contrato
  onAddPayment: () => void;
  onAddAdvance: () => void;
  onRefresh: () => void;
  onDeleteTx: (id: string) => void;
}

const OrderFinancialCard: React.FC<Props> = ({ 
  orderId, 
  transactions, 
  paidValue, 
  balanceValue, 
  deliveredValue,
  contractValue,
  onAddPayment, 
  onAddAdvance, 
  onRefresh, 
  onDeleteTx 
}) => {
  const [selectedTx, setSelectedTx] = useState<OrderTransaction | null>(null);
  const { data: accounts = [] } = useAccounts();

  const financialTransactions = transactions.filter(t => t.type === 'payment' || t.type === 'advance' || t.type === 'receipt');

  // Lógica de Progresso unificada com o Pedido de Venda
  // Preferencialmente contra o que foi entregue (Liquidação Operacional)
  // Fallback para o valor do contrato caso nada tenha sido entregue ainda
  const progressPercent = deliveredValue > 0 
    ? Math.min((paidValue / deliveredValue) * 100, 100)
    : (contractValue > 0 ? Math.min((paidValue / contractValue) * 100, 100) : 0);

  const displayTotalValue = deliveredValue > 0 ? deliveredValue : contractValue;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-fit flex flex-col">
      {/* Header Premium (Padrão Unificado) */}
      <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-3 text-blue-800">
          <div className="bg-blue-600 p-1.5 rounded-xl text-white shadow-lg shadow-blue-200">
            <DollarSign size={18} />
          </div>
          <div>
            <h3 className="font-black uppercase text-[11px] tracking-tighter">Pagamentos Produtor</h3>
            <p className="text-[8px] font-bold text-blue-600/70 uppercase tracking-widest">Fluxo de Caixa / Liquidação</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={onAddAdvance}
            className="text-[9px] bg-white text-amber-600 border border-amber-100 hover:bg-amber-50 px-4 py-2 rounded-xl font-black uppercase transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <CreditCard size={14} /> + Novo Adiantamento
          </button>
          <button
            onClick={onAddPayment}
            className="text-[9px] bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-xl font-black uppercase transition-all flex items-center gap-1.5 shadow-xl shadow-blue-100 active:scale-95"
          >
            <Plus size={14} /> Lançar Pagamento
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Sumário Financeiro (Novo Padrão com Progresso) */}
        <div className="mb-8 bg-slate-50/50 p-5 rounded-3xl border border-slate-100">
          <div className="flex justify-between items-end mb-3">
            <div>
              <span className="text-slate-400 block text-[9px] font-black uppercase tracking-widest mb-0.5 ml-1">Progresso da Liquidação</span>
              <span className="font-black text-blue-600 text-xl tracking-tighter leading-none">{progressPercent.toFixed(1)}%</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[9px] font-black uppercase tracking-widest mb-0.5 mr-1">Saldo Pendente</span>
              <span className="font-black text-slate-800 text-lg tracking-tighter leading-none">{formatCurrency(balanceValue)}</span>
            </div>
          </div>
          
          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out shadow-lg" 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          
          <div className="mt-3 flex items-center gap-2 px-1">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Base Cálculo: <span className="text-slate-700">{formatCurrency(displayTotalValue)}</span>
              <span className="mx-2 text-slate-200">|</span>
              Total Pago: <span className="text-emerald-600">{formatCurrency(paidValue)}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-5 px-1">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Histórico de Saídas</h4>
          <div className="h-px flex-1 bg-slate-100"></div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {financialTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/30">
              <Info className="text-slate-200 mb-3" size={40} />
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest text-center leading-relaxed">
                Nenhum lançamento registrado<br/>para este contrato ainda.
              </p>
            </div>
          ) : (
            financialTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => {
              const txSettledValue = (t.value || 0) + (t.discountValue || 0);
              const isAdvance = t.type === 'advance';
              const isPureAdjustment = (t.value === 0 && (t.discountValue || 0) > 0);

              const account = accounts.find(a => a.id === t.accountId);
              const accountLabel = account
                ? `${account.account_name}${account.owner ? ` - ${account.owner}` : ''}`
                : t.accountName || 'Caixa';

              return (
                <div key={t.id} className={`group relative flex flex-col p-4 rounded-3xl border transition-all duration-300 ${isAdvance ? 'bg-amber-50/30 border-amber-100' : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/30'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm border group-hover:rotate-12 transition-transform ${isAdvance ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                        {isAdvance ? <Wallet size={20} /> : <CheckCircle2 size={20} />}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-[11px] uppercase tracking-tighter leading-tight">
                          {isPureAdjustment ? 'Abatimento / Quebra' : (isAdvance ? 'Adiantamento' : 'Pagamento')}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <Calendar size={10} className={isAdvance ? 'text-amber-500' : 'text-blue-500'} /> {formatDateBR(t.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`font-black text-lg tracking-tighter ${isAdvance ? 'text-amber-700' : 'text-slate-900'}`}>
                        {formatCurrency(txSettledValue)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-50">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-xl max-w-[60%]">
                      <Landmark size={12} className="text-slate-400 shrink-0" />
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter truncate leading-none">
                        {accountLabel}
                      </span>
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setSelectedTx(t)}
                        className="p-2 bg-slate-50 text-slate-400 border border-slate-100 rounded-xl hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all active:scale-90 shadow-sm"
                        title="Editar Lançamento"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => onDeleteTx(t.id)}
                        className="p-2 bg-red-100/50 text-red-500 border border-red-100 rounded-xl hover:bg-red-600 hover:text-white transition-all active:scale-90 shadow-sm"
                        title="Excluir Lançamento"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {t.notes && !t.notes.includes('frente') && !t.notes.includes('quitação') && (
                    <div className="mt-3 bg-white/50 p-2.5 rounded-2xl border border-slate-100">
                      <p className="text-[9px] text-slate-500 leading-normal">
                        <span className="font-black uppercase text-[7px] opacity-50 block mb-0.5 tracking-widest text-slate-400">Observação:</span>
                        {t.notes}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedTx && (
        <TransactionManagementModal
          isOpen={!!selectedTx}
          onClose={() => setSelectedTx(null)}
          transaction={selectedTx}
          onUpdate={(tx) => {
            purchaseService.updateTransaction(orderId, tx);
            onRefresh();
            setSelectedTx(null);
          }}
          onDelete={(id) => {
            onDeleteTx(id);
            setSelectedTx(null);
          }}
        />
      )}
    </div>
  );
};

export default OrderFinancialCard;
