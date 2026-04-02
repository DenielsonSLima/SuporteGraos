
import React, { useState } from 'react';
import { DollarSign, CreditCard, Plus, ArrowUpRight, Calendar, Wallet, Pencil, Trash2, Landmark, MinusCircle } from 'lucide-react';
import { OrderTransaction } from '../../types';
import { formatDateBR } from '../../../../utils/dateUtils';
import TransactionManagementModal from '../../../Financial/components/modals/TransactionManagementModal';
import { purchaseService } from '../../../../services/purchaseService';
import { useAccounts } from '../../../../hooks/useAccounts';

interface Props {
  orderId: string;
  transactions: OrderTransaction[];
  paidValue: number;    // Valor pago (Backend-driven)
  balanceValue: number; // Saldo pendente (Backend-driven)
  onAddPayment: () => void;
  onAddAdvance: () => void;
  onRefresh: () => void;
  onDeleteTx: (id: string) => void;
}

const OrderFinancialCard: React.FC<Props> = ({ orderId, transactions, paidValue, balanceValue, onAddPayment, onAddAdvance, onRefresh, onDeleteTx }) => {
  const [selectedTx, setSelectedTx] = useState<OrderTransaction | null>(null);
  const { data: accounts = [] } = useAccounts();

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);
  const date = (val: string) => formatDateBR(val);

  const financialTransactions = transactions.filter(t => t.type === 'payment' || t.type === 'advance' || t.type === 'receipt');

  // Cálculo da barra de progresso (vindo do backend através de totalValue = paidValue + balanceValue)
  const totalContractValue = paidValue + balanceValue;
  const progress = totalContractValue > 0 ? Math.min((paidValue / totalContractValue) * 100, 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header Premium */}
      <div className="px-5 py-4 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-xl shadow-sm text-blue-600">
            <DollarSign size={18} />
          </div>
          <div>
            <h3 className="font-black uppercase text-[10px] tracking-widest text-blue-900 leading-none mb-1">
              Pagamentos Produtor (Fluxo de Caixa)
            </h3>
            <p className="text-[9px] font-medium text-blue-600/70 uppercase tracking-tight">
              Liquidação de grãos e adiantamentos
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onAddAdvance}
            className="p-2 bg-white text-amber-600 rounded-xl shadow-sm hover:shadow-md hover:scale-105 transition-all border border-amber-50"
            title="Novo Adiantamento"
          >
            <CreditCard size={18} />
          </button>
          <button
            onClick={onAddPayment}
            className="p-2 bg-white text-blue-600 rounded-xl shadow-sm hover:shadow-md hover:scale-105 transition-all border border-blue-50"
            title="Novo Pagamento"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Mini Dashboard de KPIs */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/30">
        <div className="px-5 py-3">
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-0.5">Total Contrato</p>
          <p className="text-sm font-bold text-slate-700">{currency(totalContractValue)}</p>
        </div>
        <div className="px-5 py-3">
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-0.5">Pago</p>
          <p className="text-sm font-bold text-emerald-600">{currency(paidValue)}</p>
        </div>
        <div className="px-5 py-3">
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-0.5">Saldo Pendente</p>
          <p className="text-sm font-bold text-blue-600">{currency(balanceValue)}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {financialTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
            <div className="p-3 bg-white rounded-full shadow-sm mb-3">
              <DollarSign size={24} className="opacity-20" />
            </div>
            <p className="text-xs font-medium uppercase tracking-widest opacity-60">Nenhum lançamento</p>
          </div>
        ) : (
          financialTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => {
            const txSettledValue = (t.value || 0) + (t.discountValue || 0);
            const isPureAdjustment = (t.value === 0 && (t.discountValue || 0) > 0);
            const isAdvance = t.type === 'advance';

            const account = accounts.find(a => a.id === t.accountId);
            const accountLabel = account
              ? `${account.account_name}${account.owner ? ` - ${account.owner}` : ''}`
              : t.accountName || 'Caixa';

            return (
              <div
                key={t.id}
                className={`group relative flex flex-col p-3 rounded-xl border transition-all shadow-sm ${isAdvance ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100 hover:bg-white'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${isAdvance ? 'bg-amber-500 animate-pulse' : 'bg-blue-500'}`} />
                    <span className="text-[10px] font-bold text-slate-900 uppercase tracking-tight">
                      {isPureAdjustment ? 'Abatimento / Quebra' : (isAdvance ? 'Adiantamento' : 'Pagamento')}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">{date(t.date)}</span>
                </div>

                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[11px] text-slate-600 font-medium line-clamp-1">{t.notes || 'Sem descrição'}</p>
                    <p className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">
                      {accountLabel}
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`text-sm font-black ${isAdvance ? 'text-amber-700' : 'text-slate-900'}`}>
                      {currency(txSettledValue)}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setSelectedTx(t)}
                        className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => onDeleteTx(t.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
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
